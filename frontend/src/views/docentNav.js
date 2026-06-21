// Gedeelde TopBar-links voor de docent-schermen.
//
// De stagecommissie (rol 'commissie') gebruikt dezelfde docent-schermen, maar
// ziet als enige ook de 'Aanvragen'-tab. Een gewone docent (rol 'docent') ziet
// enkel Studenten, Logboek en Evaluaties.

function huidigeGebruiker() {
  try {
    return JSON.parse(localStorage.getItem('gebruiker') || '{}')
  } catch {
    return {}
  }
}

export function magAanvragenZien() {
  const g = huidigeGebruiker()
  return g.rol === 'commissie' || g.rol === 'admin' || g.commissielid === true
}

export function docentNavLinks() {
  const g = huidigeGebruiker()

  // Puur commissie-account: geen eigen studenten, enkel Aanvragen tonen.
  if (g.rol === 'commissie') {
    return [{ label: 'Aanvragen', to: '/docent-aanvragen' }]
  }

  const links = [
    { label: 'Studenten', to: '/docent-studenten' },
    { label: 'Logboek', to: '/docent-logboek-overzicht', match: '/docent/logboek' },
    { label: 'Evaluaties', to: '/docent-evaluaties', match: '/docent/evaluaties' },
  ]
  if (magAanvragenZien()) {
    links.push({ label: 'Aanvragen', to: '/docent-aanvragen' })
  }
  return links
}
