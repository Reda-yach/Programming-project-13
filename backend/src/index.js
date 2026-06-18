const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./db');
const { verifyToken, requireRol } = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

// ============================================================
// TEST ROUTE
// ============================================================

app.get('/', (req, res) => {
  res.json({ message: 'Backend werkt!' });
});

// ============================================================
// AUTHENTICATIE
// ============================================================

// Login
app.post('/api/login', (req, res) => {
  const { email, wachtwoord } = req.body;

  db.query(
    'SELECT * FROM gebruiker WHERE email = ?',
    [email],
    async (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (results.length === 0) {
        res.status(401).json({ error: 'Gebruiker niet gevonden' });
        return;
      }

      const gebruiker = results[0];

      const wachtwoordKlopt = await bcrypt.compare(wachtwoord, gebruiker.wachtwoord_hash);

      if (!wachtwoordKlopt) {
        res.status(401).json({ error: 'Verkeerd wachtwoord' });
        return;
      }

      const token = jwt.sign(
        {
          id: gebruiker.gebruiker_id,
          email: gebruiker.email,
          rol: gebruiker.rol
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Basis-antwoord dat altijd geldt
      const antwoord = {
        message: 'Ingelogd!',
        token,
        gebruiker: {
          id: gebruiker.gebruiker_id,
          voornaam: gebruiker.voornaam,
          naam: gebruiker.naam,
          email: gebruiker.email,
          telefoonnummer: gebruiker.telefoonnummer,
          rol: gebruiker.rol
        }
      };

      // Is dit een student? Zoek dan het student_id (en studentgegevens) erbij.
      if (gebruiker.rol === 'student') {
        db.query(
          'SELECT student_id, studentnummer, opleiding, academiejaar FROM student WHERE gebruiker_id = ?',
          [gebruiker.gebruiker_id],
          (err2, studentResults) => {
            if (err2) {
              res.status(500).json({ error: err2.message });
              return;
            }
            if (studentResults.length > 0) {
              const s = studentResults[0];
              antwoord.gebruiker.student_id = s.student_id;
              antwoord.gebruiker.studentnummer = s.studentnummer;
              antwoord.gebruiker.opleiding = s.opleiding;
              antwoord.gebruiker.academiejaar = s.academiejaar;
            }
            res.json(antwoord);
          }
        );
      } else {
        res.json(antwoord);
      }
    }
  );
});

// ============================================================
// GEBRUIKERS
// ============================================================

// Alle gebruikers ophalen (beveiligd)
app.get('/api/gebruikers', verifyToken, (req, res) => {
  db.query(
    'SELECT gebruiker_id, voornaam, naam, email, telefoonnummer, rol, created_at FROM gebruiker',
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    }
  );
});

// ============================================================
// BEDRIJVEN
// ============================================================



// Één bedrijf ophalen
app.get('/api/bedrijven/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(
    'SELECT bedrijf_id, naam, straatnaam, huisnummer, postcode, gemeente, sector, contact_email, contact_telefoonnummer FROM bedrijf WHERE bedrijf_id = ?',
    [id],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (results.length === 0) {
        res.status(404).json({ error: 'Bedrijf niet gevonden' });
        return;
      }
      res.json(results[0]);
    }
  );
});

// Nieuw bedrijf aanmaken
app.post('/api/bedrijven', verifyToken, (req, res) => {
  const { naam, straatnaam, huisnummer, postcode, gemeente, sector, contact_email, contact_telefoonnummer } = req.body;
  db.query(
    'INSERT INTO bedrijf (naam, straatnaam, huisnummer, postcode, gemeente, sector, contact_email, contact_telefoonnummer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [naam, straatnaam, huisnummer, postcode, gemeente, sector, contact_email, contact_telefoonnummer],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Bedrijf aangemaakt!', id: results.insertId });
    }
  );
});

// ============================================================
// MENTORS
// ============================================================


// Mentors van een specifiek bedrijf ophalen
app.get('/api/bedrijven/:id/mentors', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT
      m.mentor_id,
      g.voornaam,
      g.naam,
      g.email,
      g.telefoonnummer,
      m.functietitel
    FROM mentor m
    JOIN gebruiker g ON m.gebruiker_id = g.gebruiker_id
    WHERE m.bedrijf_id = ?
  `, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Nieuwe mentor aanmaken of bestaande hergebruiken als het e-mailadres al bestaat.
app.post('/api/mentors', verifyToken, async (req, res) => {
  const { voornaam, naam, email, telefoonnummer, functietitel, bedrijf_id } = req.body;

  try {
    // Kijk of er al een gebruiker met dit e-mailadres bestaat
    db.query(
      `SELECT g.gebruiker_id, m.mentor_id
       FROM gebruiker g
       LEFT JOIN mentor m ON g.gebruiker_id = m.gebruiker_id
       WHERE g.email = ?`,
      [email],
      async (err, bestaande) => {
        if (err) return res.status(500).json({ error: err.message });

        if (bestaande.length > 0) {
          // Gebruiker bestaat al — gegevens bijwerken en mentor_id teruggeven
          const { gebruiker_id, mentor_id } = bestaande[0];

          db.query(
            'UPDATE gebruiker SET voornaam=?, naam=?, telefoonnummer=? WHERE gebruiker_id=?',
            [voornaam, naam, telefoonnummer, gebruiker_id],
            (err2) => {
              if (err2) return res.status(500).json({ error: err2.message });

              if (mentor_id) {
                db.query(
                  'UPDATE mentor SET bedrijf_id=?, functietitel=? WHERE mentor_id=?',
                  [bedrijf_id, functietitel, mentor_id],
                  (err3) => {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({ message: 'Mentor bijgewerkt!', mentor_id });
                  }
                );
              } else {
                db.query(
                  'INSERT INTO mentor (gebruiker_id, bedrijf_id, functietitel) VALUES (?, ?, ?)',
                  [gebruiker_id, bedrijf_id, functietitel],
                  (err3, result) => {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({ message: 'Mentor aangemaakt!', mentor_id: result.insertId });
                  }
                );
              }
            }
          );
        } else {
          // Nieuwe mentor aanmaken
          const hash = await bcrypt.hash('mentor123', 10);
          db.query(
            'INSERT INTO gebruiker (voornaam, naam, email, telefoonnummer, wachtwoord_hash, rol) VALUES (?, ?, ?, ?, ?, ?)',
            [voornaam, naam, email, telefoonnummer, hash, 'mentor'],
            (err2, gebruikerResult) => {
              if (err2) return res.status(500).json({ error: err2.message });
              const gebruiker_id = gebruikerResult.insertId;

              db.query(
                'INSERT INTO mentor (gebruiker_id, bedrijf_id, functietitel) VALUES (?, ?, ?)',
                [gebruiker_id, bedrijf_id, functietitel],
                (err3, mentorResult) => {
                  if (err3) return res.status(500).json({ error: err3.message });
                  res.json({ message: 'Mentor aangemaakt!', mentor_id: mentorResult.insertId });
                }
              );
            }
          );
        }
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Nieuwe student aanmaken (alleen admin). Maakt gebruiker (rol student) + student-rij.
// Standaardwachtwoord 'student123' — student reset dit via wachtwoord-vergeten.
app.post('/api/students', verifyToken, requireRol('admin'), async (req, res) => {
  const { voornaam, naam, email, telefoonnummer, studentnummer, opleiding, academiejaar } = req.body;

  if (!voornaam || !naam || !email || !studentnummer || !opleiding || !academiejaar) {
    return res.status(400).json({ error: 'Voornaam, naam, email, studentnummer, opleiding en academiejaar zijn verplicht.' });
  }

  try {
    const hash = await bcrypt.hash('student123', 10);
    db.query(
      'INSERT INTO gebruiker (voornaam, naam, email, telefoonnummer, wachtwoord_hash, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [voornaam, naam, email, telefoonnummer || null, hash, 'student'],
      (err, gebruikerResult) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Er bestaat al een gebruiker met dit e-mailadres.' });
          }
          return res.status(500).json({ error: err.message });
        }
        db.query(
          'INSERT INTO student (gebruiker_id, studentnummer, opleiding, academiejaar) VALUES (?, ?, ?, ?)',
          [gebruikerResult.insertId, studentnummer, opleiding, academiejaar],
          (err2, studentResult) => {
            if (err2) {
              // ponytail: dubbel studentnummer laat de zojuist aangemaakte gebruiker-rij wees achter;
              // wrap in een transactie als dat in de praktijk voorkomt.
              if (err2.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Dit studentnummer is al in gebruik.' });
              }
              return res.status(500).json({ error: err2.message });
            }
            res.status(201).json({ message: 'Student aangemaakt!', student_id: studentResult.insertId });
          }
        );
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// STAGES
// ============================================================

// Alle stages ophalen (beveiligd)
// Alle stages ophalen (beveiligd).
// Zonder ?status= : toont openstaande aanvragen (in_behandeling + ingediend) — voor de commissie-lijst.
// Met ?status=goedgekeurd (bv.) : toont alleen die ene status.
app.get('/api/stages', verifyToken, (req, res) => {
  const { status, zoek } = req.query;

  let where = 'WHERE 1=1';
  let params = [];

  if (status) {
    where += ' AND s.status = ?';
    params.push(status);
  } else {
    where += " AND s.status IN ('in_behandeling', 'ingediend', 'aanpassing_gevraagd')";
  }

  if (zoek) {
    where += ' AND (g.naam LIKE ? OR g.voornaam LIKE ? OR b.naam LIKE ?)';
    params.push(`%${zoek}%`, `%${zoek}%`, `%${zoek}%`);
  }

  db.query(`
    SELECT
      s.stage_id,
      g.voornaam,
      g.naam AS student,
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
    ${where}
    ORDER BY s.ingediend_op DESC
  `, params, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Één stage ophalen (volledig, incl. bedrijf en mentorinfo)
app.get('/api/stages/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT
      s.stage_id,
      g.voornaam AS student_voornaam,
      g.naam AS student_naam,
      g.email AS student_email,
      g.telefoonnummer AS student_telefoon,
      st.studentnummer,
      st.opleiding,
      b.naam AS bedrijf,
      b.straatnaam AS bedrijf_straatnaam,
      b.huisnummer AS bedrijf_huisnummer,
      b.postcode AS bedrijf_postcode,
      b.gemeente AS bedrijf_gemeente,
      b.sector AS bedrijf_sector,
      gm.voornaam AS mentor_voornaam,
      gm.naam AS mentor_naam,
      gm.email AS mentor_email,
      gm.telefoonnummer AS mentor_telefoon,
      m.functietitel AS mentor_functie,
      gd.voornaam AS docent_voornaam,
      gd.naam AS docent_naam,
      gd.email AS docent_email,
      s.stagetitel,
      s.beschrijving,
      s.startdatum,
      s.einddatum,
      s.status,
      s.ingediend_op
    FROM stage s
    JOIN student st ON s.student_id = st.student_id
    JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
    JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
    JOIN mentor m ON s.mentor_id = m.mentor_id
    JOIN gebruiker gm ON m.gebruiker_id = gm.gebruiker_id
    LEFT JOIN docent d ON s.docent_id = d.docent_id
    LEFT JOIN gebruiker gd ON d.gebruiker_id = gd.gebruiker_id
    WHERE s.stage_id = ?
  `, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Stage niet gevonden' });
      return;
    }
    res.json(results[0]);
  });
});

