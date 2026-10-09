import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'
import { createObservation, getReadings } from '../src/utils/threePhaseExperiment.js'
import {
  createVerificationState, submitVerification,
  unlockVerification, updateVerificationEntry,
} from '../src/utils/manualVerification.js'
import { loadWalkthroughConfig } from '../src/walkthrough/walkthroughConfigLoader.js'

const server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
try {
  const { default: EquipmentPanel } = await server.ssrLoadModule('/src/components/EquipmentPanel.jsx')
  for (const configuration of ['Star', 'Delta']) {
    for (const powerOn of [false, true]) {
      const html = renderToStaticMarkup(createElement(EquipmentPanel, {
        configuration, powerOn, readings: getReadings(configuration, powerOn), onTogglePower: () => {},
      }))
      const terminals = [...html.matchAll(/class="connection-terminal [^"]+"[^>]+data-terminal-id="(\d+)-endpoint"/g)]
        .map((match) => Number(match[1])).sort((a, b) => a - b)
      assert.deepEqual(terminals, Array.from({ length: 21 }, (_, index) => index + 1))
      assert.ok(!/transformer|variac|switch-1/i.test(html))
      assert.ok(html.includes(`data-brightness="${powerOn ? configuration === 'Star' ? 'dim' : 'bright' : 'off'}"`))
      assert.ok(html.includes('id="wattmeter-1"') && html.includes('id="wattmeter-2"'))
      assert.ok(html.includes(`aria-label="Switch MCB ${powerOn ? 'off' : 'on'}"`))
    }
  }
  const observations = [createObservation('Star', 1), createObservation('Delta', 2)]
  for (const name of ['ObservationTable', 'FormulaSection']) {
    const { default: Component } = await server.ssrLoadModule(`/src/components/${name}.jsx`)
    const html = renderToStaticMarkup(createElement(Component, { observations, plotted: true }))
    assert.ok(html.includes('Star') && html.includes('Delta'))
    assert.ok(!/efficiency|regulation|transformer/i.test(html))
    if (name === 'ObservationTable') {
      for (const label of ['V<sub>L</sub>', 'I<sub>L</sub>', 'W<sub>1</sub>', 'W<sub>2</sub>']) assert.ok(html.includes(label))
      assert.ok(html.includes('<td>180</td><td>190</td>'))
    }
  }
  const { default: CalculationSection } = await server.ssrLoadModule('/src/components/CalculationSection.jsx')
  const locked = createVerificationState()
  for (const rows of [[], observations.slice(0, 1), observations.slice(1), observations, [...observations].reverse()]) {
    const verification = unlockVerification(locked, rows)
    const html = renderToStaticMarkup(createElement(CalculationSection, { observations: rows, verification }))
    assert.equal(/<fieldset[^>]*disabled/.test(html), rows.length < 2)
    assert.equal((html.match(/value=""/g) ?? []).length, 3, 'All manual values must remain blank even after recording observations')
    assert.ok(html.includes('aria-label="Calculated power (W)"'))
    assert.equal((html.match(/maxlength="3"/gi) ?? []).length, 2)
    assert.ok(!html.includes('Add both Star and Delta observations'))
    assert.ok(!html.includes('verification-locked-note'))
    assert.ok(!/<output|Measured power:|Error Analysis|True Value = Theoretical Value/.test(html))
  }
  const { default: ReportControls } = await server.ssrLoadModule('/src/components/ReportControls.jsx')
  const assertReportDisabled = (verification, disabled, step, readingCount = observations.length) => {
    const html = renderToStaticMarkup(createElement(ReportControls, {
      observations: observations.slice(0, readingCount), verification,
    }))
    assert.equal(html.includes('disabled=""'), disabled, step)
  }
  let verification = createVerificationState()
  assertReportDisabled(verification, true, 'Before observations', 0)
  verification = unlockVerification(verification, observations)
  assertReportDisabled(verification, true, 'Both observations unlock verification but not the report')
  for (const [configuration, lineCurrent, power] of [['Star', '0.5', '353.33'], ['Delta', '1.2', '847.99']]) {
    for (const [field, value] of Object.entries({ lineVoltage: '408', lineCurrent, power })) {
      verification = updateVerificationEntry(verification, configuration, field, value)
    }
  }
  assertReportDisabled(verification, true, 'Entering values does not verify them')
  verification = submitVerification(verification, 'Star', observations)
  assertReportDisabled(verification, true, 'Star verified alone')
  verification = submitVerification(verification, 'Delta', observations)
  assertReportDisabled(verification, true, 'Delta verification failed')
  verification = updateVerificationEntry(verification, 'Delta', 'power', '848')
  assertReportDisabled(verification, true, 'Corrected value still needs verification')
  verification = submitVerification(verification, 'Delta', observations)
  assertReportDisabled(verification, false, 'Both loads successfully verified')
  assertReportDisabled(verification, true, 'Both observations are still required', 1)
  verification = updateVerificationEntry(verification, 'Star', 'power', '353.32')
  assertReportDisabled(verification, true, 'Editing a verified value locks the report again')
  assertReportDisabled(createVerificationState(), true, 'Reset locks the report', 0)
  for (const order of [['Star', 'Delta'], ['Delta', 'Star']]) {
    let state = unlockVerification(createVerificationState(), observations)
    for (const configuration of order) {
      const fields = { lineVoltage: '408', lineCurrent: configuration === 'Star' ? '0.5' : '1.2', power: configuration === 'Star' ? '353.32' : '848' }
      for (const [field, value] of Object.entries(fields)) state = updateVerificationEntry(state, configuration, field, value)
    }
    assertReportDisabled(state, true, 'Correct inputs alone do not enable the report')
    state = submitVerification(state, order[0], observations)
    assertReportDisabled(state, true, `${order[0]} verified alone`)
    state = submitVerification(state, order[1], observations)
    assertReportDisabled(state, false, `Both verified in ${order.join(', ')} order`)
    const stale = { ...state, entries: { ...state.entries, Star: { ...state.entries.Star, power: '100' } } }
    assertReportDisabled(stale, true, 'Verified flags cannot override invalid current values')
  }
  const { default: ActionButtons } = await server.ssrLoadModule('/src/components/ActionButtons.jsx')
  const html = renderToStaticMarkup(createElement(ActionButtons, { configuration: 'Star' }))
  assert.equal((html.match(/class="action-button /g) ?? []).length, 7)
  assert.ok(!html.includes('calculate-button') && !html.includes('CALCULATE'))
  const config = loadWalkthroughConfig(JSON.parse(await readFile(new URL('../src/walkthrough/walkthroughConfig.json', import.meta.url), 'utf8')))
  assert.equal(config.steps.length, 17)
  assert.equal(new Set(config.steps.map((step) => step.id)).size, config.steps.length)
  for (const [, buttonId] of html.matchAll(/<button[^>]*id="([^"]+)"/g)) {
    assert.ok(config.steps.some((step) => step.target === `#${buttonId}`), `Missing walkthrough for ${buttonId}`)
  }
  for (const step of config.steps.filter((step) => step.title.endsWith(' Button'))) {
    assert.ok(html.includes(`id="${step.target.slice(1)}"`), `Walkthrough target ${step.target} must exist`)
  }
  const { default: WalkthroughPopup } = await server.ssrLoadModule('/src/walkthrough/components/WalkthroughPopup.jsx')
  const previousWindow = globalThis.window
  globalThis.window = Object.assign(new EventTarget(), { innerWidth: 1440, innerHeight: 1000, pageXOffset: 0, pageYOffset: 0 })
  try {
    for (const activeStep of config.steps) {
      const html = renderToStaticMarkup(createElement(WalkthroughPopup, {
        activeStep, currentStep: 1, totalSteps: config.steps.length,
        canGoNext: true, canGoPrevious: false,
      }))
      assert.ok(html.includes(activeStep.title))
      for (const [, label] of activeStep.description.matchAll(/\*\*(.*?)\*\*/g)) {
        assert.ok(html.includes(`<strong>${label}</strong>`))
      }
    }
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
  console.log('Render smoke checks passed: apparatus, subscripts, blank manual inputs, locked verification, report gating and walkthrough targets and formatting.')
} finally {
  await server.close()
}
