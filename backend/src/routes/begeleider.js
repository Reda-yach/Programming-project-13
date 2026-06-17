const express = require('express');
const router = express.Router();
const db = require('../db');

// verifyToken lokale kopie (zelfde als in stage.js)

const { verifyToken } = require('../middleware/auth');

// Alle openstaande aanvragen ophalen
router.get('/openstaand', verifyToken, (req, res) => {
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
// Stage goedkeuren
router.put('/:id/goedkeuren', verifyToken, (req, res) => {
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
  const { beslissing, motivatie } = req.body;

  // Alleen commissie/docent/admin mogen beslissen.
  if (!['commissie', 'docent', 'admin'].includes(req.gebruiker.rol)) {
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

    // 1. Besluit vastleggen (vormt tegelijk de historie van beslissingen).
    await conn.execute(
      `INSERT INTO commissie_beslissing (stage_id, commissielid_id, beslissing, motivatie)
       VALUES (?, ?, ?, ?)`,
      [stageId, req.gebruiker.id, beslissing, motivatie?.trim() || null],
    );

    // 2. Stage-status bijwerken.
    await conn.execute('UPDATE stage SET status = ? WHERE stage_id = ?', [nieuweStatus, stageId]);

    // 3. Student op de hoogte brengen.
    const melding = bouwMelding(beslissing, motivatie?.trim());
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
