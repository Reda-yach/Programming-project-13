import test from 'node:test'
import assert from 'node:assert/strict'

import { getStageStatusLabel, getStageStatusKleur } from './stageStatus.js'

test('toont "In behandeling" voor een ingediende aanvraag', () => {
  assert.equal(getStageStatusLabel('in_behandeling'), 'In behandeling')
  assert.equal(getStageStatusLabel('ingediend'), 'In behandeling')
})

test('toont "Aanpassing gevraagd" wanneer de commissie aanpassingen vraagt', () => {
  assert.equal(getStageStatusLabel('aanpassing_gevraagd'), 'Aanpassing gevraagd')
  assert.equal(getStageStatusKleur('aanpassing_gevraagd'), 'badge-orange')
})

test('toont "Goedgekeurd" voor een goedgekeurde aanvraag', () => {
  assert.equal(getStageStatusLabel('goedgekeurd'), 'Goedgekeurd')
})

test('toont "Afgewezen" voor een afgewezen aanvraag', () => {
  assert.equal(getStageStatusLabel('afgewezen'), 'Afgewezen')
  assert.equal(getStageStatusKleur('afgewezen'), 'badge-red')
})

test('valt terug op een veilig label bij een onbekende status', () => {
  assert.equal(getStageStatusLabel('iets_onverwacht'), 'Onbekend')
})
