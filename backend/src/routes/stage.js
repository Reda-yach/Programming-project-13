const express = require('express');
const router = express.Router();
const db = require('../db');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Geen token meegegeven' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, gebruiker) => {
    if (err) {
      return res.status(403).json({ error: 'Ongeldig token' });
    }
    req.gebruiker = gebruiker;
    next();
  });
}

// GET /api/stage — stage van de ingelogde student
router.get('/', verifyToken, (req, res) => {
  const gebruiker_id = req.gebruiker.id;

  // Stap 1: gebruiker_id omzetten naar student_id
  db.query(
    'SELECT student_id FROM student WHERE gebruiker_id = ?',
    [gebruiker_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.json({ status: 'geen', stage: null });
      }

      const student_id = results[0].student_id;

      // Stap 2: stage ophalen via student_id
      db.query(
        'SELECT * FROM stage WHERE student_id = ?',
        [student_id],
        (err2, stages) => {
          if (err2) return res.status(500).json({ error: err2.message });

          if (stages.length === 0) {
            return res.json({ status: 'geen', stage: null });
          }

          const stage = stages[0];
          return res.json({ status: stage.status, stage });
        }
      );
    }
  );
});

module.exports = router;