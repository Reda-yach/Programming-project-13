const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRol } = require('../middleware/auth');

router.post('/', verifyToken, requireRol('student'), (req, res) => {
  const gebruiker_id = req.gebruiker.id;
  const { bedrijf, mentor } = req.body;

  db.query(
    'SELECT student_id FROM student WHERE gebruiker_id = ?',
    [gebruiker_id],
    (err, studentRows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!studentRows.length) {
        return res.status(404).json({ error: 'Student niet gevonden' });
      }

      const student_id = studentRows[0].student_id;

      db.query(
        'SELECT mentor_id, bedrijf_id FROM mentor LIMIT 1',
        [],
        (mentorErr, mentorRows) => {
          if (mentorErr) {
            return res.status(500).json({ error: mentorErr.message });
          }

          const fallbackMentorId = mentorRows[0]?.mentor_id || 1;
          const fallbackBedrijfId = mentorRows[0]?.bedrijf_id || 1;

          db.query(
            'SELECT docent_id FROM docent LIMIT 1',
            [],
            (docentErr, docentRows) => {
              if (docentErr) {
                return res.status(500).json({ error: docentErr.message });
              }

              const fallbackDocentId = docentRows[0]?.docent_id || 1;

              db.query(
                'INSERT INTO bedrijf (naam, adres, sector, contact_email, contact_telefoonnummer) VALUES (?, ?, ?, ?, ?)',
                [
                  bedrijf?.bedrijf || 'Onbekend bedrijf',
                  bedrijf?.adres || null,
                  bedrijf?.sector || null,
                  mentor?.email || null,
                  mentor?.tel || null,
                ],
                (bedrijfErr, bedrijfResult) => {
                  if (bedrijfErr) {
                    return res.status(500).json({ error: bedrijfErr.message });
                  }

                  const nieuwBedrijfId = bedrijfResult.insertId || fallbackBedrijfId;

                  db.query(
                    `INSERT INTO stage
                     (student_id, bedrijf_id, mentor_id, docent_id, stagetitel, beschrijving, startdatum, einddatum, status, ingediend_op)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ingediend', NOW())`,
                    [
                      student_id,
                      nieuwBedrijfId,
                      fallbackMentorId,
                      fallbackDocentId,
                      `${bedrijf?.bedrijf || 'Stage'} - ${mentor?.naam || 'mentor'}`,
                      bedrijf?.opdracht || 'Stageaanvraag ingediend',
                      bedrijf?.datumVan || null,
                      bedrijf?.datumTot || null,
                    ],
                    (stageErr, stageResult) => {
                      if (stageErr) {
                        return res.status(500).json({ error: stageErr.message });
                      }

                      return res.status(201).json({
                        message: 'Stagevoorstel definitief ingediend',
                        stage_id: stageResult.insertId,
                        status: 'ingediend',
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;