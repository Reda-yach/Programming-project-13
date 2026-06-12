const express = require('express');
const router = express.Router();
const db = require('../db').promise();
const { verifyToken, requireRol } = require('../middleware/auth');

router.post('/', verifyToken, requireRol('student'), async (req, res) => {
  const gebruiker_id = req.gebruiker.id;
  const { bedrijf, mentor } = req.body;

  try {
    const [studentRows] = await db.query(
      'SELECT student_id FROM student WHERE gebruiker_id = ?',
      [gebruiker_id],
    );

    if (!studentRows.length) {
      return res.status(404).json({ error: 'Student niet gevonden' });
    }

    const student_id = studentRows[0].student_id;
    const stagetitel = `${bedrijf?.bedrijf || 'Stage'} - ${mentor?.naam || 'mentor'}`;
    const beschrijving = bedrijf?.opdracht || 'Stageaanvraag ingediend';
    const bedrijfNaam = bedrijf?.bedrijf || 'Onbekend bedrijf';

    // Heeft de student een aanvraag waarvoor de commissie aanpassingen vroeg?
    // Dan werken we die bij i.p.v. een nieuwe stage aan te maken — zo blijven
    // de stage_id en de beslissingshistorie behouden.
    const [aanpasRows] = await db.query(
      `SELECT stage_id, bedrijf_id FROM stage
       WHERE student_id = ? AND status = 'aanpassing_vereist'
       ORDER BY ingediend_op DESC
       LIMIT 1`,
      [student_id],
    );

    if (aanpasRows.length) {
      const { stage_id, bedrijf_id } = aanpasRows[0];

      await db.query(
        `UPDATE bedrijf
         SET naam = ?, adres = ?, sector = ?, contact_email = ?, contact_telefoonnummer = ?
         WHERE bedrijf_id = ?`,
        [bedrijfNaam, bedrijf?.adres || null, bedrijf?.sector || null, mentor?.email || null, mentor?.tel || null, bedrijf_id],
      );

      await db.query(
        `UPDATE stage
         SET stagetitel = ?, beschrijving = ?, startdatum = ?, einddatum = ?,
             status = 'in_behandeling', ingediend_op = NOW()
         WHERE stage_id = ?`,
        [stagetitel, beschrijving, bedrijf?.datumVan || null, bedrijf?.datumTot || null, stage_id],
      );

      return res.status(200).json({
        message: 'Aanvraag opnieuw ingediend',
        stage_id,
        status: 'in_behandeling',
      });
    }

    // Anders: nieuwe aanvraag aanmaken.
    const [mentorRows] = await db.query('SELECT mentor_id FROM mentor LIMIT 1');
    const fallbackMentorId = mentorRows[0]?.mentor_id || 1;

    const [docentRows] = await db.query('SELECT docent_id FROM docent LIMIT 1');
    const fallbackDocentId = docentRows[0]?.docent_id || 1;

    const [bedrijfResult] = await db.query(
      'INSERT INTO bedrijf (naam, adres, sector, contact_email, contact_telefoonnummer) VALUES (?, ?, ?, ?, ?)',
      [bedrijfNaam, bedrijf?.adres || null, bedrijf?.sector || null, mentor?.email || null, mentor?.tel || null],
    );

    const nieuwBedrijfId = bedrijfResult.insertId;

    const [stageResult] = await db.query(
      `INSERT INTO stage
       (student_id, bedrijf_id, mentor_id, docent_id, stagetitel, beschrijving, startdatum, einddatum, status, ingediend_op)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ingediend', NOW())`,
      [student_id, nieuwBedrijfId, fallbackMentorId, fallbackDocentId, stagetitel, beschrijving, bedrijf?.datumVan || null, bedrijf?.datumTot || null],
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
