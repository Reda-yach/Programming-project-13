const jwt = require('jsonwebtoken');

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
    req.gebruiker = gebruiker; // { id, email, rol }
    next();
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

module.exports = { verifyToken, requireRol };
