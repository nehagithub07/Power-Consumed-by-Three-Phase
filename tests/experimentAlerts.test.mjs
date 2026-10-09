import test from 'node:test'
import assert from 'node:assert/strict'
import { getWiringStepAlert } from '../src/alerts/experimentAlerts.js'
import { CONNECTIONS, validateConnections } from '../src/utils/threePhaseExperiment.js'

test('wiring alerts guide the next connection and ignore repeated or reversed wire events', () => {
  const empty = validateConnections([], 'Star')
  const first = validateConnections([[1, 4]], 'Star')
  const alert = getWiringStepAlert(first, empty, 'Star')
  assert.equal(alert.placement, 'top-right')
  assert.equal(alert.replaceCurrent, true)
  assert.match(alert.description, /1 of 14/)
  assert.match(alert.description, /terminal 2 to terminal 5/)
  assert.equal(getWiringStepAlert(first, first, 'Star'), null)
  assert.equal(getWiringStepAlert(validateConnections([[4, 1]], 'Star'), first, 'Star'), null)
  assert.equal(getWiringStepAlert(empty, first, 'Star').title, 'Connection Removed')
})

test('incorrect and duplicate wires produce warnings, never a wiring-complete alert', () => {
  const ready = validateConnections(CONNECTIONS.Star, 'Star')
  for (const pair of [[1, 3], [4, 1]]) {
    const progress = validateConnections([...CONNECTIONS.Star, pair], 'Star')
    const alert = getWiringStepAlert(progress, ready, 'Star')
    assert.equal(alert.type, 'warning')
    assert.match(alert.description, /incorrect or duplicate/)
    assert.ok(alert.description.includes(`(${pair.join('-')})`))
  }
})

test('both load configurations require CHECK after the final manual connection', () => {
  for (const configuration of ['Star', 'Delta']) {
    const pairs = CONNECTIONS[configuration]
    const alert = getWiringStepAlert(
      validateConnections(pairs, configuration),
      validateConnections(pairs.slice(0, -1), configuration),
      configuration,
    )
    assert.equal(alert.title, 'Wiring Complete')
    assert.match(alert.description, /Click CHECK before switching ON/)
    assert.ok(alert.description.includes(configuration))
  }
})
