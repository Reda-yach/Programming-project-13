const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, (req, res) => {
  res.json({ ontvangen: req.body });
});

module.exports = router;