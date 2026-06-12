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
    'SELECT bedrijf_id, naam, adres, sector, contact_email, contact_telefoonnummer FROM bedrijf WHERE bedrijf_id = ?',
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
  const { naam, adres, sector, contact_email, contact_telefoonnummer } = req.body;
  db.query(
    'INSERT INTO bedrijf (naam, adres, sector, contact_email, contact_telefoonnummer) VALUES (?, ?, ?, ?, ?)',
    [naam, adres, sector, contact_email, contact_telefoonnummer],
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

// Nieuwe mentor aanmaken (maakt eerst een gebruiker met rol 'mentor', dan het mentor-record)
// Tijdelijk wachtwoord 'mentor123' — vereenvoudiging; mentor wijzigt dit later zelf.
app.post('/api/mentors', verifyToken, async (req, res) => {
  const { voornaam, naam, email, telefoonnummer, functietitel, bedrijf_id } = req.body;

  try {
    const hash = await bcrypt.hash('mentor123', 10);

    db.query(
      'INSERT INTO gebruiker (voornaam, naam, email, telefoonnummer, wachtwoord_hash, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [voornaam, naam, email, telefoonnummer, hash, 'mentor'],
      (err, gebruikerResult) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        const gebruiker_id = gebruikerResult.insertId;

        db.query(
          'INSERT INTO mentor (gebruiker_id, bedrijf_id, functietitel) VALUES (?, ?, ?)',
          [gebruiker_id, bedrijf_id, functietitel],
          (err2, mentorResult) => {
            if (err2) {
              res.status(500).json({ error: err2.message });
              return;
            }
            res.json({ message: 'Mentor aangemaakt!', mentor_id: mentorResult.insertId });
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
      b.adres AS bedrijf_adres,
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
  db.query(`
    INSERT INTO stage (student_id, bedrijf_id, mentor_id, docent_id, stagetitel, beschrijving, startdatum, einddatum)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [student_id, bedrijf_id, mentor_id, docent_id, stagetitel, beschrijving, startdatum, einddatum],
  (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Stage aangemaakt!', id: results.insertId });
  });
});


app.get('/api/mijn-stage', verifyToken, (req, res) => {
  const gebruiker_id = req.gebruiker.id;
 
  // Eerst het student_id opzoeken bij deze ingelogde gebruiker
  db.query(
    'SELECT student_id FROM student WHERE gebruiker_id = ?',
    [gebruiker_id],
    (err, studentRows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (studentRows.length === 0) {
        // Ingelogde gebruiker is geen student
        res.status(403).json({ error: 'Geen student-account' });
        return;
      }
      const student_id = studentRows[0].student_id;
 
      // Meest recente stage van deze student ophalen, met bedrijf + laatste commissie-motivatie
      db.query(`
        SELECT
          s.stage_id,
          s.stagetitel,
          s.beschrijving,
          s.startdatum,
          s.einddatum,
          s.status,
          b.naam AS bedrijf,
          b.adres AS bedrijf_adres,
          b.sector AS bedrijf_sector,
          (
            SELECT cb.motivatie
            FROM commissie_beslissing cb
            WHERE cb.stage_id = s.stage_id
            ORDER BY cb.beslist_op DESC
            LIMIT 1
          ) AS commissie_motivatie
        FROM stage s
        JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
        WHERE s.student_id = ?
        ORDER BY s.ingediend_op DESC
        LIMIT 1
      `, [student_id], (err2, stageRows) => {
        if (err2) {
          res.status(500).json({ error: err2.message });
          return;
        }
        if (stageRows.length === 0) {
          // Student heeft nog geen stage → geen aanvraag, geen meldingen
          res.json({ stage: null, meldingen: [] });
          return;
        }
 
        const stage = stageRows[0];
 
        // Alle commissie-beslissingen van deze stage als meldingen, nieuw → oud
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
          res.json({
            message: 'Beslissing opgeslagen en status bijgewerkt!',
            beslissing_id: insertResult.insertId,
            nieuwe_status: waarde,
          });
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

// Één evaluatie ophalen met criteria en rubrieken
app.get('/api/evaluaties/:id', verifyToken, (req, res) => {
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

    // Haal criteria op
    db.query(`
      SELECT criterium_id, competentie, naam, score, gewicht, volgorde
      FROM evaluatie_criterium
      WHERE evaluatie_id = ?
      ORDER BY volgorde ASC
    `, [id], (err2, criteria) => {
      if (err2) {
        res.status(500).json({ error: err2.message });
        return;
      }

      // Haal rubrieken op per criterium
      const criteriaIds = criteria.map(c => c.criterium_id);
      if (criteriaIds.length === 0) {
        evaluatie.criteria = [];
        return res.json(evaluatie);
      }

      db.query(`
        SELECT rubriek_id, criterium_id, punt, beschrijving
        FROM rubriek
        WHERE criterium_id IN (?)
        ORDER BY punt ASC
      `, [criteriaIds], (err3, rubrieken) => {
        if (err3) {
          res.status(500).json({ error: err3.message });
          return;
        }

        // Rubrieken koppelen aan hun criterium
        evaluatie.criteria = criteria.map(c => ({
          ...c,
          rubrieken: rubrieken.filter(r => r.criterium_id === c.criterium_id)
        }));

        res.json(evaluatie);
      });
    });
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

// Score op een criterium updaten
app.put('/api/evaluaties/criteria/:criterium_id/score', verifyToken, (req, res) => {
  const { criterium_id } = req.params;
  const { score } = req.body;
  db.query(`
    UPDATE evaluatie_criterium SET score = ? WHERE criterium_id = ?
  `, [score, criterium_id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Criterium niet gevonden' });
      return;
    }
    res.json({ message: 'Score bijgewerkt!' });
  });
});

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
  db.query(`
    INSERT INTO commissie_beslissing (stage_id, commissielid_id, beslissing, motivatie)
    VALUES (?, ?, ?, ?)
  `, [stage_id, commissielid_id, beslissing, motivatie],
  (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Beslissing toegevoegd!', id: results.insertId });
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
      s.stagetitel,
      sc.getekend_student,
      sc.getekend_mentor,
      sc.getekend_docent,
      sc.getekend_op
    FROM stagecontract sc
    JOIN stage s ON sc.stage_id = s.stage_id
    JOIN student st ON s.student_id = st.student_id
    JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
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

// Contract tekenen (student, mentor of docent)
app.put('/api/contracten/:stage_id/tekenen', verifyToken, (req, res) => {
  const { stage_id } = req.params;
  const { rol } = req.body;

  const toegestaneRollen = ['student', 'mentor', 'docent'];
  if (!toegestaneRollen.includes(rol)) {
    res.status(400).json({ error: `Ongeldige rol. Kies uit: ${toegestaneRollen.join(', ')}` });
    return;
  }

  const kolom = `getekend_${rol}`;

  db.query(`
    UPDATE stagecontract SET ${kolom} = TRUE WHERE stage_id = ?
  `, [stage_id], (err, results) => {
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
// MENTOR STAGIAIRS
// ============================================================

// Alle stagiairs van een specifieke mentor ophalen
app.get('/api/mentors/:id/stagiairs', verifyToken, requireRol('mentor', 'admin', 'docent'), (req, res) => {
  const { id } = req.params;
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
  `, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ============================================================
// MENTOR LOGBOEKEN
// ============================================================

// Logboeken ophalen van alle stagiairs van een mentor
app.get('/api/mentors/:id/logboeken', verifyToken, requireRol('mentor', 'docent', 'admin'), (req, res) => {
  const { id } = req.params;
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
  `, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Logboek aftekenen als gelezen door mentor
app.put('/api/logboeken/:id/aftekenen', verifyToken, requireRol('mentor', 'docent', 'admin'), (req, res) => {
  const { id } = req.params;
 db.query(`
    UPDATE logboek
    SET status = 'goedgekeurd',
        gevalideerd_door = ?,
        gevalideerd_op = NOW()
    WHERE logboek_id = ?
  `, [req.gebruiker.id, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Logboek niet gevonden' });
    }

    // Notificatie sturen naar student
    db.query(`
      SELECT st.gebruiker_id, l.week_nummer
      FROM logboek l
      JOIN student st ON l.student_id = st.student_id
      WHERE l.logboek_id = ?
    `, [id], (err2, rows) => {
      if (err2 || rows.length === 0) {
        return res.json({ message: 'Logboek afgetekend!' });
      }
      db.query(`
        INSERT INTO notificatie (gebruiker_id, bericht)
        VALUES (?, ?)
      `, [rows[0].gebruiker_id, `Mentor heeft logboek week ${rows[0].week_nummer} bevestigd`], () => {
        res.json({ message: 'Logboek afgetekend en student verwittigd!' });
      });
    });
  });
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
app.put('/api/evaluaties/:id/indienen', verifyToken, requireRol('mentor', 'docent', 'admin'), (req, res) => {
  const { id } = req.params;

  // Controleer of al ingediend
  db.query(`
    SELECT ingediend FROM evaluatie WHERE evaluatie_id = ?
  `, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Evaluatie niet gevonden' });
    if (results[0].ingediend) return res.status(400).json({ error: 'Evaluatie is al ingediend en kan niet meer aangepast worden' });

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

// Docent score en feedback opslaan per criterium
app.put('/api/evaluaties/criteria/:criterium_id/docent', verifyToken, requireRol('docent', 'admin'), (req, res) => {
  const { criterium_id } = req.params;
  const { docent_score, docent_feedback } = req.body;

  if (![5, 3, 1, 0].includes(docent_score)) {
    return res.status(400).json({ error: 'Score moet 5, 3, 1 of 0 zijn' });
  }

  db.query(`
    UPDATE evaluatie_criterium
    SET score = ?,
        mentor_feedback = COALESCE(mentor_feedback, ?)
    WHERE criterium_id = ?
  `, [docent_score, docent_feedback, criterium_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Criterium niet gevonden' });
    }
    res.json({ message: 'Docent score opgeslagen!' });
  });
});

// Evaluatie totaalscore berekenen en opslaan
app.put('/api/evaluaties/:id/totaalscore', verifyToken, requireRol('docent', 'admin'), (req, res) => {
  const { id } = req.params;

  db.query(`
    SELECT SUM(score * gewicht) as totaal, SUM(gewicht) as max_gewicht
    FROM evaluatie_criterium
    WHERE evaluatie_id = ?
  `, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const totaal = results[0].totaal || 0;

    db.query(`
      UPDATE evaluatie SET totaalscore = ? WHERE evaluatie_id = ?
    `, [totaal, id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: 'Totaalscore bijgewerkt!', totaalscore: totaal });
    });
  });
});

// ============================================================
// SERVER STARTEN
// ============================================================
app.use('/api/stage', require('./routes/stage'));
app.use('/api/begeleider', require('./routes/begeleider'));
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
// Stage volledig bewerken
app.put('/api/stages/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { stagetitel, beschrijving, startdatum, einddatum, bedrijf_id, mentor_id, docent_id } = req.body;

  db.query('SELECT * FROM stage WHERE stage_id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Stage niet gevonden' });

    db.query(`
      UPDATE stage 
      SET stagetitel = ?, beschrijving = ?, startdatum = ?, einddatum = ?, 
          bedrijf_id = ?, mentor_id = ?, docent_id = ?
      WHERE stage_id = ?
    `, [stagetitel, beschrijving, startdatum, einddatum, bedrijf_id, mentor_id, docent_id, id],
    (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Stage niet gevonden' });
      res.json({ message: 'Stage bijgewerkt!' });
    });
  });
});
const PORT = process.env.PORT || 3000;
app.use('/api/aanvraag', require('./routes/aanvraag'));
app.listen(PORT, () => {
  console.log(`Server draait op poort ${PORT}`);
});
