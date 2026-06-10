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

// Test-route
router.get('/test', (req, res) => {
  res.json({ message: 'Begeleider route werkt!' });
});

module.exports = router;
