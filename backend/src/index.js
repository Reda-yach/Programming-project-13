const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Backend werkt!' });
});

// Alle gebruikers ophalen
app.get('/api/gebruikers', (req, res) => {
  db.query('SELECT * FROM gebruiker', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Alle stages ophalen
app.get('/api/stages', (req, res) => {
  db.query(`
    SELECT
      g.naam AS student,
      b.naam AS bedrijf,
      s.stagetitel,
      s.startdatum,
      s.einddatum,
      s.status
    FROM stage s
    JOIN student st ON s.student_id = st.student_id
    JOIN gebruiker g ON st.gebruiker_id = g.gebruiker_id
    JOIN bedrijf b ON s.bedrijf_id = b.bedrijf_id
  `, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Alle logboeken ophalen
app.get('/api/logboeken', (req, res) => {
  db.query(`
    SELECT
      g.naam AS student,
      l.week_nummer,
      l.activiteiten,
      l.uren,
      l.status
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

// Alle evaluaties ophalen
app.get('/api/evaluaties', (req, res) => {
  db.query(`
    SELECT
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

// Alle notificaties ophalen
app.get('/api/notificaties', (req, res) => {
  db.query(`
    SELECT
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

// Nieuwe stage aanmaken
app.post('/api/stages', (req, res) => {
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

// Stage status updaten
app.put('/api/stages/:id/status', (req, res) => {
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
    res.json({ message: 'Status bijgewerkt!' });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server draait op poort ${PORT}`);
});