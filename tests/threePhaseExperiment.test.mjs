import test from 'node:test'
import assert from 'node:assert/strict'
import { CONNECTIONS, createObservation, getReadings, validateConnections } from '../src/utils/threePhaseExperiment.js'
import { autoConnectCircuit, readConnectionPairs, validateCircuit } from '../src/utils/jsPlumbWiring.js'
import { getMeterNeedleRotation } from '../src/utils/meterNeedle.js'
import { voltmeterNeedleRotation, ammeterNeedleRotation, wattmeterNeedleRotation } from '../src/config/meterNeedleRotations.js'
import { generateExperimentReport } from '../src/utils/reportGenerator.js'
import { createVerificationState, submitVerification, unlockVerification, updateVerificationEntry } from '../src/utils/manualVerification.js'

test('meter needles interpolate the experimental readings and clamp to their printed scales', () => {
  assert.ok(Math.abs(getMeterNeedleRotation(408, voltmeterNeedleRotation) - 32.4) < 0.001)
  assert.equal(getMeterNeedleRotation(0.5, ammeterNeedleRotation), -81)
  assert.equal(getMeterNeedleRotation(520, wattmeterNeedleRotation), 66)
  assert.equal(getMeterNeedleRotation(-1, ammeterNeedleRotation), -90)
  assert.equal(getMeterNeedleRotation(1000, wattmeterNeedleRotation), 90)
})

test('Star and Delta accept the required wires in either direction', () => {
  for (const configuration of ['Star', 'Delta']) {
    assert.equal(validateConnections(CONNECTIONS[configuration], configuration).isCorrect, true)
    assert.equal(validateConnections(CONNECTIONS[configuration].map(([a, b]) => [b, a]).reverse(), configuration).isCorrect, true)
  }
})

test('empty, incomplete, incorrect, and duplicate circuits cannot pass CHECK', () => {
  assert.equal(validateConnections([], 'Star').isCorrect, false)
  assert.equal(validateConnections(CONNECTIONS.Star.slice(1), 'Star').missingConnections[0].label, '1-4')
  const duplicate = validateConnections([...CONNECTIONS.Star, [4, 1]], 'Star')
  assert.equal(duplicate.isCorrect, false)
  assert.equal(duplicate.wrongConnections[0].duplicate, true)
  assert.equal(validateConnections([...CONNECTIONS.Star, [1, 3]], 'Star').isCorrect, false)
  assert.equal(validateConnections([...CONNECTIONS.Star, [21, 22]], 'Star').isCorrect, false)
})

test('Delta replaces the neutral links while retaining W2 and the third phase', () => {
  const starAsDelta = validateConnections(CONNECTIONS.Star, 'Delta')
  assert.deepEqual(starAsDelta.wrongConnections.map(({ label }) => label), ['17-19', '19-21'])
  assert.deepEqual(starAsDelta.missingConnections.map(({ label }) => label), ['16-19', '18-21', '17-20'])
  const withoutGroupFour = CONNECTIONS.Delta.filter((_, index) => index < 8 || index > 11)
  assert.equal(validateConnections(withoutGroupFour, 'Delta').isCorrect, false)
})

test('powered readings match the supplied measurements and turn off to zero', () => {
  assert.deepEqual(getReadings('Star'), { lineVoltage: 408, lineCurrent: 0.5, w1: 180, w2: 190 })
  assert.deepEqual(getReadings('Delta'), { lineVoltage: 408, lineCurrent: 1.2, w1: 520, w2: 320 })
  assert.deepEqual(getReadings('Delta', false), { lineVoltage: 0, lineCurrent: 0, w1: 0, w2: 0 })
})

test('power and percentage error are calculated from unrounded readings', () => {
  const star = createObservation('Star', 1)
  const delta = createObservation('Delta', 2)
  assert.equal(star.measuredPower, 370)
  assert.equal(delta.measuredPower, 840)
  assert.equal(star.theoreticalPower.toFixed(2), '353.34')
  assert.equal(delta.theoreticalPower.toFixed(2), '848.01')
  assert.equal(star.percentageError.toFixed(2), '4.72')
  assert.equal(delta.percentageError.toFixed(2), '0.94')
})

