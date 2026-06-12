export function getStageStatusLabel(status) {
  switch (status) {
    case 'in_behandeling':
      return 'Ingediend, wachtend op goedkeuring'
    case 'actief':
      return 'Actief'
    case 'afgewezen':
      return 'Afgewezen'
    default:
      return 'Geen aanvraag'
  }
}
