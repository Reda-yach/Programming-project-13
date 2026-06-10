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
// Test-route
router.get('/test', (req, res) => {
  res.json({ message: 'Begeleider route werkt!' });
});

module.exports = router;
