import { useState } from 'react'
import { LOAD_CONFIGURATIONS } from '../utils/threePhaseExperiment.js'
import { FormulaIcon } from './Icons.jsx'

const CalculationSection = ({ observations }) => {
  const [configuration, setConfiguration] = useState('Star')
  const [calculations, setCalculations] = useState({})
  const observation = observations.find((row) => row.configuration === configuration)
  const calculation = calculations[configuration] ?? {}
  const lineVoltage = calculation.lineVoltage ?? observation?.lineVoltage ?? ''
  const lineCurrent = calculation.lineCurrent ?? observation?.lineCurrent ?? ''
  const power = calculation.power
  const percentageError = power != null && observation
    ? Math.abs(observation.measuredPower - power) / power * 100
    : null

  const updateField = (field, value) => {
    setCalculations((current) => ({
      ...current,
      [configuration]: { lineVoltage, lineCurrent, [field]: value },
    }))
  }

  const calculate = (event) => {
    event.preventDefault()
    const voltage = Number(lineVoltage)
    const current = Number(lineCurrent)
    const result = Math.sqrt(3) * voltage * current
    const valid = voltage > 0 && current > 0 && Number.isFinite(result) && result > 0
    setCalculations((previous) => ({
      ...previous,
      [configuration]: {
        lineVoltage,
        lineCurrent,
        power: valid ? result : null,
        error: valid ? '' : 'Enter a positive, finite line voltage and line current.',
      },
    }))
  }

  return (
    <section className="calculations-panel" id="calculations-panel" aria-labelledby="calculations-title">
      <div className="calculations-panel__sheet">
        <header className="calculations-panel__heading">
          <span className="calculations-panel__heading-line" />
          <FormulaIcon />
          <h2 id="calculations-title">CALCULATIONS</h2>
          <span className="calculations-panel__heading-line" />
        </header>
        <div className="calculations-panel__body">
          <div className="calculations-panel__toolbar">
            <h3><span className="calculations-panel__load-symbol" aria-hidden="true">{configuration === 'Star' ? 'Y' : 'Δ'}</span>{configuration} Load Verification</h3>
            <label className="calculations-panel__selector" htmlFor="calculation-load">
              Select load to verify
              <select id="calculation-load" value={configuration} onChange={(event) => setConfiguration(event.target.value)}>
                {LOAD_CONFIGURATIONS.map((name) => <option key={name} value={name}>{name} Load</option>)}
              </select>
            </label>
          </div>
          <p className="calculations-panel__hint" id="calculation-hint">
            {observation
              ? `Use the recorded ${configuration} readings or enter values to calculate power and compare with W₁ + W₂.`
              : `Enter the ${configuration} line voltage and current. Add a ${configuration} observation to compare with the wattmeter readings.`}
          </p>
          <form onSubmit={calculate} aria-label={`${configuration} load calculation`} aria-describedby="calculation-hint">
            <div className="calculation-formula">
              <span className="calculation-formula__operator">P = √3 ×</span>
              <label className="calculation-field">
                <span>V<sub>L</sub> <small>(V)</small></span>
                <input aria-label="Line voltage (V)" type="text" inputMode="decimal" pattern="[0-9]+([.][0-9]+)?|[.][0-9]+" required placeholder="Voltage"
                  value={lineVoltage} onChange={(event) => updateField('lineVoltage', event.target.value)} />
              </label>
              <span className="calculation-formula__operator">×</span>
              <label className="calculation-field">
                <span>I<sub>L</sub> <small>(A)</small></span>
                <input aria-label="Line current (A)" type="text" inputMode="decimal" pattern="[0-9]+([.][0-9]+)?|[.][0-9]+" required placeholder="Current"
                  value={lineCurrent} onChange={(event) => updateField('lineCurrent', event.target.value)} />
              </label>
              <span className="calculation-formula__operator">×</span>
              <label className="calculation-field">
                <span>cos(φ)</span>
                <input aria-label="Power factor" type="text" value="1" readOnly />
              </label>
              <span className="calculation-formula__note">Where, cos(φ) = 1 for a resistive load</span>
            </div>
            <div className="calculation-actions">
              <div className="calculation-result">
                <span>P =</span>
                <output aria-label="Calculated power" aria-live="polite">{power != null ? power.toFixed(2) : '—'}</output>
                <span>W</span>
              </div>
              <button className="calculation-button" type="submit"><FormulaIcon />Calculate {configuration} Load</button>
            </div>
            <div className="calculation-verification" aria-live="polite">
              {calculation.error ? <p role="alert" className="calculation-verification__error">{calculation.error}</p>
                : power != null && observation ? <>
                  <p><strong>Measured power:</strong> W₁ + W₂ = {observation.w1} + {observation.w2} = <strong>{observation.measuredPower.toFixed(2)} W</strong></p>
                  <p><strong>Error:</strong> |W − P| / P × 100 = <strong>{percentageError.toFixed(2)}%</strong></p>
                </> : power != null ? <p>Power calculated. Record a {configuration} observation with ADD to verify the measured power and percentage error.</p> : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export default CalculationSection
