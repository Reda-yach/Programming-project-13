// services/mail.js
// ------------------------------------------------------------
// Kleine wrapper rond nodemailer voor het versturen van e-mails.
//
// Configuratie via .env (SMTP, bv. Mailtrap, Gmail, Brevo ...):
//   SMTP_HOST       = smtp.mailtrap.io
//   SMTP_PORT       = 2525
//   SMTP_USER       = <gebruiker>
//   SMTP_PASS       = <wachtwoord>
//   MAIL_FROM       = "Stageverloop <no-reply@stageverloop.be>"
//
// Is er GEEN SMTP_HOST ingesteld (typisch in development), dan wordt de
// e-mail niet echt verstuurd maar netjes naar de console gelogd. Zo kan
// de volledige flow getest worden zonder mailserver.
// ------------------------------------------------------------

const nodemailer = require('nodemailer');
require('dotenv').config();

const smtpGeconfigureerd = Boolean(process.env.SMTP_HOST);

let transporter = null;
if (smtpGeconfigureerd) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true voor poort 465, anders STARTTLS
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

/**
 * Verstuur een e-mail. Valt terug op console-logging als er geen SMTP
 * geconfigureerd is.
 * @param {{ to: string, subject: string, text: string, html?: string }} opties
 */
async function stuurMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || 'Stageverloop <no-reply@stageverloop.be>';

  if (!transporter) {
    console.log('\n[mail] (DEV — geen SMTP geconfigureerd, e-mail niet echt verstuurd)');
    console.log(`[mail] Aan:      ${to}`);
    console.log(`[mail] Onderwerp: ${subject}`);
    console.log(`[mail] Inhoud:\n${text}\n`);
    return { dev: true };
  }

  const info = await transporter.sendMail({ from, to, subject, text, html });
  return { messageId: info.messageId };
}

module.exports = { stuurMail };
