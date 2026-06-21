// Gedeelde invoervalidatie voor het aanmaken van accounts.
// Zowel de frontend (UX) als deze backend (waarborg) gebruiken dezelfde regels.

// Telefoonnummer: enkel cijfers, spaties, +, - en haakjes; minstens 8 cijfers.
// Leeg/niet opgegeven mag (telefoon is optioneel) — de aanroeper beslist of het
// veld verplicht is, deze functie controleert enkel het formaat als er iets staat.
function geldigTelefoon(tel) {
  if (tel == null || String(tel).trim() === '') return true; // optioneel
  const waarde = String(tel).trim();
  if (!/^[0-9\s+\-()]+$/.test(waarde)) return false;
  const aantalCijfers = (waarde.match(/[0-9]/g) || []).length;
  return aantalCijfers >= 8;
}

// Studentnummer: letters, cijfers en streepjes toegestaan (bv. r0123456 of
// ehb-2025-33), geen spaties of andere speciale tekens, 4–20 tekens.
function geldigStudentnummer(nr) {
  return /^[A-Za-z0-9-]{4,20}$/.test(String(nr ?? '').trim());
}

module.exports = { geldigTelefoon, geldigStudentnummer };
