// Centrale API-URL voor de backend.
//
// Standaard volgt de URL de hostname waarop de frontend geladen is:
//   - lokaal      -> http://localhost:3000
//   - via VPN/LAN -> http://<jouw-ip>:3000  (het IP waarmee een teamgenoot de app opent)
// Zo werkt de app zonder configuratie, zowel op je eigen pc als voor iemand
// die via de VPN je frontend opent.
//
// Wil je een vaste backend-URL (bv. bij een echte deploy)? Zet dan VITE_API_URL
// in een .env-bestand van de frontend, bv.:  VITE_API_URL=https://api.mijnstage.be
export const API_URL =
  import.meta.env.VITE_API_URL || `${location.protocol}//${location.hostname}:3000`
