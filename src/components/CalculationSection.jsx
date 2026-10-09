import { useState } from 'react'
import { LOAD_CONFIGURATIONS } from '../utils/threePhaseExperiment.js'
import { hasBothObservations, isAllowedVerificationInput } from '../utils/manualVerification.js'
import { FormulaIcon } from './Icons.jsx'

const CalculationSection = ({ observations, verification, onChange, onVerify, onNotify }) => {
  const [configuration, setConfiguration] = useState('Star')
  const entry = verification.entries[configuration]
  const enabled = verification.enabled && hasBothObservations(observations)

  const updateField = (field, value) => {
    if (isAllowedVerificationInput(field, value)) onChange(configuration, field, value)
  }

  const selectConfiguration = (event) => {
    const nextConfiguration = event.target.value
    setConfiguration(nextConfiguration)
    onNotify?.(`${nextConfiguration} Verification Selected`, 'Manually enter the line voltage and current from the observation table and your calculated power P, then click Verify.')
  }

  const verify = (event) => {
    event.preventDefault()
    if (enabled) onVerify(configuration)
  }

  return (
    <section className="calculations-panel" id="calculations-panel" aria-labelledby="calculations-title" aria-disabled={!enabled}>
      <div className="calculations-panel__sheet">
        <header className="calculations-panel__heading">
          <span className="calculations-panel__heading-line" />
          <FormulaIcon />
          <h2 id="calculations-title">THEORETICAL VERIFICATION</h2>
          <span className="calculations-panel__heading-line" />
        </header>
        <div className="calculations-panel__body">
          <fieldset className="calculations-panel__fields" disabled={!enabled}>
            <legend className="sr-only">Manual load verification</legend>
            <div className="calculations-panel__toolbar">
              <h3><span className="calculations-panel__load-symbol" aria-hidden="true">{configuration === 'Star' ? 'Y' : 'Δ'}</span>{configuration} Load Verification</h3>
              <select className="calculations-panel__selector" id="calculation-load" aria-label="Load configuration"
                value={configuration} onChange={selectConfiguration}>
                {LOAD_CONFIGURATIONS.map((name) => <option key={name} value={name}>{name} Load</option>)}
              </select>
              {entry.verified ? <span className="calculation-verified" role="status">Verified</span> : null}
            </div>
            <form onSubmit={verify} noValidate aria-label={`${configuration} load verification`}>
              <div className="calculation-formula">
                <span className="calculation-formula__operator">P = √3 ×</span>
                <label className="calculation-field">
                  <span>V<sub>L</sub> <small>(V)</small></span>
                  <input aria-label="Line voltage (V)" type="text" inputMode="numeric" maxLength={3}
                    pattern="4([0-4][0-9]|50)" title="Enter a three-digit voltage from 400 to 450 V." required
                    value={entry.lineVoltage} onChange={(event) => updateField('lineVoltage', event.target.value)} />
                </label>
                <span className="calculation-formula__operator">×</span>
                <label className="calculation-field">
                  <span>I<sub>L</sub> <small>(A)</small></span>
                  <input aria-label="Line current (A)" type="text" inputMode="decimal" maxLength={3}
                    pattern="[01]([.][0-9])?|2([.]0)?" title="Enter 0 to 2 A with at most one decimal place." required
                    value={entry.lineCurrent} onChange={(event) => updateField('lineCurrent', event.target.value)} />
                </label>
                <span className="calculation-formula__note">cos(φ) = 1 for a resistive load</span>
              </div>
              <div className="calculation-actions">
                <label className="calculation-result">
                  <span>P =</span>
                  <input aria-label="Calculated power (W)" type="text" inputMode="decimal" required
                    value={entry.power} onChange={(event) => onChange(configuration, 'power', event.target.value)} />
                  <span>W</span>
                </label>
                <button className="calculation-button" type="submit">Verify</button>
              </div>
            </form>
          </fieldset>
        </div>
      </div>
    </section>
  )
}

export default CalculationSection
