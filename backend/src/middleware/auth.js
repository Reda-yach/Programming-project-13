const jwt = require('jsonwebtoken');
const db = require('../db');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Geen token meegegeven' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, gebruiker) => {
    if (err) {
      return res.status(403).json({ error: 'Ongeldig token' });
    }

    // Single-session: token moet de huidige sessie van de gebruiker zijn.
    // Ergens anders inloggen zet een nieuwe sessie_id → dit (oude) token klopt
    // dan niet meer. code 'sessie_elders' zodat de frontend gericht uitlogt.
    // ponytail: één extra SELECT per request — prima op deze schaal; cache het
    // pas als de DB er last van krijgt.
    db.query('SELECT sessie_id FROM gebruiker WHERE gebruiker_id = ?', [gebruiker.id], (dbErr, rows) => {
      if (dbErr) return res.status(500).json({ error: dbErr.message });
      if (rows.length === 0 || rows[0].sessie_id !== gebruiker.sid) {
        return res.status(401).json({ error: 'Je bent ergens anders ingelogd.', code: 'sessie_elders' });
      }
      req.gebruiker = gebruiker; // { id, email, rol, sid }
      next();
    });
  });
}

function requireRol(...rollen) {
  return (req, res, next) => {
    if (!req.gebruiker) {
      return res.status(401).json({ error: 'Niet ingelogd' });
    }
    if (!rollen.includes(req.gebruiker.rol)) {
      return res.status(403).json({
        error: `Geen toegang. Vereiste rol: ${rollen.join(' of ')}`
      });
    }
    next();
  };
}

// Commissierechten: admin, docent met commissielid=true, of rol='commissie'.
function requireCommissie(req, res, next) {
  if (!req.gebruiker) {
    return res.status(401).json({ error: 'Niet ingelogd' });
  }
  const { rol, commissielid } = req.gebruiker;
  if (rol === 'admin' || rol === 'commissie' || commissielid === true) {
    return next();
  }
  return res.status(403).json({ error: 'Geen toegang. Commissierechten vereist.' });
}

module.exports = { verifyToken, requireRol, requireCommissie };