// Nieuwe stage aanmaken (stage-aanvraag indienen)
app.post('/api/stages', verifyToken, (req, res) => {
  const { student_id, bedrijf_id, mentor_id, docent_id, stagetitel, beschrijving, startdatum, einddatum } = req.body;

  db.query(
    `SELECT stage_id FROM stage WHERE student_id = ? AND status NOT IN ('afgewezen', 'afgerond')`,
    [student_id],
    (err, bestaande) => {
      if (err) return res.status(500).json({ error: err.message });
      if (bestaande.length > 0) {
        return res.status(400).json({ error: 'Je hebt al een actieve stage-aanvraag.' });
      }

      db.query(`
        INSERT INTO stage (student_id, bedrijf_id, mentor_id, docent_id, stagetitel, beschrijving, startdatum, einddatum)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [student_id, bedrijf_id, mentor_id, docent_id, stagetitel, beschrijving, startdatum, einddatum],
      (err2, results) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: 'Stage aangemaakt!', id: results.insertId });
      });
    }
  );
});


app.get('/api/mijn-stage', verifyToken, (req, res) => {
  const gebruiker_id = req.gebruiker.id;

  db.query(
    'SELECT student_id FROM student WHERE gebruiker_id = ?',
    [gebruiker_id],
    (err, studentRows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (studentRows.length === 0) {
        res.status(403).json({ error: 'Geen student-account' });
        return;
      }
      const student_id = studentRows[0].student_id;

      db.query(`
        SELECT
          s.stage_id,
          s.stagetitel,
          s.beschrijving,
          s.startdatum,
          s.einddatum,
          s.status,
          s.bedrijf_id,
          s.mentor_id,
          b.naam AS bedrijf,
          b.straatnaam AS bedrijf_straatnaam,
          b.huisnummer AS bedrijf_huisnummer,
          b.postcode AS bedrijf_postcode,
          b.gemeente AS bedrijf_gemeente,
          b.sector AS bedrijf_sector,
          gm.voornaam AS mentor_voornaam,
          gm.naam AS mentor_naam,
          gm.email AS mentor_email,
          gm.telefoonnummer AS mentor_telefoon,
          m.functietitel AS mentor_functie,
          m.gebruiker_id AS mentor_gebruiker_id,
          (
            SELECT cb.motivatie
            FROM commissie_beslissing cb
            WHERE cb.stage_id = s.stage_id
            ORDER BY cb.beslist_op DESC
            LIMIT 1
          ) AS commissie_motivatie
        FROM stage s
        JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
        JOIN mentor m ON s.mentor_id = m.mentor_id
        JOIN gebruiker gm ON m.gebruiker_id = gm.gebruiker_id
        WHERE s.student_id = ?
        ORDER BY s.ingediend_op DESC
        LIMIT 1
      `, [student_id], (err2, stageRows) => {
        if (err2) {
          res.status(500).json({ error: err2.message });
          return;
        }
        if (stageRows.length === 0) {
          res.json({ stage: null, meldingen: [] });
          return;
        }

        const stage = stageRows[0];

        db.query(`
          SELECT
            cb.beslissing_id,
            cb.beslissing,
            cb.motivatie,
            cb.beslist_op
          FROM commissie_beslissing cb
          WHERE cb.stage_id = ?
          ORDER BY cb.beslist_op DESC
        `, [stage.stage_id], (err3, beslissingRows) => {
          if (err3) {
            res.status(500).json({ error: err3.message });
            return;
          }
          res.json({ stage, meldingen: beslissingRows });
        });
      });
    }
  );
});

// Stage status updaten (beveiligd)
app.put('/api/stages/:id/status', verifyToken, requireRol('commissie', 'admin', 'docent'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.query(`
    UPDATE stage SET status = ? WHERE stage_id = ?
  `, [status, id],
  (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Stage niet gevonden' });
      return;
    }
    res.json({ message: 'Status bijgewerkt!' });
  });
});
// Commissie-beslissing op een stage: slaat de beslissing+motivatie op
// EN zet de stage-status, in één call. Het commissielid komt uit de token.
app.post('/api/stages/:id/beslissing', verifyToken, (req, res) => {
  const { id } = req.params;
  const { beslissing, motivatie } = req.body;
  const commissielid_id = req.gebruiker.id; // uit de JWT, niet uit de body

  // Knop → database-waarde. Beide tabellen gebruiken nu dezelfde term.
  const opties = {
    goedkeuren: 'goedgekeurd',
    afkeuren:   'afgewezen',
    aanpassing: 'aanpassing_gevraagd',
  };

  const waarde = opties[beslissing];
  if (!waarde) {
    res.status(400).json({
      error: "Ongeldige beslissing. Kies uit: goedkeuren, afkeuren, aanpassing",
    });
    return;
  }

  // Motivatie verplicht bij afkeuren of aanpassing vragen
  if ((beslissing === 'afkeuren' || beslissing === 'aanpassing') && !motivatie?.trim()) {
    res.status(400).json({ error: 'Motivatie is verplicht bij afkeuren of aanpassing vragen.' });
    return;
  }

  // 1) Beslissing opslaan
  db.query(
    `INSERT INTO commissie_beslissing (stage_id, commissielid_id, beslissing, motivatie)
     VALUES (?, ?, ?, ?)`,
    [id, commissielid_id, waarde, motivatie || null],
    (err, insertResult) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // 2) Stage-status bijwerken (zelfde waarde)
      db.query(
        `UPDATE stage SET status = ? WHERE stage_id = ?`,
        [waarde, id],
        (err2, updateResult) => {
          if (err2) {
            res.status(500).json({ error: err2.message });
            return;
          }
          if (updateResult.affectedRows === 0) {
            res.status(404).json({ error: 'Stage niet gevonden' });
            return;
          }

          // Bij goedkeuring automatisch een contract aanmaken (als dat nog niet bestaat)
          if (waarde === 'goedgekeurd') {
            db.query(
              `INSERT IGNORE INTO stagecontract (stage_id, getekend_student, getekend_mentor, getekend_docent)
               VALUES (?, FALSE, FALSE, FALSE)`,
              [id],
              () => {
                res.json({
                  message: 'Beslissing opgeslagen, status bijgewerkt en contract aangemaakt!',
                  beslissing_id: insertResult.insertId,
                  nieuwe_status: waarde,
                });
              }
            );
          } else {
            res.json({
              message: 'Beslissing opgeslagen en status bijgewerkt!',
              beslissing_id: insertResult.insertId,
              nieuwe_status: waarde,
            });
          }
        }
      );
    }
  );
});
// ============================================================
// LOGBOEKEN
// ============================================================

// Alle logboeken ophalen (beveiligd)
app.get('/api/logboeken', verifyToken, (req, res) => {
  db.query(`
    SELECT
      l.logboek_id,
      g.voornaam,
      g.naam AS student,
      l.stage_id,
      l.week_nummer,
      l.activiteiten,
      l.reflectie,
      l.leerpunten,
      l.uren,
      l.status,
      l.ingediend_op
    FROM logboek l
    JOIN student st ON l.student_id = st.student_id
    JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
  `, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Logboeken per stage ophalen
app.get('/api/stages/:id/logboeken', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT
      l.logboek_id,
      g.voornaam,
      g.naam AS student,
      l.week_nummer,
      l.activiteiten,
      l.reflectie,
      l.leerpunten,
      l.uren,
      l.status,
      l.ingediend_op,
      l.gevalideerd_op,
      gm.voornaam AS gevalideerd_door_voornaam,
      gm.naam AS gevalideerd_door_naam
    FROM logboek l
    JOIN student st ON l.student_id = st.student_id
    JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
    LEFT JOIN mentor m ON l.gevalideerd_door = m.mentor_id
    LEFT JOIN gebruiker gm ON m.gebruiker_id = gm.gebruiker_id
    WHERE l.stage_id = ?
    ORDER BY l.week_nummer ASC
  `, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Één logboek ophalen
app.get('/api/logboeken/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT
      l.logboek_id,
      g.voornaam,
      g.naam AS student,
      l.stage_id,
      l.week_nummer,
      l.activiteiten,
      l.reflectie,
      l.leerpunten,
      l.uren,
      l.status,
      l.ingediend_op
    FROM logboek l
    JOIN student st ON l.student_id = st.student_id
    JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
    WHERE l.logboek_id = ?
  `, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Logboek niet gevonden' });
      return;
    }
    res.json(results[0]);
  });
});

// Nieuw logboek aanmaken (met reflectie en leerpunten)
app.post('/api/logboeken', verifyToken, (req, res) => {
  const { student_id, stage_id, week_nummer, activiteiten, reflectie, leerpunten, uren } = req.body;
  db.query(`
    INSERT INTO logboek (student_id, stage_id, week_nummer, activiteiten, reflectie, leerpunten, uren, status, ingediend_op)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ingediend', NOW())
  `, [student_id, stage_id, week_nummer, activiteiten, reflectie, leerpunten, uren],
  (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Logboek aangemaakt!', id: results.insertId });
  });
});

// Logboek status updaten (goedkeuren/afkeuren)
app.put('/api/logboeken/:id/status', verifyToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const toegestaneStatussen = ['draft', 'ingediend', 'goedgekeurd'];
  if (!toegestaneStatussen.includes(status)) {
    res.status(400).json({ error: `Ongeldige status. Kies uit: ${toegestaneStatussen.join(', ')}` });
    return;
  }

  db.query(`
    UPDATE logboek SET status = ? WHERE logboek_id = ?
  `, [status, id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Logboek niet gevonden' });
      return;
    }
    res.json({ message: 'Logboek status bijgewerkt!' });
  });
});

// ============================================================
// LOGBOEK FEEDBACK
// ============================================================

// Feedback van een logboek ophalen
app.get('/api/logboeken/:id/feedback', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT
      lf.feedback_id,
      g.voornaam,
      g.naam AS auteur,
      g.rol,
      lf.opmerking,
      lf.created_at
    FROM logboek_feedback lf
    JOIN gebruiker g ON lf.gebruiker_id = g.gebruiker_id
    WHERE lf.logboek_id = ?
    ORDER BY lf.created_at ASC
  `, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Feedback toevoegen aan een logboek
app.post('/api/logboeken/:id/feedback', verifyToken, (req, res) => {
  const { id } = req.params;
  const { gebruiker_id, opmerking } = req.body;
  db.query(`
    INSERT INTO logboek_feedback (logboek_id, gebruiker_id, opmerking)
    VALUES (?, ?, ?)
  `, [id, gebruiker_id, opmerking], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Feedback toegevoegd!', id: results.insertId });
  });
});

// ============================================================
// EVALUATIES
// ============================================================

// Alle evaluaties ophalen (beveiligd)
app.get('/api/evaluaties', verifyToken, (req, res) => {
  db.query(`
    SELECT
      e.evaluatie_id,
      g.voornaam,
      g.naam AS beoordelaar,
      e.type,
      e.totaalscore,
      e.opmerking,
      e.ingevuld_op
    FROM evaluatie e
    JOIN gebruiker g ON e.beoordelaar_id = g.gebruiker_id
  `, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Evaluaties per stage ophalen
app.get('/api/stages/:id/evaluaties', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT
      e.evaluatie_id,
      g.voornaam,
      g.naam AS beoordelaar,
      e.type,
      e.totaalscore,
      e.opmerking,
      e.ingevuld_op
    FROM evaluatie e
    JOIN gebruiker g ON e.beoordelaar_id = g.gebruiker_id
    JOIN student_evaluatie se ON e.evaluatie_id = se.evaluatie_id
    WHERE se.stage_id = ?
    ORDER BY e.ingevuld_op ASC
  `, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Één evaluatie ophalen met competenties (uit het template) + scores van deze evaluatie.
// De competentielijst komt uit competentie/competentie_rubriek voor de opleiding van
// de student; de scores komen uit evaluatie_score (leeg zolang nog niet ingevuld).
app.get('/api/evaluaties/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT
      e.evaluatie_id,
      g.voornaam,
      g.naam AS beoordelaar,
      e.type,
      e.fase,
      e.totaalscore,
      e.opmerking,
      e.ingevuld_op,
      e.ingediend
    FROM evaluatie e
    JOIN gebruiker g ON e.beoordelaar_id = g.gebruiker_id
    WHERE e.evaluatie_id = ?
  `, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Evaluatie niet gevonden' });
      return;
    }

    const evaluatie = results[0];

    // Bepaal de opleiding van de student die bij deze evaluatie hoort.
    db.query(`
      SELECT st.opleiding_id
      FROM student_evaluatie se
      JOIN student st ON se.student_id = st.student_id
      WHERE se.evaluatie_id = ?
      LIMIT 1
    `, [id], (errOpl, oplRows) => {
      if (errOpl) {
        res.status(500).json({ error: errOpl.message });
        return;
      }
      const opleiding_id = oplRows.length ? oplRows[0].opleiding_id : null;

      // Competenties van die opleiding + (eventuele) score van deze evaluatie.
      db.query(`
        SELECT
          c.competentie_id,
          c.naam,
          c.omschrijving,
          c.gewicht,
          es.score,
          es.toelichting
        FROM competentie c
        LEFT JOIN evaluatie_score es
          ON es.competentie_id = c.competentie_id AND es.evaluatie_id = ?
        WHERE c.opleiding_id = ? AND c.is_actief = TRUE
        ORDER BY c.naam ASC
      `, [id, opleiding_id], (err2, competenties) => {
        if (err2) {
          res.status(500).json({ error: err2.message });
          return;
        }

        const competentieIds = competenties.map(c => c.competentie_id);
        if (competentieIds.length === 0) {
          evaluatie.competenties = [];
          return res.json(evaluatie);
        }

        // Rubriekbeschrijvingen per score-niveau ophalen.
        db.query(`
          SELECT competentie_id, punt, beschrijving
          FROM competentie_rubriek
          WHERE competentie_id IN (?)
          ORDER BY punt DESC
        `, [competentieIds], (err3, rubrieken) => {
          if (err3) {
            res.status(500).json({ error: err3.message });
            return;
          }

          evaluatie.competenties = competenties.map(c => ({
            ...c,
            rubrieken: rubrieken.filter(r => r.competentie_id === c.competentie_id)
          }));

          res.json(evaluatie);
        });
      });
    });
  });
});

// Evaluatie starten voor een stage: maakt evaluatie + criteria aan op basis van competenties
app.post('/api/stages/:id/evaluatie/aanmaken', verifyToken, (req, res) => {
  const { id } = req.params;
  const { fase, type } = req.body;
  const beoordelaar_id = req.gebruiker.id;
  const rol = req.gebruiker.rol;

  if (!['docent', 'mentor', 'admin', 'student'].includes(rol)) {
    return res.status(403).json({ error: 'Geen toegang.' });
  }
  if (rol === 'student' && type !== 'student') {
    return res.status(403).json({ error: 'Studenten kunnen enkel een zelfevaluatie aanmaken.' });
  }
  if (!['tussentijds', 'finaal'].includes(fase)) {
    return res.status(400).json({ error: 'fase moet tussentijds of finaal zijn' });
  }
  if (!['docent', 'mentor', 'student'].includes(type)) {
    return res.status(400).json({ error: 'type moet docent, mentor of student zijn' });
  }

  // Haal student_id op voor deze stage
  db.query('SELECT student_id FROM stage WHERE stage_id = ?', [id], (err, stageRows) => {
    if (err || stageRows.length === 0) return res.status(404).json({ error: 'Stage niet gevonden' });
    const student_id = stageRows[0].student_id;

    // Maak de evaluatie aan. De competentielijst wordt niet meer gekopieerd:
    // die komt bij het ophalen rechtstreeks uit het competentie-template van de
    // opleiding, en scores worden los opgeslagen in evaluatie_score.
    db.query(
      'INSERT INTO evaluatie (beoordelaar_id, type, fase) VALUES (?, ?, ?)',
      [beoordelaar_id, type, fase],
      (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        const evaluatie_id = result.insertId;

        // Koppel aan student via student_evaluatie
        db.query(
          'INSERT INTO student_evaluatie (student_id, evaluatie_id, stage_id) VALUES (?, ?, ?)',
          [student_id, evaluatie_id, id],
          (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            res.json({ message: 'Evaluatie aangemaakt!', evaluatie_id });
          }
        );
      }
    );
  });
});

// Score + toelichting voor één competentie binnen een evaluatie opslaan (upsert).
// Eén route voor student, mentor en docent: elke rol schrijft naar zijn eigen
// evaluatie. Bestaat de rij al (zelfde evaluatie + competentie), dan wordt ze
// bijgewerkt; anders aangemaakt.
app.put('/api/evaluaties/:id/competentie/:competentie_id', verifyToken, (req, res) => {
  const { id, competentie_id } = req.params;
  const { score, toelichting } = req.body;
  db.query(
    `INSERT INTO evaluatie_score (evaluatie_id, competentie_id, score, toelichting)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE score = VALUES(score), toelichting = VALUES(toelichting)`,
    [id, competentie_id, score ?? null, toelichting ?? null],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Score opgeslagen!' });
    }
  );
});

// Vergelijkingsoverzicht voor een stage + fase: per competentie de score en
// toelichting van student, mentor en docent naast elkaar. Voedt o.a. het
// twee-koloms mentor-scherm (zelfevaluatie student links, mentor-score rechts).
app.get('/api/stages/:id/evaluatie/vergelijking', verifyToken, (req, res) => {
  const { id } = req.params;
  const { fase } = req.query;
  if (!['tussentijds', 'finaal'].includes(fase)) {
    return res.status(400).json({ error: 'fase moet tussentijds of finaal zijn' });
  }

  // 1. Student + opleiding van deze stage.
  db.query(
    'SELECT student_id FROM stage WHERE stage_id = ?',
    [id],
    (err, stageRows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (stageRows.length === 0) return res.status(404).json({ error: 'Stage niet gevonden' });
      const student_id = stageRows[0].student_id;

      db.query(
        'SELECT opleiding_id FROM student WHERE student_id = ?',
        [student_id],
        (errOpl, oplRows) => {
          if (errOpl) return res.status(500).json({ error: errOpl.message });
          const opleiding_id = oplRows.length ? oplRows[0].opleiding_id : null;

          // 2. Evaluaties van deze stage + fase, per type.
          db.query(
            `SELECT e.evaluatie_id, e.type, e.opmerking, e.totaalscore, e.ingediend, e.ingevuld_op
               FROM student_evaluatie se
               JOIN evaluatie e ON se.evaluatie_id = e.evaluatie_id
              WHERE se.stage_id = ? AND e.fase = ?`,
            [id, fase],
            (errEv, evRows) => {
              if (errEv) return res.status(500).json({ error: errEv.message });

              const evaluaties = { student: null, mentor: null, docent: null };
              evRows.forEach((e) => { evaluaties[e.type] = e; });
              const evaluatieIds = evRows.map((e) => e.evaluatie_id);

              // 3. Competenties van de opleiding + rubrieken.
              db.query(
                `SELECT competentie_id, naam, omschrijving, gewicht
                   FROM competentie
                  WHERE opleiding_id = ? AND is_actief = TRUE
                  ORDER BY naam ASC`,
                [opleiding_id],
                (errC, competenties) => {
                  if (errC) return res.status(500).json({ error: errC.message });
                  if (competenties.length === 0) {
                    return res.json({ stage_id: Number(id), fase, evaluaties, competenties: [] });
                  }
                  const competentieIds = competenties.map((c) => c.competentie_id);

                  db.query(
                    `SELECT competentie_id, punt, beschrijving
                       FROM competentie_rubriek
                      WHERE competentie_id IN (?)
                      ORDER BY punt DESC`,
                    [competentieIds],
                    (errR, rubrieken) => {
                      if (errR) return res.status(500).json({ error: errR.message });

                      // 4. Alle scores van de betrokken evaluaties.
                      const scoresKlaar = (scores) => {
                        // Map: evaluatie_id -> competentie_id -> {score, toelichting}
                        const perEval = {};
                        scores.forEach((s) => {
                          (perEval[s.evaluatie_id] ||= {})[s.competentie_id] = {
                            score: s.score,
                            toelichting: s.toelichting,
                          };
                        });
                        const scoreVoor = (type, competentieId) => {
                          const ev = evaluaties[type];
                          if (!ev) return null;
                          return perEval[ev.evaluatie_id]?.[competentieId] ?? null;
                        };

                        const resultaat = competenties.map((c) => ({
                          ...c,
                          rubrieken: rubrieken.filter((r) => r.competentie_id === c.competentie_id),
                          student: scoreVoor('student', c.competentie_id),
                          mentor: scoreVoor('mentor', c.competentie_id),
                          docent: scoreVoor('docent', c.competentie_id),
                        }));

                        res.json({ stage_id: Number(id), fase, evaluaties, competenties: resultaat });
                      };

                      if (evaluatieIds.length === 0) return scoresKlaar([]);
                      db.query(
                        `SELECT evaluatie_id, competentie_id, score, toelichting
                           FROM evaluatie_score
                          WHERE evaluatie_id IN (?)`,
                        [evaluatieIds],
                        (errS, scores) => {
                          if (errS) return res.status(500).json({ error: errS.message });
                          scoresKlaar(scores);
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
    }
  );
});

// Alle evaluaties voor een stage ophalen (overzicht per fase/type)
app.get('/api/stages/:id/evaluatie-overzicht', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT
      e.evaluatie_id,
      e.type,
      e.fase,
      e.totaalscore,
      e.opmerking,
      e.ingevuld_op,
      e.ingediend,
      g.voornaam AS beoordelaar_voornaam,
      g.naam AS beoordelaar_naam,
      (SELECT COUNT(*) FROM evaluatie_score es WHERE es.evaluatie_id = e.evaluatie_id AND es.score IS NOT NULL) AS ingevulde_criteria,
      (SELECT COUNT(*) FROM competentie c WHERE c.opleiding_id = st.opleiding_id AND c.is_actief = TRUE) AS totaal_criteria
    FROM evaluatie e
    JOIN student_evaluatie se ON e.evaluatie_id = se.evaluatie_id
    JOIN student st ON se.student_id = st.student_id
    JOIN gebruiker g ON e.beoordelaar_id = g.gebruiker_id
    WHERE se.stage_id = ?
    ORDER BY e.ingevuld_op DESC
  `, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Nieuwe evaluatie aanmaken
app.post('/api/evaluaties', verifyToken, (req, res) => {
  const { beoordelaar_id, type, totaalscore, opmerking, student_id, stage_id } = req.body;
  db.query(`
    INSERT INTO evaluatie (beoordelaar_id, type, totaalscore, opmerking)
    VALUES (?, ?, ?, ?)
  `, [beoordelaar_id, type, totaalscore, opmerking], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const evaluatie_id = results.insertId;

    db.query(`
      INSERT INTO student_evaluatie (student_id, evaluatie_id, stage_id)
      VALUES (?, ?, ?)
    `, [student_id, evaluatie_id, stage_id], (err2) => {
      if (err2) {
        res.status(500).json({ error: err2.message });
        return;
      }
      res.json({ message: 'Evaluatie aangemaakt!', id: evaluatie_id });
    });
  });
});

// (Oude /criteria/:criterium_id/score route verwijderd — scores lopen nu via
//  PUT /api/evaluaties/:id/competentie/:competentie_id.)

// ============================================================
// NOTIFICATIES
// ============================================================

// Alle notificaties ophalen (beveiligd)
app.get('/api/notificaties', verifyToken, (req, res) => {
  db.query(`
    SELECT
      n.notificatie_id,
      g.voornaam,
      g.naam AS gebruiker,
      n.bericht,
      n.gelezen,
      n.aangemaakt_op
    FROM notificatie n
    JOIN gebruiker g ON n.gebruiker_id = g.gebruiker_id
    ORDER BY n.aangemaakt_op DESC
  `, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Notificaties per gebruiker ophalen
app.get('/api/notificaties/:gebruiker_id', verifyToken, (req, res) => {
  const { gebruiker_id } = req.params;
  db.query(`
    SELECT
      n.notificatie_id,
      n.bericht,
      n.gelezen,
      n.aangemaakt_op
    FROM notificatie n
    WHERE n.gebruiker_id = ?
    ORDER BY n.aangemaakt_op DESC
  `, [gebruiker_id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Notificatie als gelezen markeren
app.put('/api/notificaties/:id/gelezen', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(`
    UPDATE notificatie SET gelezen = TRUE WHERE notificatie_id = ?
  `, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Notificatie niet gevonden' });
      return;
    }
    res.json({ message: 'Notificatie gemarkeerd als gelezen!' });
  });
});

// ============================================================
// COMMISSIE BESLISSINGEN
// ============================================================

// Alle commissiebeslissingen ophalen (beveiligd)
 app.get('/api/commissie', verifyToken, requireRol('commissie', 'admin'), (req, res) => {
  db.query(`
    SELECT
      cd.beslissing_id,
      g_student.voornaam AS student_voornaam,
      g_student.naam AS student,
      b.naam AS bedrijf,
      s.stagetitel,
      g_commissie.voornaam AS commissielid_voornaam,
      g_commissie.naam AS commissielid,
      cd.beslissing,
      cd.motivatie,
      cd.beslist_op
    FROM commissie_beslissing cd
    JOIN stage s ON cd.stage_id = s.stage_id
    JOIN student st ON s.student_id = st.student_id
    JOIN gebruiker g_student ON st.gebruiker_id = g_student.gebruiker_id
    JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
    JOIN gebruiker g_commissie ON cd.commissielid_id = g_commissie.gebruiker_id
  `, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Nieuwe commissiebeslissing toevoegen (alleen commissie en admin)
app.post('/api/commissie', verifyToken, requireRol('commissie', 'admin'), (req, res) => {
  const { stage_id, commissielid_id, beslissing, motivatie } = req.body;

  const toegestaneBeslissingen = ['goedgekeurd', 'afgekeurd', 'aanpassing_gevraagd'];
  if (!toegestaneBeslissingen.includes(beslissing)) {
    return res.status(400).json({ error: `Ongeldige beslissing. Kies uit: ${toegestaneBeslissingen.join(', ')}` });
  }

  db.query(`
    INSERT INTO commissie_beslissing (stage_id, commissielid_id, beslissing, motivatie)
    VALUES (?, ?, ?, ?)
  `, [stage_id, commissielid_id, beslissing, motivatie],
  (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const beslissing_id = results.insertId;

    const nieuweStatus = beslissing === 'goedgekeurd' ? 'goedgekeurd'
      : beslissing === 'afgekeurd' ? 'afgekeurd'
      : 'aanpassing_gevraagd';

    db.query(`
      UPDATE stage SET status = ? WHERE stage_id = ?
    `, [nieuweStatus, stage_id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      db.query(`
        SELECT st.gebruiker_id
        FROM stage s
        JOIN student st ON s.student_id = st.student_id
        WHERE s.stage_id = ?
      `, [stage_id], (err3, rows) => {
        if (err3 || rows.length === 0) {
          return res.json({ message: 'Beslissing opgeslagen!', id: beslissing_id });
        }

        const bericht = beslissing === 'goedgekeurd'
          ? 'Je stage-aanvraag is goedgekeurd!'
          : beslissing === 'afgekeurd'
          ? `Je stage-aanvraag is afgekeurd. Reden: ${motivatie}`
          : `Je stage-aanvraag vereist aanpassingen: ${motivatie}`;

        db.query(`
          INSERT INTO notificatie (gebruiker_id, bericht)
          VALUES (?, ?)
        `, [rows[0].gebruiker_id, bericht], () => {
          res.json({ message: 'Beslissing opgeslagen en student verwittigd!', id: beslissing_id });
        });
      });
    });
  });
});

// ============================================================
// STAGECONTRACTEN
// ============================================================

// Contract van een stage ophalen (beveiligd)
app.get('/api/contracten/:stage_id', verifyToken, (req, res) => {
  const { stage_id } = req.params;
  db.query(`
    SELECT
      sc.contract_id,
      sc.stage_id,
      g.voornaam,
      g.naam AS student,
      g.email AS student_email,
      st.studentnummer,
      st.opleiding,
      s.stagetitel,
      s.beschrijving,
      s.startdatum,
      s.einddatum,
      b.naam AS bedrijf,
      b.straatnaam AS bedrijf_straatnaam,
      b.huisnummer AS bedrijf_huisnummer,
      b.postcode AS bedrijf_postcode,
      b.gemeente AS bedrijf_gemeente,
      b.sector AS bedrijf_sector,
      gm.voornaam AS mentor_voornaam,
      gm.naam AS mentor_naam,
      gm.email AS mentor_email,
      m.functietitel AS mentor_functie,
      sc.getekend_student,
      sc.getekend_mentor,
      sc.getekend_docent,
      sc.handtekening_student,
      sc.handtekening_mentor,
      sc.handtekening_docent,
      sc.getekend_student_op,
      sc.getekend_mentor_op,
      sc.getekend_docent_op,
      sc.getekend_op
    FROM stagecontract sc
    JOIN stage s ON sc.stage_id = s.stage_id
    JOIN student st ON s.student_id = st.student_id
    JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
    JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
    JOIN mentor m ON s.mentor_id = m.mentor_id
    JOIN gebruiker gm ON m.gebruiker_id = gm.gebruiker_id
    WHERE sc.stage_id = ?
  `, [stage_id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Contract niet gevonden' });
      return;
    }
    res.json(results[0]);
  });
});

// Contract tekenen (student, mentor of docent-in-commissie).
// Body: { rol, handtekening } waarbij handtekening een base64 PNG data-URL is.
// Vrije volgorde: er is geen verplichte ondertekenvolgorde.
app.put('/api/contracten/:stage_id/tekenen', verifyToken, (req, res) => {
  const { stage_id } = req.params;
  const { rol, handtekening } = req.body;

  const toegestaneRollen = ['student', 'mentor', 'docent'];
  if (!toegestaneRollen.includes(rol)) {
    res.status(400).json({ error: `Ongeldige rol. Kies uit: ${toegestaneRollen.join(', ')}` });
    return;
  }

  if (!handtekening || typeof handtekening !== 'string' || !handtekening.startsWith('data:image')) {
    res.status(400).json({ error: 'Een handtekening is verplicht om te tekenen.' });
    return;
  }

  // rol is gevalideerd tegen een vaste allowlist, dus veilig in de kolomnaam.
  const kolomGetekend = `getekend_${rol}`;
  const kolomHandtekening = `handtekening_${rol}`;
  const kolomOp = `getekend_${rol}_op`;

  db.query(`
    UPDATE stagecontract
    SET ${kolomGetekend} = TRUE, ${kolomHandtekening} = ?, ${kolomOp} = NOW()
    WHERE stage_id = ?
  `, [handtekening, stage_id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Contract niet gevonden' });
      return;
    }

    // Controleer of iedereen getekend heeft → dan getekend_op invullen
    db.query(`
      SELECT getekend_student, getekend_mentor, getekend_docent
      FROM stagecontract WHERE stage_id = ?
    `, [stage_id], (err2, rows) => {
      if (err2 || rows.length === 0) {
        res.json({ message: `Contract getekend door ${rol}!` });
        return;
      }
      const c = rows[0];
      if (c.getekend_student && c.getekend_mentor && c.getekend_docent) {
        db.query(`
          UPDATE stagecontract SET getekend_op = NOW() WHERE stage_id = ?
        `, [stage_id], () => {
          res.json({ message: 'Contract door iedereen getekend! Datum geregistreerd.' });
        });
      } else {
        res.json({ message: `Contract getekend door ${rol}!` });
      }
    });
  });
});
// ============================================================
// COMPETENTIES
// ============================================================
 
// Alle competenties per opleiding ophalen (inclusief rubrieken per score-niveau)
app.get('/api/competenties/:opleiding_id', verifyToken, requireRol('admin'), (req, res) => {
  const { opleiding_id } = req.params;
  db.query(
    'SELECT competentie_id AS id, naam, omschrijving, gewicht FROM competentie WHERE opleiding_id = ? AND is_actief = TRUE ORDER BY naam ASC',
    [opleiding_id],
    (err, competenties) => {
      if (err) return res.status(500).json({ error: err.message });
      if (competenties.length === 0) return res.json([]);
      const ids = competenties.map(c => c.id);
      db.query(
        'SELECT competentie_id, punt, beschrijving FROM competentie_rubriek WHERE competentie_id IN (?) ORDER BY punt DESC',
        [ids],
        (err2, rubrieken) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json(competenties.map(c => ({
            ...c,
            rubrieken: rubrieken.filter(r => r.competentie_id === c.id)
          })));
        }
      );
    }
  );
});

// Nieuwe competentie aanmaken (met duplicate check)
app.post('/api/competenties', verifyToken, requireRol('admin'), (req, res) => {
  const { naam, omschrijving, gewicht, opleiding_id } = req.body;

  if (!naam || !opleiding_id) {
    res.status(400).json({ error: 'Naam en opleiding_id zijn verplicht.' });
    return;
  }

  // Controleer op dubbele naam binnen dezelfde opleiding (enkel actieve)
  db.query(
    'SELECT competentie_id FROM competentie WHERE LOWER(naam) = LOWER(?) AND opleiding_id = ? AND is_actief = TRUE',
    [naam.trim(), opleiding_id],
    (errCheck, bestaande) => {
      if (errCheck) {
        res.status(500).json({ error: errCheck.message });
        return;
      }
      if (bestaande.length > 0) {
        res.status(409).json({ error: 'Een competentie met deze naam bestaat al.' });
        return;
      }

      db.query(
        'INSERT INTO competentie (naam, omschrijving, gewicht, opleiding_id) VALUES (?, ?, ?, ?)',
        [naam.trim(), omschrijving, gewicht, opleiding_id],
        (err, results) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ message: 'Competentie aangemaakt!', id: results.insertId });
        }
      );
    }
  );
});

// Competentie bewerken (met duplicate check)
app.put('/api/competenties/:id', verifyToken, requireRol('admin'), (req, res) => {
  const { id } = req.params;
  const { naam, omschrijving, gewicht } = req.body;

  if (!naam) {
    res.status(400).json({ error: 'Naam is verplicht.' });
    return;
  }

  // Haal opleiding_id op van de huidige competentie
  db.query(
    'SELECT opleiding_id FROM competentie WHERE competentie_id = ?',
    [id],
    (errGet, rows) => {
      if (errGet) {
        res.status(500).json({ error: errGet.message });
        return;
      }
      if (rows.length === 0) {
        res.status(404).json({ error: 'Competentie niet gevonden.' });
        return;
      }
      const { opleiding_id } = rows[0];

      // Controleer op dubbele naam (andere competenties in dezelfde opleiding)
      db.query(
        'SELECT competentie_id FROM competentie WHERE LOWER(naam) = LOWER(?) AND opleiding_id = ? AND is_actief = TRUE AND competentie_id != ?',
        [naam.trim(), opleiding_id, id],
        (errCheck, bestaande) => {
          if (errCheck) {
            res.status(500).json({ error: errCheck.message });
            return;
          }
          if (bestaande.length > 0) {
            res.status(409).json({ error: 'Een competentie met deze naam bestaat al.' });
            return;
          }

          db.query(
            'UPDATE competentie SET naam = ?, omschrijving = ?, gewicht = ? WHERE competentie_id = ?',
            [naam.trim(), omschrijving, gewicht, id],
            (err, results) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }
              if (results.affectedRows === 0) {
                res.status(404).json({ error: 'Competentie niet gevonden.' });
                return;
              }
              res.json({ message: 'Competentie bijgewerkt!' });
            }
          );
        }
      );
    }
  );
});

// Competentie deactiveren (soft delete via is_actief = FALSE)
app.delete('/api/competenties/:id', verifyToken, requireRol('admin'), (req, res) => {
  const { id } = req.params;

  db.query(
    'UPDATE competentie SET is_actief = FALSE WHERE competentie_id = ?',
    [id],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Competentie niet gevonden.' });
        return;
      }
      res.json({ message: 'Competentie gedeactiveerd.' });
    }
  );
});

// Rubrieken (score-beschrijvingen) voor een competentie opslaan (vervangt bestaande)
app.put('/api/competenties/:id/rubrieken', verifyToken, requireRol('admin'), (req, res) => {
  const { id } = req.params;
  const { rubrieken } = req.body;
  db.query('DELETE FROM competentie_rubriek WHERE competentie_id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    const inserts = (rubrieken || []).filter(r => r.beschrijving && r.beschrijving.trim());
    if (inserts.length === 0) return res.json({ ok: true });
    const values = inserts.map(r => [id, r.punt, r.beschrijving.trim()]);
    db.query(
      'INSERT INTO competentie_rubriek (competentie_id, punt, beschrijving) VALUES ?',
      [values],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ ok: true });
      }
    );
  });
});

// ============================================================
// DOCENTEN
// ============================================================

// Alle stages toegewezen aan de ingelogde docent
app.get('/api/docenten/mijn-studenten', verifyToken, (req, res) => {
  const gebruiker_id = req.gebruiker.id;

  db.query(
    'SELECT docent_id FROM docent WHERE gebruiker_id = ?',
    [gebruiker_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ error: 'Geen docent-profiel gevonden' });

      const docent_id = rows[0].docent_id;

      db.query(`
        SELECT
          s.stage_id,
          g.voornaam,
          g.naam AS student_naam,
          st.studentnummer,
          st.opleiding,
          b.naam AS bedrijf,
          s.stagetitel,
          s.startdatum,
          s.einddatum,
          s.status,
          (
            SELECT l.week_nummer
            FROM logboek l
            WHERE l.stage_id = s.stage_id
            ORDER BY l.week_nummer DESC
            LIMIT 1
          ) AS laatste_week,
          (
            SELECT l.status
            FROM logboek l
            WHERE l.stage_id = s.stage_id
            ORDER BY l.week_nummer DESC
            LIMIT 1
          ) AS logboek_status
        FROM stage s
        JOIN student st ON s.student_id = st.student_id
        JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
        JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
        WHERE s.docent_id = ?
        ORDER BY g.naam ASC
      `, [docent_id], (err2, results) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json(results);
      });
    }
  );
});

// Alle logboeken van studenten van de ingelogde docent
app.get('/api/docenten/mijn-logboeken', verifyToken, (req, res) => {
  const gebruiker_id = req.gebruiker.id;

  db.query(
    'SELECT docent_id FROM docent WHERE gebruiker_id = ?',
    [gebruiker_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ error: 'Geen docent-profiel gevonden' });

      const docent_id = rows[0].docent_id;

      db.query(`
        SELECT
          l.logboek_id,
          l.week_nummer,
          l.activiteiten,
          l.reflectie,
          l.leerpunten,
          l.uren,
          l.status,
          l.ingediend_op,
          g.voornaam,
          g.naam AS student_naam,
          st.studentnummer,
          s.stage_id,
          b.naam AS bedrijf
        FROM logboek l
        JOIN stage s ON l.stage_id = s.stage_id
        JOIN student st ON l.student_id = st.student_id
        JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
        JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
        WHERE s.docent_id = ?
        ORDER BY g.naam ASC, l.week_nummer DESC
      `, [docent_id], (err2, results) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json(results);
      });
    }
  );
});

// Alle evaluaties van studenten van de ingelogde docent
app.get('/api/docenten/mijn-evaluaties', verifyToken, (req, res) => {
  const gebruiker_id = req.gebruiker.id;

  db.query(
    'SELECT docent_id FROM docent WHERE gebruiker_id = ?',
    [gebruiker_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ error: 'Geen docent-profiel gevonden' });

      const docent_id = rows[0].docent_id;

      db.query(`
        SELECT
          e.evaluatie_id,
          e.type,
          e.totaalscore,
          e.opmerking,
          e.ingevuld_op,
          g_beoordelaar.voornaam AS beoordelaar_voornaam,
          g_beoordelaar.naam AS beoordelaar_naam,
          g_beoordelaar.rol AS beoordelaar_rol,
          g_student.voornaam AS student_voornaam,
          g_student.naam AS student_naam,
          b.naam AS bedrijf,
          se.stage_id
        FROM evaluatie e
        JOIN gebruiker g_beoordelaar ON e.beoordelaar_id = g_beoordelaar.gebruiker_id
        JOIN student_evaluatie se ON e.evaluatie_id = se.evaluatie_id
        JOIN student st ON se.student_id = st.student_id
        JOIN gebruiker g_student ON st.gebruiker_id = g_student.gebruiker_id
        JOIN stage s ON se.stage_id = s.stage_id
        JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
        WHERE s.docent_id = ?
        ORDER BY g_student.naam ASC, e.ingevuld_op DESC
      `, [docent_id], (err2, results) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json(results);
      });
    }
  );
});

// ============================================================
// MENTOR STAGIAIRS
// ============================================================

// Hulpfunctie: zet gebruiker_id om naar mentor_id
function getMentorId(gebruiker_id, cb) {
  db.query('SELECT mentor_id FROM mentor WHERE gebruiker_id = ?', [gebruiker_id], (err, rows) => {
    if (err) return cb(err, null);
    if (rows.length === 0) return cb(new Error('Geen mentor-profiel gevonden'), null);
    cb(null, rows[0].mentor_id);
  });
}

// Alle stagiairs van een specifieke mentor ophalen
app.get('/api/mentors/:id/stagiairs', verifyToken, requireRol('mentor', 'admin', 'docent'), (req, res) => {
  getMentorId(req.params.id, (err, mentor_id) => {
    if (err) return res.status(404).json({ error: err.message });
    db.query(`
      SELECT
        s.stage_id,
        g.voornaam,
        g.naam AS student_naam,
        st.studentnummer,
        st.opleiding,
        b.naam AS bedrijf,
        s.startdatum,
        s.einddatum,
        s.status,
        (
          SELECT l.status
          FROM logboek l
          WHERE l.stage_id = s.stage_id
          ORDER BY l.week_nummer DESC
          LIMIT 1
        ) AS logboek_status,
        (
          SELECT l.week_nummer
          FROM logboek l
          WHERE l.stage_id = s.stage_id
          ORDER BY l.week_nummer DESC
          LIMIT 1
        ) AS laatste_week
      FROM stage s
      JOIN student st ON s.student_id = st.student_id
      JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
      JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
      WHERE s.mentor_id = ?
      ORDER BY g.naam ASC
    `, [mentor_id], (err2, results) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(results);
    });
  });
});

// ============================================================
// MENTOR LOGBOEKEN
// ============================================================

// Logboeken ophalen van alle stagiairs van een mentor
app.get('/api/mentors/:id/logboeken', verifyToken, requireRol('mentor', 'docent', 'admin'), (req, res) => {
  getMentorId(req.params.id, (err, mentor_id) => {
    if (err) return res.status(404).json({ error: err.message });
    db.query(`
      SELECT
        l.logboek_id,
        l.week_nummer,
        l.activiteiten,
        l.reflectie,
        l.leerpunten,
        l.uren,
        l.status,
        l.ingediend_op,
        g.voornaam,
        g.naam AS student_naam,
        s.stage_id,
        b.naam AS bedrijf
      FROM logboek l
      JOIN stage s ON l.stage_id = s.stage_id
      JOIN student st ON l.student_id = st.student_id
      JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
      JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
      WHERE s.mentor_id = ?
      ORDER BY g.naam ASC, l.week_nummer DESC
    `, [mentor_id], (err2, results) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(results);
    });
  });
});

// Logboek aftekenen als gelezen door mentor
app.put('/api/logboeken/:id/aftekenen', verifyToken, requireRol('mentor', 'docent', 'admin'), (req, res) => {
  const { id } = req.params;
  db.query(
    `UPDATE logboek SET status = 'goedgekeurd' WHERE logboek_id = ?`,
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Logboek niet gevonden' });
      }
      db.query(`
        SELECT st.gebruiker_id, l.week_nummer
        FROM logboek l
        JOIN student st ON l.student_id = st.student_id
        WHERE l.logboek_id = ?
      `, [id], (err2, rows) => {
        if (err2 || rows.length === 0) {
          return res.json({ message: 'Logboek afgetekend!' });
        }
        db.query(
          `INSERT INTO notificatie (gebruiker_id, bericht) VALUES (?, ?)`,
          [rows[0].gebruiker_id, `Mentor heeft logboek week ${rows[0].week_nummer} bevestigd`],
          () => res.json({ message: 'Logboek afgetekend en student verwittigd!' })
        );
      });
    }
  );
});

// ============================================================
// MENTOR EVALUATIES
// ============================================================

// Evaluaties van de stagiairs van een mentor (type = mentor)
app.get('/api/mentors/:id/evaluaties', verifyToken, requireRol('mentor', 'admin', 'docent'), (req, res) => {
  getMentorId(req.params.id, (err, mentor_id) => {
    if (err) return res.status(404).json({ error: err.message });
    db.query(`
      SELECT
        e.evaluatie_id,
        e.type,
        e.fase,
        e.totaalscore,
        e.opmerking,
        e.ingevuld_op,
        g_student.voornaam,
        g_student.naam AS student_naam,
        b.naam AS bedrijf,
        se.stage_id
      FROM evaluatie e
      JOIN student_evaluatie se ON e.evaluatie_id = se.evaluatie_id
      JOIN student st ON se.student_id = st.student_id
      JOIN gebruiker g_student ON st.gebruiker_id = g_student.gebruiker_id
      JOIN stage s ON se.stage_id = s.stage_id
      JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
      WHERE s.mentor_id = ? AND e.type = 'mentor'
      ORDER BY g_student.naam ASC
    `, [mentor_id], (err2, results) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(results);
    });
  });
});

// (Oude /criteria/:criterium_id/mentor route verwijderd — mentorscores lopen nu
//  via PUT /api/evaluaties/:id/competentie/:competentie_id.)

// Evaluatie totaalscore en opmerking bijwerken
app.put('/api/evaluaties/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { totaalscore, opmerking } = req.body;
  db.query(
    `UPDATE evaluatie SET totaalscore = ?, opmerking = ? WHERE evaluatie_id = ?`,
    [totaalscore, opmerking, id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.affectedRows === 0) return res.status(404).json({ error: 'Evaluatie niet gevonden' });
      res.json({ message: 'Evaluatie bijgewerkt!' });
    }
  );
});

// ============================================================
// TUSSENTIJDSE EVALUATIE
// ============================================================

// Nieuwe tussentijdse evaluatie aanmaken voor een student
app.post('/api/evaluaties/tussentijds', verifyToken, requireRol('mentor', 'docent', 'admin'), (req, res) => {
  const { stage_id, student_id, beoordelaar_id, opmerking } = req.body;

  db.query(`
    INSERT INTO evaluatie (beoordelaar_id, type, opmerking)
    VALUES (?, 'tussentijds', ?)
  `, [beoordelaar_id, opmerking || null], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const evaluatie_id = results.insertId;

    db.query(`
      INSERT INTO student_evaluatie (student_id, evaluatie_id, stage_id)
      VALUES (?, ?, ?)
    `, [student_id, evaluatie_id, stage_id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Notificatie sturen naar student
      db.query(`
        SELECT gebruiker_id FROM student WHERE student_id = ?
      `, [student_id], (err3, rows) => {
        if (err3 || rows.length === 0) {
          return res.json({ message: 'Tussentijdse evaluatie aangemaakt!', id: evaluatie_id });
        }

        db.query(`
          INSERT INTO notificatie (gebruiker_id, bericht)
          VALUES (?, ?)
        `, [rows[0].gebruiker_id, 'Je mentor heeft een tussentijdse evaluatie ingevuld. Bekijk je evaluaties.'], () => {
          res.json({ message: 'Tussentijdse evaluatie aangemaakt en student verwittigd!', id: evaluatie_id });
        });
      });
    });
  });
});

// ============================================================
// FINALE BEOORDELING
// ============================================================

// Finale beoordeling definitief indienen en vergrendelen
app.put('/api/evaluaties/:id/indienen', verifyToken, (req, res) => {
  const rol = req.gebruiker.rol;
  if (!['mentor', 'docent', 'admin', 'student'].includes(rol)) {
    return res.status(403).json({ error: 'Geen toegang.' });
  }
  const { id } = req.params;

  // Controleer of al ingediend
  db.query(`
    SELECT ingediend FROM evaluatie WHERE evaluatie_id = ?
  `, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Evaluatie niet gevonden' });
    if (results[0].ingediend) return res.status(400).json({ error: 'Evaluatie is al ingediend en kan niet meer aangepast worden' });

    // Controleer dat alle competenties van de opleiding een score hebben.
    db.query(`
      SELECT
        (SELECT COUNT(*) FROM competentie c
           JOIN student_evaluatie se ON se.evaluatie_id = ?
           JOIN student st ON se.student_id = st.student_id
          WHERE c.opleiding_id = st.opleiding_id AND c.is_actief = TRUE) AS totaal,
        (SELECT COUNT(*) FROM evaluatie_score es
          WHERE es.evaluatie_id = ? AND es.score IS NOT NULL) AS ingevuld
    `, [id, id], (errCheck, telRows) => {
      if (errCheck) return res.status(500).json({ error: errCheck.message });
      const { totaal, ingevuld } = telRows[0];
      if (totaal === 0 || ingevuld < totaal) {
        return res.status(400).json({ error: 'Vul eerst alle competenties in voor je de evaluatie indient.' });
      }

      // Vergrendelen
      db.query(`
        UPDATE evaluatie
        SET ingediend = 1,
            ingediend_op = NOW()
        WHERE evaluatie_id = ?
      `, [id], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

      // Notificatie naar student en docent
      db.query(`
        SELECT
          st.gebruiker_id AS student_gebruiker_id,
          d.gebruiker_id AS docent_gebruiker_id
        FROM student_evaluatie se
        JOIN student st ON se.student_id = st.student_id
        JOIN stage s ON se.stage_id = s.stage_id
        LEFT JOIN docent d ON s.docent_id = d.docent_id
        WHERE se.evaluatie_id = ?
      `, [id], (err3, rows) => {
        if (err3 || rows.length === 0) {
          return res.json({ message: 'Finale beoordeling ingediend!' });
        }

        const notificaties = [
          [rows[0].student_gebruiker_id, 'Je mentor heeft de finale beoordeling ingediend. Bekijk je evaluaties.'],
        ];

        if (rows[0].docent_gebruiker_id) {
          notificaties.push([rows[0].docent_gebruiker_id, 'Een mentor heeft een finale beoordeling ingediend voor een van uw studenten.']);
        }

        let teller = 0;
        notificaties.forEach(([gebruiker_id, bericht]) => {
          db.query(`
            INSERT INTO notificatie (gebruiker_id, bericht)
            VALUES (?, ?)
          `, [gebruiker_id, bericht], () => {
            teller++;
            if (teller === notificaties.length) {
              res.json({ message: 'Finale beoordeling ingediend en betrokkenen verwittigd!' });
            }
          });
        });
      });
      });
    });
  });
});

// ============================================================
// PROBLEEMMELDINGEN
// ============================================================

// Nieuwe probleemmelding indienen
app.post('/api/probleemmeldingen', verifyToken, requireRol('mentor', 'admin'), (req, res) => {
  const { mentor_id, stage_id, titel, beschrijving } = req.body;

  // Controleer of mentor deze stage begeleidt
  db.query(`
    SELECT stage_id FROM stage WHERE stage_id = ? AND mentor_id = ?
  `, [stage_id, mentor_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(403).json({ error: 'Je kan enkel problemen melden voor stagiairs die je begeleidt' });
    }

    db.query(`
      INSERT INTO probleemmelding (mentor_id, stage_id, titel, beschrijving)
      VALUES (?, ?, ?, ?)
    `, [mentor_id, stage_id, titel, beschrijving], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Notificatie sturen naar docent en commissie
      db.query(`
        SELECT
          d.gebruiker_id AS docent_gebruiker_id,
          g.voornaam AS mentor_voornaam,
          g.naam AS mentor_naam
        FROM stage s
        JOIN docent d ON s.docent_id = d.docent_id
        JOIN mentor m ON s.mentor_id = m.mentor_id
        JOIN gebruiker g ON m.gebruiker_id = g.gebruiker_id
        WHERE s.stage_id = ?
      `, [stage_id], (err3, rows) => {
        if (err3 || rows.length === 0) {
          return res.json({ message: 'Probleemmelding ingediend!', id: result.insertId });
        }

        const bericht = `Nieuwe probleemmelding van mentor ${rows[0].mentor_voornaam} ${rows[0].mentor_naam}: "${titel}"`;

        db.query(`
          INSERT INTO notificatie (gebruiker_id, bericht)
          VALUES (?, ?)
        `, [rows[0].docent_gebruiker_id, bericht], () => {
          res.json({ message: 'Probleemmelding ingediend en docent verwittigd!', id: result.insertId });
        });
      });
    });
  });
});

// Alle probleemmeldingen ophalen voor docent en commissie
app.get('/api/probleemmeldingen', verifyToken, requireRol('docent', 'commissie', 'admin'), (req, res) => {
  db.query(`
    SELECT
      p.melding_id,
      p.titel,
      p.beschrijving,
      p.status,
      p.aangemaakt_op,
      g.voornaam AS mentor_voornaam,
      g.naam AS mentor_naam,
      gs.voornaam AS student_voornaam,
      gs.naam AS student_naam,
      b.naam AS bedrijf
    FROM probleemmelding p
    JOIN mentor m ON p.mentor_id = m.mentor_id
    JOIN gebruiker g ON m.gebruiker_id = g.gebruiker_id
    JOIN stage s ON p.stage_id = s.stage_id
    JOIN student st ON s.student_id = st.student_id
    JOIN gebruiker gs ON st.gebruiker_id = gs.gebruiker_id
    JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
    ORDER BY p.aangemaakt_op DESC
  `, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Probleemmeldingen van een specifieke mentor ophalen
app.get('/api/mentors/:id/probleemmeldingen', verifyToken, requireRol('mentor', 'admin'), (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT
      p.melding_id,
      p.titel,
      p.beschrijving,
      p.status,
      p.aangemaakt_op,
      gs.voornaam AS student_voornaam,
      gs.naam AS student_naam,
      b.naam AS bedrijf
    FROM probleemmelding p
    JOIN stage s ON p.stage_id = s.stage_id
    JOIN student st ON s.student_id = st.student_id
    JOIN gebruiker gs ON st.gebruiker_id = gs.gebruiker_id
    JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
    WHERE p.mentor_id = ?
    ORDER BY p.aangemaakt_op DESC
  `, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ============================================================
// DOCENT STUDENTEN
// ============================================================

// Alle studenten van een docent ophalen
app.get('/api/docent/studenten', verifyToken, requireRol('docent', 'admin'), (req, res) => {
  const gebruiker_id = req.gebruiker.id;

  db.query(`
    SELECT d.docent_id FROM docent d WHERE d.gebruiker_id = ?
  `, [gebruiker_id], (err, docentRows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (docentRows.length === 0) return res.status(403).json({ error: 'Geen docent account' });

    const docent_id = docentRows[0].docent_id;

    db.query(`
      SELECT
        s.stage_id,
        g.voornaam,
        g.naam,
        st.studentnummer,
        b.naam AS bedrijf,
        b.adres AS bedrijf_adres,
        gm.voornaam AS mentor_voornaam,
        gm.naam AS mentor_naam,
        gm.email AS mentor_email,
        s.startdatum,
        s.einddatum,
        s.status,
        (
          SELECT l.status
          FROM logboek l
          WHERE l.stage_id = s.stage_id
          ORDER BY l.week_nummer DESC
          LIMIT 1
        ) AS logboek_status
      FROM stage s
      JOIN student st ON s.student_id = st.student_id
      JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
      JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
      JOIN mentor m ON s.mentor_id = m.mentor_id
      JOIN gebruiker gm ON m.gebruiker_id = gm.gebruiker_id
      WHERE s.docent_id = ?
      ORDER BY g.naam ASC
    `, [docent_id], (err2, results) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(results);
    });
  });
});

// ============================================================
// DOCENT EVALUATIE
// ============================================================

// (Oude /criteria/:criterium_id/docent route verwijderd — docentscores lopen nu
//  via PUT /api/evaluaties/:id/competentie/:competentie_id.)

// (Oude docent-only /:id/totaalscore route verwijderd — werd niet meer gebruikt;
//  de mentor slaat zijn totaalscore rechtstreeks op via PUT /api/evaluaties/:id.)

// ============================================================
// MENTOR EVALUATIES
// ============================================================

// Evaluaties ophalen van een specifieke stage voor mentor
app.get('/api/mentors/:id/evaluaties', verifyToken, requireRol('mentor', 'docent', 'admin'), (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT
      e.evaluatie_id,
      e.type,
      e.totaalscore,
      e.opmerking,
      e.ingevuld_op,
      g.voornaam,
      g.naam AS student_naam,
      st.studentnummer,
      st.opleiding,
      s.stage_id,
      b.naam AS bedrijf
    FROM evaluatie e
    JOIN student_evaluatie se ON e.evaluatie_id = se.evaluatie_id
    JOIN student st ON se.student_id = st.student_id
    JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
    JOIN stage s ON se.stage_id = s.stage_id
    JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
    WHERE s.mentor_id = ?
    ORDER BY e.ingevuld_op DESC
  `, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// (Tweede oude /criteria/:criterium_id/mentor route verwijderd — mentorscores
//  lopen nu via PUT /api/evaluaties/:id/competentie/:competentie_id.)

// ============================================================
// EXTRA STAGE- EN CONTRACTROUTES
// ============================================================

// Contract aanmaken na goedkeuring
app.post('/api/contracten/:stage_id', verifyToken, (req, res) => {
  const { stage_id } = req.params;

  // Controleer of stage bestaat en goedgekeurd is
  db.query('SELECT * FROM stage WHERE stage_id = ?', [stage_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Stage niet gevonden' });

    if (results[0].status !== 'goedgekeurd') {
      return res.status(400).json({ error: 'Stage moet eerst goedgekeurd zijn' });
    }

    // Contract aanmaken
    db.query(`
      INSERT INTO stagecontract (stage_id, getekend_student, getekend_mentor, getekend_docent)
      VALUES (?, FALSE, FALSE, FALSE)
    `, [stage_id], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: 'Contract aangemaakt!', id: result.insertId });
    });
  });
});
// Bedrijf updaten (voor aanpassing-flow)
app.put('/api/bedrijven/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { naam, straatnaam, huisnummer, postcode, gemeente, sector, contact_email, contact_telefoonnummer } = req.body;
  db.query(
    `UPDATE bedrijf SET naam=?, straatnaam=?, huisnummer=?, postcode=?, gemeente=?, sector=?, contact_email=?, contact_telefoonnummer=? WHERE bedrijf_id=?`,
    [naam, straatnaam, huisnummer, postcode, gemeente, sector, contact_email, contact_telefoonnummer, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Bedrijf niet gevonden' });
      res.json({ message: 'Bedrijf bijgewerkt!' });
    }
  );
});

// Mentor updaten: werkt zowel de gebruiker-rij (naam/email/tel) als het mentor-record (functie) bij.
app.put('/api/mentors/:id', verifyToken, (req, res) => {
  const { id } = req.params; // mentor_id
  const { voornaam, naam, email, telefoonnummer, functietitel, gebruiker_id } = req.body;
  db.query(
    `UPDATE gebruiker SET voornaam=?, naam=?, email=?, telefoonnummer=? WHERE gebruiker_id=?`,
    [voornaam, naam, email, telefoonnummer, gebruiker_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query(
        `UPDATE mentor SET functietitel=? WHERE mentor_id=?`,
        [functietitel, id],
        (err2, result2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ message: 'Mentor bijgewerkt!' });
        }
      );
    }
  );
});

// Stage volledig bewerken
// Stage volledig bewerken (incl. status terugzetten bij aanpassing)
app.put('/api/stages/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { stagetitel, beschrijving, startdatum, einddatum, bedrijf_id, mentor_id, docent_id, status } = req.body;

  db.query('SELECT * FROM stage WHERE stage_id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Stage niet gevonden' });

    const nieuweStatus = status || results[0].status;

    db.query(`
      UPDATE stage 
      SET stagetitel = ?, beschrijving = ?, startdatum = ?, einddatum = ?, 
          bedrijf_id = ?, mentor_id = ?, docent_id = ?, status = ?
      WHERE stage_id = ?
    `, [stagetitel, beschrijving, startdatum, einddatum, bedrijf_id, mentor_id, docent_id, nieuweStatus, id],
    (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: 'Stage bijgewerkt!' });
    });
  });
});
// ============================================================
// ROUTERMODULES
// ============================================================
app.use('/api/stage', require('./routes/stage'));
app.use('/api/begeleider', require('./routes/begeleider'));

// ============================================================
// LOGBOEK — STUDENT
// ============================================================

// Haal logboek op voor een specifieke week; maakt het aan als het nog niet bestaat.
app.get('/api/mijn-logboek/week/:week', verifyToken, (req, res) => {
  const gebruiker_id = req.gebruiker.id;
  const week = parseInt(req.params.week);
  if (isNaN(week) || week < 1) return res.status(400).json({ error: 'Ongeldig weeknummer' });

  db.query('SELECT student_id FROM student WHERE gebruiker_id = ?', [gebruiker_id], (err, sRows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (sRows.length === 0) return res.status(403).json({ error: 'Geen student-account' });
    const student_id = sRows[0].student_id;

    db.query(
      `SELECT stage_id FROM stage WHERE student_id = ? AND status IN ('goedgekeurd','bezig') ORDER BY ingediend_op DESC LIMIT 1`,
      [student_id],
      (err2, stageRows) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (stageRows.length === 0) return res.status(404).json({ error: 'Geen actieve stage' });
        const stage_id = stageRows[0].stage_id;

        db.query(
          'SELECT * FROM logboek WHERE student_id = ? AND stage_id = ? AND week_nummer = ?',
          [student_id, stage_id, week],
          (err3, logRows) => {
            if (err3) return res.status(500).json({ error: err3.message });

            const stuurResponse = (logboek) => {
              db.query(
                `SELECT * FROM logboek_dag WHERE logboek_id = ?
                 ORDER BY FIELD(dag,'maandag','dinsdag','woensdag','donderdag','vrijdag')`,
                [logboek.logboek_id],
                (err4, dagRows) => {
                  if (err4) return res.status(500).json({ error: err4.message });
                  res.json({ logboek, dagen: dagRows });
                }
              );
            };

            if (logRows.length > 0) {
              stuurResponse(logRows[0]);
            } else {
              db.query(
                `INSERT INTO logboek (student_id, stage_id, week_nummer, status) VALUES (?, ?, ?, 'draft')`,
                [student_id, stage_id, week],
                (err4, insertResult) => {
                  if (err4) return res.status(500).json({ error: err4.message });
                  db.query('SELECT * FROM logboek WHERE logboek_id = ?', [insertResult.insertId], (err5, newRows) => {
                    if (err5) return res.status(500).json({ error: err5.message });
                    stuurResponse(newRows[0]);
                  });
                }
              );
            }
          }
        );
      }
    );
  });
});

// Sla dagelijkse invoer op (upsert via check-then-insert/update).
app.put('/api/logboeken/:id/dag', verifyToken, (req, res) => {
  const { id } = req.params;
  const { dag, activiteiten, reflectie, leerpunten } = req.body;
  const dagOpties = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'];
  if (!dagOpties.includes(dag)) return res.status(400).json({ error: 'Ongeldige dag' });

  db.query('SELECT dag_id FROM logboek_dag WHERE logboek_id = ? AND dag = ?', [id, dag], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length > 0) {
      db.query(
        'UPDATE logboek_dag SET activiteiten=?, reflectie=?, leerpunten=? WHERE dag_id=?',
        [activiteiten, reflectie, leerpunten, rows[0].dag_id],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ message: 'Dag bijgewerkt!' });
        }
      );
    } else {
      db.query(
        'INSERT INTO logboek_dag (logboek_id, dag, activiteiten, reflectie, leerpunten) VALUES (?, ?, ?, ?, ?)',
        [id, dag, activiteiten, reflectie, leerpunten],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ message: 'Dag opgeslagen!' });
        }
      );
    }
  });
});

// Week indienen bij mentor.
app.put('/api/logboeken/:id/indienen', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(
    `UPDATE logboek SET status = 'ingediend', ingediend_op = NOW() WHERE logboek_id = ?`,
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Logboek ingediend!' });
    }
  );
});

// Haal feedback op voor een logboek.
app.get('/api/logboeken/:id/feedback', verifyToken, (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT lf.feedback_id, lf.opmerking, lf.created_at, g.voornaam, g.naam AS auteur
     FROM logboek_feedback lf
     JOIN gebruiker g ON lf.gebruiker_id = g.gebruiker_id
     WHERE lf.logboek_id = ?
     ORDER BY lf.created_at ASC`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ============================================================
// LOGBOEK — MENTOR
// ============================================================

// Alle ingediende/goedgekeurde logboeken voor de ingelogde mentor
app.get('/api/mentor/logboeken', verifyToken, (req, res) => {
  const gebruiker_id = req.gebruiker.id;
  db.query('SELECT mentor_id FROM mentor WHERE gebruiker_id = ?', [gebruiker_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(403).json({ error: 'Geen mentor-account' });
    const mentor_id = rows[0].mentor_id;

    db.query(`
      SELECT
        l.logboek_id,
        l.week_nummer,
        l.status,
        l.ingediend_op,
        g.voornaam AS student_voornaam,
        g.naam AS student_naam,
        b.naam AS bedrijf,
        s.stage_id,
        s.startdatum
      FROM logboek l
      JOIN stage s ON l.stage_id = s.stage_id
      JOIN student st ON s.student_id = st.student_id
      JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
      JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
      WHERE s.mentor_id = ? AND l.status IN ('ingediend', 'goedgekeurd')
      ORDER BY l.status ASC, l.ingediend_op DESC
    `, [mentor_id], (err2, results) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(results);
    });
  });
});

// Volledig logboek ophalen (logboek + dagen + feedback) — voor mentor en docent
app.get('/api/logboeken/:id/volledig', verifyToken, (req, res) => {
  const { id } = req.params;

  db.query(`
    SELECT
      l.logboek_id, l.week_nummer, l.status, l.ingediend_op,
      g.voornaam AS student_voornaam,
      g.naam AS student_naam,
      b.naam AS bedrijf,
      s.stage_id, s.startdatum, s.einddatum
    FROM logboek l
    JOIN student st ON l.student_id = st.student_id
    JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
    JOIN stage s ON l.stage_id = s.stage_id
    JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
    WHERE l.logboek_id = ?
  `, [id], (err, logboekRows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (logboekRows.length === 0) return res.status(404).json({ error: 'Logboek niet gevonden' });

    const logboek = logboekRows[0];

    db.query(
      `SELECT * FROM logboek_dag WHERE logboek_id = ?
       ORDER BY FIELD(dag,'maandag','dinsdag','woensdag','donderdag','vrijdag')`,
      [id],
      (err2, dagRows) => {
        if (err2) return res.status(500).json({ error: err2.message });

        db.query(
          `SELECT lf.feedback_id, lf.opmerking, lf.created_at, g.voornaam, g.naam AS auteur, g.rol
           FROM logboek_feedback lf
           JOIN gebruiker g ON lf.gebruiker_id = g.gebruiker_id
           WHERE lf.logboek_id = ?
           ORDER BY lf.created_at ASC`,
          [id],
          (err3, feedbackRows) => {
            if (err3) return res.status(500).json({ error: err3.message });
            res.json({ logboek, dagen: dagRows, feedback: feedbackRows });
          }
        );
      }
    );
  });
});

// Logboek bevestigen door mentor (status → goedgekeurd + optionele feedback)
app.put('/api/logboeken/:id/bevestigen', verifyToken, (req, res) => {
  const { id } = req.params;
  const { feedback } = req.body;
  const gebruiker_id = req.gebruiker.id;

  db.query(
    `UPDATE logboek SET status = 'goedgekeurd' WHERE logboek_id = ?`,
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      if (feedback && feedback.trim()) {
        db.query(
          'INSERT INTO logboek_feedback (logboek_id, gebruiker_id, opmerking) VALUES (?, ?, ?)',
          [id, gebruiker_id, feedback.trim()],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: 'Logboek bevestigd en feedback opgeslagen!' });
          }
        );
      } else {
        res.json({ message: 'Logboek bevestigd!' });
      }
    }
  );
});

// ============================================================
// LOGBOEK — DOCENT OVERZICHT
// ============================================================

// Overzicht van studenten + logboekstatus voor de ingelogde docent
app.get('/api/docent/logboeken', verifyToken, (req, res) => {
  const gebruiker_id = req.gebruiker.id;

  db.query('SELECT docent_id FROM docent WHERE gebruiker_id = ?', [gebruiker_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(403).json({ error: 'Geen docent-account' });
    const docent_id = rows[0].docent_id;

    db.query(`
      SELECT
        s.stage_id,
        g.voornaam AS student_voornaam,
        g.naam AS student_naam,
        st_rec.opleiding,
        b.naam AS bedrijf,
        s.startdatum,
        s.einddatum,
        COALESCE(COUNT(l.logboek_id), 0) AS totaal_weken,
        COALESCE(SUM(CASE WHEN l.status = 'ingediend' THEN 1 ELSE 0 END), 0) AS weken_ingediend,
        COALESCE(SUM(CASE WHEN l.status = 'goedgekeurd' THEN 1 ELSE 0 END), 0) AS weken_bevestigd,
        MAX(l.week_nummer) AS laatste_week
      FROM stage s
      JOIN student st_rec ON s.student_id = st_rec.student_id
      JOIN gebruiker g ON st_rec.gebruiker_id = g.gebruiker_id
      JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
      LEFT JOIN logboek l ON l.stage_id = s.stage_id
      WHERE s.docent_id = ? AND s.status IN ('goedgekeurd', 'bezig', 'afgerond')
      GROUP BY s.stage_id, g.voornaam, g.naam, st_rec.opleiding, b.naam, s.startdatum, s.einddatum
      ORDER BY g.naam ASC
    `, [docent_id], (err2, results) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(results);
    });
  });
});

app.use('/api/aanvraag', require('./routes/aanvraag'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', verifyToken, require('./routes/studentdashboardroute'));

// ============================================================
// COMPETENTIESETS
// ============================================================

// Alle actieve competentiesets ophalen
app.get('/api/competentiesets', verifyToken, requireRol('admin'), (req, res) => {
  db.query(
    'SELECT * FROM competentieset WHERE is_actief = TRUE ORDER BY naam ASC',
    (err, sets) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (sets.length === 0) {
        res.json([]);
        return;
      }

      const setIds = sets.map(s => s.set_id);
      db.query(
        `SELECT c.*, cs.set_id
         FROM competentie c
         JOIN competentieset cs ON c.opleiding_id = cs.set_id
         WHERE cs.is_actief = TRUE AND c.is_actief = TRUE AND cs.set_id IN (?)`,
        [setIds],
        (errComp, competenties) => {
          if (errComp) {
            res.status(500).json({ error: errComp.message });
            return;
          }

          const result = sets.map(s => ({
            ...s,
            competenties: competenties
              .filter(c => c.set_id === s.set_id)
              .map(c => ({
                id:           c.competentie_id,
                naam:         c.naam,
                omschrijving: c.omschrijving,
                gewicht:      c.gewicht,
              })),
          }));

          res.json(result);
        }
      );
    }
  );
});

// Nieuwe competentieset aanmaken
app.post('/api/competentiesets', verifyToken, requireRol('admin'), (req, res) => {
  const { naam, opleiding, jaar } = req.body;

  if (!naam || !opleiding || !jaar) {
    res.status(400).json({ error: 'Naam, opleiding en jaar zijn verplicht.' });
    return;
  }

  db.query(
    'INSERT INTO competentieset (naam, opleiding, jaar) VALUES (?, ?, ?)',
    [naam.trim(), opleiding.trim(), jaar.trim()],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Competentieset aangemaakt!', id: results.insertId });
    }
  );
});

// Competentieset deactiveren (soft delete)
app.delete('/api/competentiesets/:id', verifyToken, requireRol('admin'), (req, res) => {
  const { id } = req.params;

  db.query(
    'UPDATE competentieset SET is_actief = FALSE WHERE set_id = ?',
    [id],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Competentieset niet gevonden.' });
        return;
      }
      res.json({ message: 'Competentieset gedeactiveerd.' });
    }
  );
});

// ============================================================
// SERVER STARTEN
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server draait op poort ${PORT}`);
});