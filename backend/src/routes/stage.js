const express = require('express');
const router = express.Router();

// Test route om te controleren of de koppeling werkt
router.get('/test', (req, res) => {
  res.json({ message: 'Stage route werkt!' });
});

module.exports = router;