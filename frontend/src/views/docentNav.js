// Gedeelde TopBar-links voor de docent-schermen.
//
// Een commissielid (rol 'commissie', of een docent met de commissielid-vlag)
// gebruikt dezelfde docent-schermen én ziet bovendien de 'Aanvragen'-tab.
// Een gewone docent ziet enkel Studenten, Logboek en Evaluaties.

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
