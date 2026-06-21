const express = require('express');
const router = express.Router();
const db = require('../db').promise();
const { verifyToken, requireRol } = require('../middleware/auth');

router.post('/', verifyToken, requireRol('student'), async (req, res) => {
  const gebruiker_id = req.gebruiker.id;
  const { bedrijf_id, stagetitel, beschrijving, startdatum, einddatum } = req.body;

  // Server-side validatie
  if (!bedrijf_id) return res.status(400).json({ error: 'Kies een bedrijf.' });
  if (!stagetitel || !stagetitel.trim()) return res.status(400).json({ error: 'Stagetitel is verplicht.' });
  if (!beschrijving || beschrijving.trim().length < 20) return res.status(400).json({ error: 'Geef een uitgebreidere omschrijving (minstens 20 tekens).' });
  if (!startdatum) return res.status(400).json({ error: 'Startdatum is verplicht.' });
  if (!einddatum) return res.status(400).json({ error: 'Einddatum is verplicht.' });
  if (startdatum >= einddatum) return res.status(400).json({ error: 'Einddatum moet na de startdatum liggen.' });

  try {
    const [studentRows] = await db.query(
      'SELECT student_id FROM student WHERE gebruiker_id = ?',
      [gebruiker_id],
    );
    if (!studentRows.length) return res.status(404).json({ error: 'Student niet gevonden' });
    const student_id = studentRows[0].student_id;

    // Bedrijf valideren: moet bestaan (voorgesteld of goedgekeurd)
    const [bedrijfRows] = await db.query(
      'SELECT bedrijf_id, status FROM bedrijf WHERE bedrijf_id = ?',
      [bedrijf_id],
    );
    if (!bedrijfRows.length) return res.status(400).json({ error: 'Bedrijf niet gevonden.' });

    // Heeft de student een aanvraag waarvoor aanpassingen gevraagd zijn?
    const [aanpasRows] = await db.query(
      `SELECT stage_id FROM stage
       WHERE student_id = ? AND status = 'aanpassing_gevraagd'
       ORDER BY ingediend_op DESC LIMIT 1`,
      [student_id],
    );

    if (aanpasRows.length) {
      const { stage_id } = aanpasRows[0];
      await db.query(
        `UPDATE stage
         SET bedrijf_id = ?, stagetitel = ?, beschrijving = ?, startdatum = ?, einddatum = ?,
             status = 'in_behandeling', ingediend_op = NOW()
         WHERE stage_id = ?`,
        [bedrijf_id, stagetitel.trim(), beschrijving.trim(), startdatum, einddatum, stage_id],
      );
      return res.status(200).json({ message: 'Aanvraag opnieuw ingediend', stage_id, status: 'in_behandeling' });
    }

    // Nieuwe aanvraag: mentor_id en docent_id zijn nu nullable
    const [stageResult] = await db.query(
      `INSERT INTO stage
       (student_id, bedrijf_id, stagetitel, beschrijving, startdatum, einddatum, status, ingediend_op)
       VALUES (?, ?, ?, ?, ?, ?, 'ingediend', NOW())`,
      [student_id, bedrijf_id, stagetitel.trim(), beschrijving.trim(), startdatum, einddatum],
    );

    return res.status(201).json({
      message: 'Stagevoorstel definitief ingediend',
      stage_id: stageResult.insertId,
      status: 'ingediend',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
