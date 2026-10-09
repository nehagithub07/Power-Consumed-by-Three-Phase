import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createVerificationState, hasBothObservations, isVerificationComplete,
  isAllowedVerificationInput, submitVerification, unlockVerification, updateVerificationEntry, validateManualVerification,
} from '../src/utils/manualVerification.js'
import { createObservation } from '../src/utils/threePhaseExperiment.js'

const observations = [createObservation('Star', 1), createObservation('Delta', 2)]
const values = (configuration, power) => ({
  lineVoltage: '408', lineCurrent: configuration === 'Star' ? '0.5' : '1.2', power,
})
const fill = (state, configuration, power) => Object.entries(values(configuration, power))
  .reduce((next, [field, value]) => updateVerificationEntry(next, configuration, field, value), state)

test('voltage input permits editing but blocks extra digits, decimals and out-of-range complete values', () => {
  for (const value of ['', '4', '40', '400', '408', '449', '450']) {
    assert.equal(isAllowedVerificationInput('lineVoltage', value), true, value)
  }
  for (const value of ['399', '451', '999', '4000', '408.0', '-400', '4e2', ' 408']) {
    assert.equal(isAllowedVerificationInput('lineVoltage', value), false, value)
  }
})

test('current input accepts 0–2 inclusive with at most one decimal place', () => {
  for (const value of ['', '0', '0.', '0.0', '0.5', '1', '1.', '1.2', '1.9', '2', '2.', '2.0']) {
    assert.equal(isAllowedVerificationInput('lineCurrent', value), true, value)
  }
  for (const value of ['0.55', '1.20', '2.1', '3', '-0.5', '00.5', '1..2', '1e0', 'abc']) {
    assert.equal(isAllowedVerificationInput('lineCurrent', value), false, value)
  }
})

test('range and precision are checked again on verification, even if the input filter is bypassed', () => {
  const correct = values('Star', '353.33')
  for (const lineVoltage of ['40', '399', '451', '4080', '408.0']) {
    assert.equal(validateManualVerification('Star', { ...correct, lineVoltage }, observations).title, 'Check Line Voltage')
  }
  for (const lineCurrent of ['0.', '0.50', '2.1', '3', '-0.5']) {
    assert.equal(validateManualVerification('Star', { ...correct, lineCurrent }, observations).title, 'Check Line Current')
  }
  for (const lineCurrent of ['0', '0.0', '2', '2.0']) {
    assert.equal(validateManualVerification('Star', { ...correct, lineCurrent }, observations).title, 'Check Voltage and Current')
  }
  let state = unlockVerification(createVerificationState(), observations)
  state = fill(state, 'Star', '353.33')
  assert.equal(updateVerificationEntry(state, 'Star', 'lineVoltage', '4500'), state)
  assert.equal(updateVerificationEntry(state, 'Star', 'lineCurrent', '0.55'), state)
})

test('verification stays locked until both distinct loads are recorded, in either order', () => {
  const state = createVerificationState()
  assert.equal(hasBothObservations([observations[0], observations[0]]), false)
  assert.equal(unlockVerification(state, []), state)
  assert.equal(unlockVerification(state, observations.slice(0, 1)), state)
  assert.equal(unlockVerification(state, [observations[0], observations[0]]), state)
  assert.equal(updateVerificationEntry(state, 'Star', 'power', '353.33'), state)
  assert.equal(submitVerification(state, 'Star', observations), state)
  for (const rows of [observations, [...observations].reverse()]) {
    let verification = state
    for (let count = 1; count <= rows.length; count += 1) {
      verification = unlockVerification(verification, rows.slice(0, count))
      assert.equal(verification.enabled, count === 2)
      assert.equal(isVerificationComplete(verification), false)
    }
    for (const entry of Object.values(verification.entries)) {
      assert.equal(entry.lineVoltage, '')
      assert.equal(entry.lineCurrent, '')
      assert.equal(entry.power, '')
    }
  }
})

test('only the specified manual power answers verify, without rounding nearby answers', () => {
  for (const [configuration, accepted, rejected] of [
    ['Star', ['353.33', '353.32', '353.330'], ['353.34', '353.31', '353.325', '353.331', '848']],
    ['Delta', ['847.98', '848', '848.00'], ['847.99', '848.01', '847.98001', '848.001', '353.33']],
  ]) {
    for (const power of accepted) {
      assert.equal(validateManualVerification(configuration, values(configuration, power), observations).verified, true, power)
    }
    for (const power of rejected) {
      assert.equal(validateManualVerification(configuration, values(configuration, power), observations).verified, false, power)
    }
  }
})

test('manual fields reject missing, invalid and mismatched voltage/current values', () => {
  const correct = values('Star', '353.33')
  for (const field of ['lineVoltage', 'lineCurrent', 'power']) {
    for (const value of ['', ' ', '0', '-1', 'abc', 'Infinity', '1e2', '0x10', '9'.repeat(400)]) {
      assert.equal(validateManualVerification('Star', { ...correct, [field]: value }, observations).verified, false)
    }
  }
  assert.equal(validateManualVerification('Star', { ...correct, lineCurrent: '1.2' }, observations).verified, false)
  assert.equal(validateManualVerification('Star', { ...correct, lineVoltage: '415' }, observations).verified, false)
  assert.equal(validateManualVerification('Star', correct, []).verified, false)
})

test('attempts persist, both loads must pass, and edits invalidate only the edited load', () => {
  let state = unlockVerification(createVerificationState(), observations)
  state = submitVerification(state, 'Star', observations)
  assert.equal(state.entries.Star.attempts, 1)
  assert.equal(state.entries.Star.verified, false)
  state = fill(state, 'Star', '353.32')
  state = submitVerification(state, 'Star', observations)
  assert.equal(state.entries.Star.attempts, 2)
  assert.equal(state.entries.Star.verified, true)
  assert.equal(isVerificationComplete(state), false)
  state = fill(state, 'Delta', '848')
  state = submitVerification(state, 'Delta', observations)
  assert.equal(isVerificationComplete(state), true)
  assert.equal(state.entries.Star.power, '353.32')
  state = updateVerificationEntry(state, 'Star', 'lineVoltage', '415')
  assert.equal(state.entries.Star.verified, false)
  assert.equal(state.entries.Delta.verified, true)
  assert.equal(isVerificationComplete(state), false)
  const reset = createVerificationState()
  assert.equal(reset.enabled, false)
  assert.equal(reset.entries.Star.attempts, 0)
  assert.equal(reset.entries.Delta.power, '')
})
