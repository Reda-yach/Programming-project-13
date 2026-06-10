const express = require('express');
const router = express.Router();
const db = require('../db');

// verifyToken lokale kopie (zelfde als in stage.js)
const jwt = require('jsonwebtoken');
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Geen token' });
  jwt.verify(token, process.env.JWT_SECRET, (err, gebruiker) => {
    if (err) return res.status(403).json({ error: 'Ongeldige token' });
    req.gebruiker = gebruiker;
    next();
  });
}
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
      s.status
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
// Test-route
router.get('/test', (req, res) => {
  res.json({ message: 'Begeleider route werkt!' });
});

module.exports = router;