const mockCircuit = (pairs) => {
  let wires = pairs.map(([a, b]) => ({ sourceId: `${a}-endpoint`, targetId: `${b}-endpoint` }))
  return {
    getAllConnections: () => wires,
    deleteConnection: (connection) => { wires = wires.filter((wire) => wire !== connection) },
    connect: ({ uuids: [sourceId, targetId] }) => { wires.push({ sourceId, targetId }) },
  }
}

test('Auto Connect removes bad and duplicate wires, then converts both ways without losing common wires', () => {
  const circuit = mockCircuit([[1, 3], [1, 4], [4, 1]])
  autoConnectCircuit(circuit, 'Star')
  assert.equal(validateCircuit(circuit, 'Star').isCorrect, true)
  assert.equal(readConnectionPairs(circuit).length, 14)
  const commonWire = circuit.getAllConnections().find(({ sourceId }) => sourceId === '3-endpoint')
  autoConnectCircuit(circuit, 'Delta')
  assert.equal(validateCircuit(circuit, 'Delta').isCorrect, true)
  assert.equal(readConnectionPairs(circuit).length, 15)
  assert.ok(circuit.getAllConnections().includes(commonWire))
  autoConnectCircuit(circuit, 'Delta')
  assert.equal(readConnectionPairs(circuit).length, 15)
  autoConnectCircuit(circuit, 'Star')
  assert.equal(validateCircuit(circuit, 'Star').isCorrect, true)
})

test('reports require both verifications and include manual results, attempts, apparatus and conclusion', async () => {
  const previousWindow = globalThis.window
  let reportUrl
  globalThis.window = {
    open: (url) => { reportUrl = url; return {} },
    setTimeout: () => {},
  }
  try {
    const observations = [createObservation('Star', 1), createObservation('Delta', 2)]
    let verification = createVerificationState()
    assert.equal(generateExperimentReport({ observations, sessionStart: Date.now(), verification }), false)
    assert.equal(reportUrl, undefined)
    verification = unlockVerification(verification, observations)
    verification = submitVerification(verification, 'Star', observations)
    for (const [configuration, current, power] of [['Star', '0.5', '353.32'], ['Delta', '1.2', '847.98']]) {
      for (const [field, value] of Object.entries({ lineVoltage: '408', lineCurrent: current, power })) {
        verification = updateVerificationEntry(verification, configuration, field, value)
      }
      verification = submitVerification(verification, configuration, observations)
    }
    assert.equal(generateExperimentReport({
      observations, sessionStart: Date.now() - 95000, verification, connectionAttempts: 2,
    }), true)
    const html = await (await fetch(reportUrl)).text()
    for (const value of ['Star', 'Delta', '370', '840', '353.32', '847.98', 'Verification attempts: 3',
      'Duration: 1 min 35 sec', 'User-calculated Results', 'Conclusion', '<strong>Rating:</strong>',
      'V<sub>L</sub>', 'W<sub>1</sub>', '16A, 3P, 415V AC, 50 Hz', 'Print / Save as PDF']) {
      assert.ok(html.includes(value), `Report is missing ${value}`)
    }
    assert.ok(!html.includes('353.34') && !html.includes('848.01'), 'Report must use user-entered power')
    assert.ok(!/transformer|efficiency|voltage regulation/i.test(html))
    const edited = updateVerificationEntry(verification, 'Star', 'power', '353.34')
    assert.equal(generateExperimentReport({ observations, sessionStart: Date.now(), verification: edited }), false)
    globalThis.window.open = () => null
    assert.equal(generateExperimentReport({ observations, sessionStart: Date.now(), verification }), false)
  } finally {
    if (reportUrl) URL.revokeObjectURL(reportUrl)
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
