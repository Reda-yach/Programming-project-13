const express = require('express');
const router = express.Router();
const db = require('../db');

// verifyToken lokale kopie (zelfde als in stage.js)

const { verifyToken, requireRol, requireCommissie } = require('../middleware/auth');
const { mailBijNotificatie } = require('../services/mail');

// Alle openstaande aanvragen ophalen — alleen commissie/docent/admin
router.get('/openstaand', verifyToken, requireRol('commissie', 'docent', 'admin'), (req, res) => {
  db.query(`
    SELECT
      s.stage_id,
      g.voornaam,
      g.naam AS student_naam,
      b.naam AS bedrijf,
      s.stagetitel,
      s.startdatum,
      s.einddatum,
      s.status,
      s.ingediend_op
    FROM stage s
    JOIN student st ON s.student_id = st.student_id
    JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
    JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
    WHERE s.status IN ('ingediend', 'in_behandeling')
    ORDER BY s.stage_id ASC
  `, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
// Stage goedkeuren — commissie/admin of docent met commissielid=true
router.put('/:id/goedkeuren', verifyToken, requireCommissie, (req, res) => {
  const { id } = req.params;

  // Controleer of stage bestaat
  db.query('SELECT * FROM stage WHERE stage_id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Stage niet gevonden' });

    const stage = results[0];

    // Controleer of status correct is
    if (!['ingediend', 'in_behandeling'].includes(stage.status)) {
      return res.status(400).json({ error: `Stage kan niet goedgekeurd worden, huidige status is: ${stage.status}` });
    }

    // Status op goedgekeurd zetten
    db.query('UPDATE stage SET status = ? WHERE stage_id = ?', ['goedgekeurd', id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: 'Stage goedgekeurd!', status: 'goedgekeurd' });
    });
  });
});
// ------------------------------------------------------------
// Beslissing van de stagecommissie (goedkeuren / aanpassen / afkeuren)
// ------------------------------------------------------------
// Eén atomaire actie: ze legt het besluit vast in commissie_beslissing,
// werkt stage.status bij én maakt een notificatie aan voor de student,
// zodat de drie altijd consistent blijven.
//
// Body: { beslissing: 'goedgekeurd' | 'meer_info' | 'afgewezen', motivatie }
//   - 'goedgekeurd'  -> stage.status 'goedgekeurd'
//   - 'meer_info'    -> stage.status 'aanpassing_gevraagd'  (motivatie verplicht)
//   - 'afgewezen'    -> stage.status 'afgewezen'           (motivatie verplicht)

const BESLISSING_NAAR_STATUS = {
  goedgekeurd: 'goedgekeurd',
  meer_info: 'aanpassing_gevraagd',
  afgewezen: 'afgewezen',
};

function bouwMelding(beslissing, motivatie) {
  switch (beslissing) {
    case 'goedgekeurd':
      return { type: 'goed', bericht: 'Je stage-aanvraag is goedgekeurd.' };
    case 'meer_info':
      return { type: 'waarschuwing', bericht: `Aanpassingen vereist voor je stage-aanvraag: ${motivatie}` };
    case 'afgewezen':
      return { type: 'fout', bericht: `Je stage-aanvraag is afgewezen: ${motivatie}` };
    default:
      return null;
  }
}

