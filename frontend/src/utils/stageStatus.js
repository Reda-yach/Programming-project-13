// Centrale vertaling van de stage-status (zoals die in de database staat)
// naar een leesbaar label en een badge-kleur. Eén bron van waarheid zodat
// dashboard, aanvraagpagina en commissie-view dezelfde termen tonen.
//
// De geldige statussen komen overeen met de ENUM van stage.status:
//   ingediend, in_behandeling, goedgekeurd, aanpassing_gevraagd,
//   afgewezen, bezig, afgerond

const STATUS_INFO = {
  geen:               { label: 'Geen aanvraag',        kleur: 'badge-gray' },
  ingediend:          { label: 'In behandeling',       kleur: 'badge-yellow' },
  in_behandeling:     { label: 'In behandeling',       kleur: 'badge-yellow' },
  aanpassing_gevraagd: { label: 'Aanpassing gevraagd',   kleur: 'badge-orange' },
  goedgekeurd:        { label: 'Goedgekeurd',          kleur: 'badge-green' },
  afgewezen:          { label: 'Afgewezen',            kleur: 'badge-red' },
  bezig:              { label: 'Actief',               kleur: 'badge-green' },
  afgerond:           { label: 'Afgerond',             kleur: 'badge-green' },
}

export function getStageStatusInfo(status) {
  return STATUS_INFO[status] ?? { label: 'Onbekend', kleur: 'badge-gray' }
}

export function getStageStatusLabel(status) {
  return getStageStatusInfo(status).label
}

export function getStageStatusKleur(status) {
  return getStageStatusInfo(status).kleur
}
