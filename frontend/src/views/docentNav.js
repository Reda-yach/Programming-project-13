// Gedeelde TopBar-links voor de docent-schermen.
//
// De stagecommissie (rol 'commissie') gebruikt dezelfde docent-schermen, maar
// ziet als enige ook de 'Aanvragen'-tab. Een gewone docent (rol 'docent') ziet
// enkel Studenten, Logboek en Evaluaties.

function huidigeRol() {
  try {
    return JSON.parse(localStorage.getItem('gebruiker') || '{}').rol || ''
  } catch {
    return ''
  }
}

export function magAanvragenZien() {
  return huidigeRol() === 'commissie'
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
