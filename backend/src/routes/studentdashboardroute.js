// routes/studentDashboard.js
// Gebruik: app.use('/api', require('./routes/studentDashboard'))
//
// Geeft alle data terug die het studentdashboard nodig heeft in één call:
//   GET /api/students/:id/dashboard
//
// Vereist: een geldige JWT in de Authorization-header (Bearer <token>).
// De middleware 'requireAuth' en 'requireSelf' zitten typisch in
// middleware/auth.js — pas de import aan naar jouw project-structuur.

const express = require('express')
const router = express.Router()
const db = require('../db').promise() // promise-API van de mysql2-pool (rest van de app gebruikt callbacks)

// ---------------------------------------------------------------------------
// Helper: huidige ISO-weeknummer (maandag = week 1)
// ---------------------------------------------------------------------------
function huidigWeekNummer() {
  const nu = new Date()
  const startVanJaar = new Date(nu.getFullYear(), 0, 1)
  const dagenVerlopen = Math.floor((nu - startVanJaar) / 86400000)
  return Math.ceil((dagenVerlopen + startVanJaar.getDay() + 1) / 7)
}

// ---------------------------------------------------------------------------
// GET /api/students/:id/dashboard
// ---------------------------------------------------------------------------
router.get('/students/:id/dashboard', async (req, res) => {
  // De frontend stuurt de gebruiker_id uit de JWT (authStore.user.id).
  const gebruikerId = parseInt(req.params.id, 10)

  if (isNaN(gebruikerId)) {
    return res.status(400).json({ error: 'Ongeldig gebruiker-id.' })
  }

  // Een student mag alleen zijn eigen dashboard opvragen; staff-rollen mogen alles.
  if (req.gebruiker?.rol === 'student' && req.gebruiker.id !== gebruikerId) {
    return res.status(403).json({ error: 'Geen toegang tot dit dashboard.' })
  }

  try {
    // ------------------------------------------------------------------
    // 1. Studentprofiel (opgezocht via gebruiker_id)
    // ------------------------------------------------------------------
    const [studentRijen] = await db.execute(
      `SELECT
         g.voornaam,
         g.naam,
         g.email,
         s.studentnummer,
         s.opleiding,
         s.academiejaar,
         s.student_id
       FROM student s
       JOIN gebruiker g ON s.gebruiker_id = g.gebruiker_id
       WHERE s.gebruiker_id = ?`,
      [gebruikerId],
    )

    if (studentRijen.length === 0) {
      return res.status(404).json({ error: 'Student niet gevonden.' })
    }

    const student = studentRijen[0]
    // student_id is de interne sleutel voor stage/logboek/feedback.
    const studentId = student.student_id

    // ------------------------------------------------------------------
    // 2. Actieve of meest recente stage
    // ------------------------------------------------------------------
    const [stageRijen] = await db.execute(
      `SELECT
         st.stage_id,
         st.stagetitel,
         st.startdatum,
         st.einddatum,
         st.status        AS stage_status,
         b.naam           AS bedrijf_naam,
         g_mentor.voornaam AS mentor_voornaam,
         g_mentor.naam     AS mentor_naam
       FROM stage st
       JOIN bedrijf b ON st.bedrijf_id = b.bedrijf_id
       LEFT JOIN mentor m ON st.mentor_id = m.mentor_id
       LEFT JOIN gebruiker g_mentor ON m.gebruiker_id = g_mentor.gebruiker_id
       WHERE st.student_id = ?
       ORDER BY st.ingediend_op DESC
       LIMIT 1`,
      [studentId],
    )

    const stage = stageRijen[0] ?? null

    // ------------------------------------------------------------------
    // 3. Logboekstatus van de huidige week
    //    (alleen relevant als er een actieve stage is)
    // ------------------------------------------------------------------
    let logboekDezeWeek = null

    if (stage) {
      const weekNr = huidigWeekNummer()

      const [logboekRijen] = await db.execute(
        `SELECT
           logboek_id,
           week_nummer,
           status,
           uren,
           ingediend_op
         FROM logboek
         WHERE student_id = ?
           AND stage_id   = ?
           AND week_nummer = ?
         LIMIT 1`,
        [studentId, stage.stage_id, weekNr],
      )

      logboekDezeWeek = logboekRijen[0] ?? null

      // Per-dag-invoer (Ma–Vr) van het logboek van deze week.
      if (logboekDezeWeek) {
        const [dagRijen] = await db.execute(
          `SELECT dag, uren, activiteiten
           FROM logboek_dag
           WHERE logboek_id = ?
           ORDER BY FIELD(dag, 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag')`,
          [logboekDezeWeek.logboek_id],
        )
        logboekDezeWeek.dagen = dagRijen
      }
    }

    // ------------------------------------------------------------------
    // 4. Recente mentorfeedback (max. 3 meest recente opmerkingen)
    // ------------------------------------------------------------------
    let recenteFeedback = []

    if (stage) {
      const [feedbackRijen] = await db.execute(
        `SELECT
           lf.opmerking,
           lf.created_at,
           g.voornaam    AS van_voornaam,
           g.naam        AS van_naam,
           l.week_nummer
         FROM logboek_feedback lf
         JOIN logboek l          ON lf.logboek_id  = l.logboek_id
         JOIN gebruiker g        ON lf.gebruiker_id = g.gebruiker_id
         WHERE l.student_id = ?
           AND l.stage_id   = ?
         ORDER BY lf.created_at DESC
         LIMIT 3`,
        [studentId, stage.stage_id],
      )

      recenteFeedback = feedbackRijen
    }

    // ------------------------------------------------------------------
    // 4B. Laatste beslissing van de stagecommissie (voor de motivatie bij
    //     een afgewezen aanvraag of een vraag om aanpassingen)
    // ------------------------------------------------------------------
    let laatsteBeslissing = null

    if (stage) {
      const [beslissingRijen] = await db.execute(
        `SELECT
           cd.beslissing,
           cd.motivatie,
           cd.beslist_op,
           g.voornaam AS van_voornaam,
           g.naam     AS van_naam
         FROM commissie_beslissing cd
         JOIN gebruiker g ON cd.commissielid_id = g.gebruiker_id
         WHERE cd.stage_id = ?
         ORDER BY cd.beslist_op DESC
         LIMIT 1`,
        [stage.stage_id],
      )

      laatsteBeslissing = beslissingRijen[0] ?? null
    }

    // ------------------------------------------------------------------
    // 5. Ongelezen meldingen (max. 5)
    // ------------------------------------------------------------------
    const [meldingRijen] = await db.execute(
      `SELECT
         notificatie_id,
         bericht,
         type,
         gelezen,
         aangemaakt_op
       FROM notificatie
       WHERE gebruiker_id = ?
       ORDER BY aangemaakt_op DESC
       LIMIT 5`,
      [gebruikerId],
    )

    // ------------------------------------------------------------------
    // 6. Aankomende deadlines afgeleid uit de stageperiode
    //    Eenvoudige variant: halverwege + einddatum als checkpoints.
    //    Pas dit aan zodra je een echte deadline-tabel hebt.
    // ------------------------------------------------------------------
    let deadlines = []

    if (stage && stage.startdatum && stage.einddatum) {
      const start = new Date(stage.startdatum)
      const eind = new Date(stage.einddatum)
      const halverwege = new Date((start.getTime() + eind.getTime()) / 2)

      deadlines = [
        {
          label: 'Tussentijdse evaluatie',
          datum: halverwege.toISOString().slice(0, 10),
        },
        {
          label: 'Eindevaluatie',
          datum: eind.toISOString().slice(0, 10),
        },
      ]
    }

    // ------------------------------------------------------------------
    // 7. Logboek-melding: heeft de student dit week al ingediend?
    // ------------------------------------------------------------------
    const logboekNogNietIngediend =
      stage !== null &&
      (logboekDezeWeek === null || logboekDezeWeek.status === 'draft')

    // ------------------------------------------------------------------
    // Response samenstellen
    // ------------------------------------------------------------------
    return res.json({
      student: {
        student_id: student.student_id,
        voornaam: student.voornaam,
        naam: student.naam,
        email: student.email,
        studentnummer: student.studentnummer,
        opleiding: student.opleiding,
        academiejaar: student.academiejaar,
      },
      stage: stage
        ? {
            stage_id: stage.stage_id,
            stagetitel: stage.stagetitel,
            bedrijf: stage.bedrijf_naam,
            startdatum: stage.startdatum,
            einddatum: stage.einddatum,
            status: stage.stage_status,
            mentor: `${stage.mentor_voornaam} ${stage.mentor_naam}`,
            beslissing: laatsteBeslissing
              ? {
                  beslissing: laatsteBeslissing.beslissing,
                  motivatie: laatsteBeslissing.motivatie,
                  datum: laatsteBeslissing.beslist_op,
                  van: `${laatsteBeslissing.van_voornaam} ${laatsteBeslissing.van_naam}`,
                }
              : null,
          }
        : null,
      logboek: logboekDezeWeek
        ? {
            week_nummer: logboekDezeWeek.week_nummer,
            status: logboekDezeWeek.status,
            uren: logboekDezeWeek.uren,
            ingediend_op: logboekDezeWeek.ingediend_op,
            dagen: (logboekDezeWeek.dagen ?? []).map((d) => ({
              dag: d.dag,
              uren: d.uren,
            })),
          }
        : null,
      logboekNogNietIngediend,
      feedback: recenteFeedback.map((f) => ({
        van: `${f.van_voornaam} ${f.van_naam}`,
        week_nummer: f.week_nummer,
        opmerking: f.opmerking,
        datum: f.created_at,
      })),
      meldingen: meldingRijen.map((m) => ({
        id: m.notificatie_id,
        bericht: m.bericht,
        type: m.type,
        gelezen: Boolean(m.gelezen),
        datum: m.aangemaakt_op,
      })),
      deadlines,
    })
  } catch (err) {
    console.error('[dashboard] Fout:', err)
    return res.status(500).json({ error: 'Serverfout bij ophalen dashboarddata.' })
  }
})

module.exports = router