router.put('/:id/beslissing', verifyToken, async (req, res) => {
  const stageId = parseInt(req.params.id, 10);
  const { beslissing, motivatie, docent_id } = req.body;

  // Commissie, admin of docent met commissielid-vlag mogen beslissen.
  const { rol, commissielid } = req.gebruiker;
  const magBeoordelen = rol === 'admin' || rol === 'commissie' || commissielid === true;
  if (!magBeoordelen) {
    return res.status(403).json({ error: 'Geen rechten om een aanvraag te beoordelen.' });
  }

  if (isNaN(stageId)) {
    return res.status(400).json({ error: 'Ongeldig stage-id.' });
  }

  if (!BESLISSING_NAAR_STATUS[beslissing]) {
    return res.status(400).json({
      error: `Ongeldige beslissing. Kies uit: ${Object.keys(BESLISSING_NAAR_STATUS).join(', ')}`,
    });
  }

  // Motivatie is verplicht bij afkeuren of aanpassingen vragen.
  if ((beslissing === 'afgewezen' || beslissing === 'meer_info') && !motivatie?.trim()) {
    return res.status(400).json({ error: 'Motivatie is verplicht bij afkeuren of aanpassingen vragen.' });
  }

  // Goedkeuren koppelt meteen een begeleidende docent aan de stage; het
  // docent-dashboard filtert op stage.docent_id. Ongeldige id's vangt de
  // foreign key af (rollt de transactie terug).
  if (beslissing === 'goedgekeurd' && !docent_id) {
    return res.status(400).json({ error: 'Kies een begeleidende docent om de stage goed te keuren.' });
  }

  const nieuweStatus = BESLISSING_NAAR_STATUS[beslissing];
  const conn = await db.promise().getConnection();

  try {
    await conn.beginTransaction();

    // Stage ophalen (incl. gebruiker_id van de student voor de notificatie).
    const [stageRijen] = await conn.execute(
      `SELECT s.status, st.gebruiker_id
       FROM stage s
       JOIN student st ON s.student_id = st.student_id
       WHERE s.stage_id = ?`,
      [stageId],
    );

    if (stageRijen.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Stage niet gevonden' });
    }

    const huidigeStatus = stageRijen[0].status;
    const studentGebruikerId = stageRijen[0].gebruiker_id;

    // Een aanvraag kan alleen beoordeeld worden zolang ze in behandeling is.
    if (!['ingediend', 'in_behandeling', 'aanpassing_gevraagd'].includes(huidigeStatus)) {
      await conn.rollback();
      return res.status(400).json({
        error: `Aanvraag kan niet meer beoordeeld worden, huidige status is: ${huidigeStatus}`,
      });
    }

    // Goedkeuring geblokkeerd zolang het bedrijf nog niet goedgekeurd is.
    if (beslissing === 'goedgekeurd') {
      const [bedrijfCheck] = await conn.execute(
        `SELECT b.status FROM stage s JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id WHERE s.stage_id = ?`,
        [stageId]
      );
      if (bedrijfCheck.length && bedrijfCheck[0].status === 'voorgesteld') {
        await conn.rollback();
        return res.status(400).json({ error: 'Het bedrijf moet eerst goedgekeurd worden door de admin voordat de stage goedgekeurd kan worden.' });
      }
    }

    // 1. Besluit vastleggen (vormt tegelijk de historie van beslissingen).
    await conn.execute(
      `INSERT INTO commissie_beslissing (stage_id, commissielid_id, beslissing, motivatie)
       VALUES (?, ?, ?, ?)`,
      [stageId, req.gebruiker.id, beslissing, motivatie?.trim() || null],
    );

    // 2. Stage-status bijwerken (+ docent toewijzen bij goedkeuring).
    if (beslissing === 'goedgekeurd') {
      await conn.execute('UPDATE stage SET status = ?, docent_id = ? WHERE stage_id = ?', [nieuweStatus, docent_id, stageId]);
    } else {
      await conn.execute('UPDATE stage SET status = ? WHERE stage_id = ?', [nieuweStatus, stageId]);
    }

    // 2b. Bij goedkeuring: de stageovereenkomst alvast aanmaken zodat ze meteen
    //     ondertekend kan worden (de commissie tekent direct na goedkeuren).
    if (beslissing === 'goedgekeurd') {
      await conn.execute(
        `INSERT IGNORE INTO stagecontract (stage_id, getekend_student, getekend_bedrijf, getekend_docent)
         VALUES (?, FALSE, FALSE, FALSE)`,
        [stageId],
      );
    }

    // 3. Student op de hoogte brengen.
    const melding = bouwMelding(beslissing, motivatie?.trim());
    mailBijNotificatie(studentGebruikerId, melding.bericht);
    await conn.execute(
      `INSERT INTO notificatie (gebruiker_id, bericht, type) VALUES (?, ?, ?)`,
      [studentGebruikerId, melding.bericht, melding.type],
    );

    await conn.commit();

    return res.json({
      message: 'Beslissing verwerkt!',
      stage_id: stageId,
      status: nieuweStatus,
    });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Test-route
router.get('/test', (req, res) => {
  res.json({ message: 'Begeleider route werkt!' });
});

module.exports = router;
