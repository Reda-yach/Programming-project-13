import test from 'node:test'
import assert from 'node:assert/strict'

import { getStageStatusLabel } from './stageStatus.js'

test('toont de juiste statuslabel voor een ingediende aanvraag', () => {
  assert.equal(getStageStatusLabel('in_behandeling'), 'Ingediend, wachtend op goedkeuring')
})

test('toont een actief label voor een goedgekeurde stage', () => {
  assert.equal(getStageStatusLabel('actief'), 'Actief')
})
