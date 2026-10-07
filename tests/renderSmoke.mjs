import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { createObservation, getReadings } from '../src/utils/threePhaseExperiment.js'

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
  for (const name of ['ObservationTable', 'FormulaSection', 'ResultsGraphs']) {
    const { default: Component } = await server.ssrLoadModule(`/src/components/${name}.jsx`)
    const html = renderToStaticMarkup(createElement(Component, { observations, plotted: true }))
    assert.ok(html.includes('Star') && html.includes('Delta'))
    assert.ok(!/efficiency|regulation|transformer/i.test(html))
  }
  const { default: ActionButtons } = await server.ssrLoadModule('/src/components/ActionButtons.jsx')
  const html = renderToStaticMarkup(createElement(ActionButtons, { configuration: 'Star' }))
  assert.equal((html.match(/class="action-button /g) ?? []).length, 8)
  console.log('Render smoke checks passed: 21 unique terminals, both wattmeters, all lamp states, observations, formulas, graphs and controls.')
} finally {
  await server.close()
}
