const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRol } = require('../middleware/auth');

// Haalt de stage op van de ingelogde student.
// Resolveert callback (err, stage | null).
function getStageVanStudent(student_id, callback) {
  db.query(
    'SELECT stage_id, stagetitel, beschrijving, startdatum, einddatum, status FROM stage WHERE student_id = ? ORDER BY stage_id DESC LIMIT 1',
    [student_id],
    (err, rows) => {
      if (err) return callback(err);
      if (rows.length === 0) return callback(null, null);
      return callback(null, rows[0]);
    }
  );
}

// Haalt één evaluatie op met competenties (uit het template) + scores van deze
// evaluatie. Resolveert callback (err, evaluatie | null).
function getEvaluatieMetCriteria(evaluatie_id, callback) {
  db.query(
    `SELECT e.evaluatie_id, e.beoordelaar_id, e.type, e.totaalscore, e.opmerking, e.ingevuld_op,
            g.voornaam AS beoordelaar_voornaam, g.naam AS beoordelaar_naam, g.rol AS beoordelaar_rol
       FROM evaluatie e
       JOIN gebruiker g ON e.beoordelaar_id = g.gebruiker_id
      WHERE e.evaluatie_id = ?`,
    [evaluatie_id],
    (err, rows) => {
      if (err) return callback(err);
      if (rows.length === 0) return callback(null, null);

      const evaluatie = rows[0];

      // Opleiding van de student bij deze evaluatie bepalen.
      db.query(
        `SELECT st.opleiding_id
           FROM student_evaluatie se
           JOIN student st ON se.student_id = st.student_id
          WHERE se.evaluatie_id = ?
          LIMIT 1`,
        [evaluatie_id],
        (errOpl, oplRows) => {
          if (errOpl) return callback(errOpl);
          const opleiding_id = oplRows.length ? oplRows[0].opleiding_id : null;

          db.query(
            `SELECT c.competentie_id, c.naam, c.omschrijving, c.gewicht, es.score, es.toelichting
               FROM competentie c
               LEFT JOIN evaluatie_score es
                 ON es.competentie_id = c.competentie_id AND es.evaluatie_id = ?
              WHERE c.opleiding_id = ? AND c.is_actief = TRUE
              ORDER BY c.naam ASC`,
            [evaluatie_id, opleiding_id],
            (err2, competenties) => {
              if (err2) return callback(err2);

              const competentieIds = competenties.map((c) => c.competentie_id);
              if (competentieIds.length === 0) {
                evaluatie.competenties = [];
                return callback(null, evaluatie);
              }

              db.query(
                `SELECT competentie_id, punt, beschrijving
                   FROM competentie_rubriek
                  WHERE competentie_id IN (?)
                  ORDER BY punt DESC`,
                [competentieIds],
                (err3, rubrieken) => {
                  if (err3) return callback(err3);
                  evaluatie.competenties = competenties.map((c) => ({
                    ...c,
                    rubrieken: rubrieken.filter((r) => r.competentie_id === c.competentie_id),
                  }));
                  return callback(null, evaluatie);
                }
              );
            }
          );
        }
      );
    }
  );
}

// GET /api/student/evaluatie-eind
// Geeft de finale evaluatie(s) van de ingelogde student terug,
// gegroepeerd per type (student/mentor/docent). Geeft beschikbaar=false
// terug zolang de stage niet is afgerond.
router.get('/', verifyToken, requireRol('student'), (req, res) => {
  const gebruiker_id = req.gebruiker.id;

  db.query(
    'SELECT student_id FROM student WHERE gebruiker_id = ?',
    [gebruiker_id],
    (err, studentRows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (studentRows.length === 0) {
        return res.json({ beschikbaar: false, reden: 'geen_student' });
      }

      const student_id = studentRows[0].student_id;

      getStageVanStudent(student_id, (stageErr, stage) => {
        if (stageErr) return res.status(500).json({ error: stageErr.message });

        if (!stage) {
          return res.json({ beschikbaar: false, reden: 'geen_stage' });
        }

        if (stage.status !== 'afgerond') {
          return res.json({
            beschikbaar: false,
            reden: 'stage_niet_afgerond',
            stage: {
              stage_id: stage.stage_id,
              stagetitel: stage.stagetitel,
              status: stage.status,
            },
          });
        }

        // Stage is afgerond: haal alle evaluaties op die aan deze stage
        // gekoppeld zijn via de student_evaluatie-tussentabel.
        db.query(
          `SELECT se.evaluatie_id, e.type
             FROM student_evaluatie se
             JOIN evaluatie e ON se.evaluatie_id = e.evaluatie_id
            WHERE se.stage_id = ?
            ORDER BY e.ingevuld_op ASC`,
          [stage.stage_id],
          (evErr, evRows) => {
            if (evErr) return res.status(500).json({ error: evErr.message });

            if (evRows.length === 0) {
              return res.json({
                beschikbaar: true,
                stage,
                evaluaties: { student: null, mentor: null, docent: null },
              });
            }

            // Haal elke evaluatie parallel op met bijbehorende criteria.
            let pending = evRows.length;
            const evaluaties = { student: null, mentor: null, docent: null };
            let fout = null;

            evRows.forEach((row) => {
              getEvaluatieMetCriteria(row.evaluatie_id, (e, data) => {
                if (fout) return;
                if (e) {
                  fout = e;
                  return res.status(500).json({ error: e.message });
                }
                evaluaties[row.type] = data;
                pending -= 1;
                if (pending === 0) {
                  return res.json({ beschikbaar: true, stage, evaluaties });
                }
              });
            });
          }
        );
      });
    }
  );
});

module.exports = router;
