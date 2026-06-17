// routes/auth.js
// ------------------------------------------------------------
// Wachtwoord-vergeten flow.
//
//   POST /api/auth/forgot-password   { email }
//        -> genereert een reset-token, mailt de link naar de gebruiker.
//           Antwoordt ALTIJD generiek (geen info-lek over bestaande mails).
//
//   POST /api/auth/reset-password    { token, wachtwoord }
//        -> verifieert de token (geldig, niet verlopen, niet gebruikt),
//           zet het nieuwe wachtwoord en markeert de token als gebruikt.
//
// Beveiliging:
//   - Token is 32 willekeurige bytes (crypto), enkel de SHA-256 hash staat in de DB.
//   - Token verloopt na TOKEN_GELDIGHEID_MIN minuten en is eenmalig bruikbaar.
//   - Eenvoudige in-memory rate limiting per e-mailadres.
//   - Bij wachtwoord-reset worden alle openstaande tokens van die gebruiker ongeldig.
// ------------------------------------------------------------

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { stuurMail } = require('../services/mail');

const TOKEN_GELDIGHEID_MIN = 60; // minuten dat een reset-link geldig blijft
const MIN_WACHTWOORD_LENGTE = 8;

// ------------------------------------------------------------
// Eenvoudige in-memory rate limiting (per e-mailadres).
// Max. AANVRAGEN_PER_VENSTER aanvragen per VENSTER_MS.
// Voor productie met meerdere instances hoort dit in Redis o.i.d.
// ------------------------------------------------------------
const VENSTER_MS = 15 * 60 * 1000; // 15 minuten
const AANVRAGEN_PER_VENSTER = 3;
const aanvraagGeschiedenis = new Map(); // email -> number[] (timestamps)

function magAanvragen(email) {
  const nu = Date.now();
  const recent = (aanvraagGeschiedenis.get(email) || []).filter(
    (t) => nu - t < VENSTER_MS,
  );
  if (recent.length >= AANVRAGEN_PER_VENSTER) {
    aanvraagGeschiedenis.set(email, recent);
    return false;
  }
  recent.push(nu);
  aanvraagGeschiedenis.set(email, recent);
  return true;
}

// SHA-256 hash van een token (hex) — high-entropy token, dus sha256 volstaat
// en laat directe DB-lookup op de hash toe.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================
// POST /api/auth/forgot-password
// ============================================================
router.post('/forgot-password', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();

  // Generiek antwoord — verraadt nooit of het e-mailadres bestaat.
  const genericOk = () =>
    res.json({
      message:
        'Als er een account met dit e-mailadres bestaat, is er een reset-link verstuurd.',
    });

  if (!email) {
    return res.status(400).json({ error: 'E-mailadres is verplicht.' });
  }

  if (!magAanvragen(email)) {
    return res.status(429).json({
      error: 'Te veel aanvragen. Probeer het later opnieuw.',
    });
  }

  db.query(
    'SELECT gebruiker_id, voornaam FROM gebruiker WHERE email = ?',
    [email],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Onbekend e-mailadres: tóch generiek antwoorden (geen info-lek).
      if (results.length === 0) {
        return genericOk();
      }

      const gebruiker = results[0];

      // Ruwe token (naar de gebruiker) + hash (naar de DB).
      const ruweToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(ruweToken);
      const verlooptOp = new Date(Date.now() + TOKEN_GELDIGHEID_MIN * 60 * 1000);

      db.query(
        'INSERT INTO wachtwoord_reset (gebruiker_id, token_hash, verloopt_op) VALUES (?, ?, ?)',
        [gebruiker.gebruiker_id, tokenHash, verlooptOp],
        async (insertErr) => {
          if (insertErr) {
            return res.status(500).json({ error: insertErr.message });
          }

          const frontendUrl =
            process.env.FRONTEND_URL || 'http://localhost:5173';
          const resetLink = `${frontendUrl}/wachtwoord-reset?token=${ruweToken}`;

          try {
            await stuurMail({
              to: email,
              subject: 'Wachtwoord opnieuw instellen — Stageverloop',
              text:
                `Hallo ${gebruiker.voornaam},\n\n` +
                `Je hebt gevraagd om je wachtwoord opnieuw in te stellen.\n` +
                `Klik op onderstaande link (geldig gedurende ${TOKEN_GELDIGHEID_MIN} minuten):\n\n` +
                `${resetLink}\n\n` +
                `Heb je dit niet aangevraagd? Dan mag je deze e-mail negeren; ` +
                `je wachtwoord blijft ongewijzigd.\n`,
              html:
                `<p>Hallo ${gebruiker.voornaam},</p>` +
                `<p>Je hebt gevraagd om je wachtwoord opnieuw in te stellen. ` +
                `Klik op onderstaande link (geldig gedurende ${TOKEN_GELDIGHEID_MIN} minuten):</p>` +
                `<p><a href="${resetLink}">Wachtwoord opnieuw instellen</a></p>` +
                `<p>Heb je dit niet aangevraagd? Dan mag je deze e-mail negeren; ` +
                `je wachtwoord blijft ongewijzigd.</p>`,
            });
          } catch (mailErr) {
            // Mail mislukt: log intern, maar blijf generiek naar de client.
            console.error('[forgot-password] mail mislukt:', mailErr.message);
          }

          return genericOk();
        },
      );
    },
  );
});

// ============================================================
// POST /api/auth/reset-password
// ============================================================
router.post('/reset-password', (req, res) => {
  const { token, wachtwoord } = req.body;

  if (!token || !wachtwoord) {
    return res
      .status(400)
      .json({ error: 'Token en nieuw wachtwoord zijn verplicht.' });
  }

  if (wachtwoord.length < MIN_WACHTWOORD_LENGTE) {
    return res.status(400).json({
      error: `Wachtwoord moet minstens ${MIN_WACHTWOORD_LENGTE} tekens bevatten.`,
    });
  }

  const tokenHash = hashToken(token);

  db.query(
    `SELECT reset_id, gebruiker_id, verloopt_op, gebruikt_op
     FROM wachtwoord_reset
     WHERE token_hash = ?`,
    [tokenHash],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
        return res.status(400).json({ error: 'Ongeldige of onbekende reset-link.' });
      }

      const reset = results[0];

      if (reset.gebruikt_op) {
        return res.status(400).json({ error: 'Deze reset-link is al gebruikt.' });
      }

      if (new Date(reset.verloopt_op) < new Date()) {
        return res.status(400).json({ error: 'Deze reset-link is verlopen.' });
      }

      bcrypt.hash(wachtwoord, 10, (hashErr, nieuweHash) => {
        if (hashErr) {
          return res.status(500).json({ error: hashErr.message });
        }

        // Wachtwoord updaten ...
        db.query(
          'UPDATE gebruiker SET wachtwoord_hash = ? WHERE gebruiker_id = ?',
          [nieuweHash, reset.gebruiker_id],
          (updErr) => {
            if (updErr) {
              return res.status(500).json({ error: updErr.message });
            }

            // ... deze token markeren als gebruikt en alle andere openstaande
            // tokens van deze gebruiker meteen ongeldig maken.
            db.query(
              `UPDATE wachtwoord_reset
               SET gebruikt_op = NOW()
               WHERE gebruiker_id = ? AND gebruikt_op IS NULL`,
              [reset.gebruiker_id],
              (markErr) => {
                if (markErr) {
                  return res.status(500).json({ error: markErr.message });
                }
                return res.json({
                  message: 'Wachtwoord succesvol gewijzigd. Je kunt nu inloggen.',
                });
              },
            );
          },
        );
      });
    },
  );
});

module.exports = router;
