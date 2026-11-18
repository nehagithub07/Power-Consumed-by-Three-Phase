import { useState } from 'react'
import { LOAD_CONFIGURATIONS } from '../utils/threePhaseExperiment.js'
import { hasBothObservations, isAllowedVerificationInput } from '../utils/manualVerification.js'
import { PercentIcon, FormulaIcon } from './Icons.jsx'

const CalculationSection = ({ observations, verification, onChange, onCalculate, onErrorChange, onCalculateErrors }) => {
  const [configuration, setConfiguration] = useState('Star')
  const entry = verification.entries[configuration]
  const enabled = verification.enabled && hasBothObservations(observations)

  const updateField = (field, value) => {
    if (isAllowedVerificationInput(field, value)) onChange(configuration, field, value)
  }

  const selectConfiguration = (event) => {
    const nextConfiguration = event.target.value
    setConfiguration(nextConfiguration)
  }

  const calculate = (event) => {
    event.preventDefault()
    if (enabled) onCalculate(configuration)
  }

  const calculateErrors = (event) => {
    event.preventDefault()
    if (enabled) onCalculateErrors(configuration)
  }

  return (
    <section className="calculations-panel" id="calculations-panel" aria-labelledby="calculations-title">
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
            </div>
            <form onSubmit={calculate} noValidate aria-label={`${configuration} load verification`}>
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
                <span className="calculation-formula__operator">×</span>
                <label className="calculation-field">
                  <span>cos φ</span>
                  <input aria-label="Power factor (cos phi)" aria-describedby="cos-phi-note" type="text" inputMode="decimal"
                    pattern="(0([.][0-9]+)?|1([.]0+)?|[.][0-9]+)" title="Enter the power factor from 0 to 1. For this resistive load, enter 1." required
                    value={entry.cosPhi ?? ''} onChange={(event) => updateField('cosPhi', event.target.value)} />
                </label>
              </div>
              <p className="calculation-formula__note" id="cos-phi-note">For a resistive load, enter cos φ = 1.</p>
              <div className="calculation-actions">
                <label className="calculation-result">
                  <span>P =</span>
                  <input aria-label="Calculated power (W)" type="text" inputMode="decimal" required
                    value={entry.power} onChange={(event) => onChange(configuration, 'power', event.target.value)} />
                  <span>W</span>
                </label>
                <button className="calculation-button" type="submit">Calculate</button>
              </div>
            </form>
          </fieldset>
          {!enabled ? <p className="calculations-panel__hint">Record both Star and Delta observations to enable verification.</p> : null}
        </div>
      </div>
      <section className="calculations-panel__sheet error-analysis-panel" aria-labelledby="error-analysis-title">
        <header className="calculations-panel__heading">
          <span className="calculations-panel__heading-line" />
          <PercentIcon />
          <h2 id="error-analysis-title">ERROR ANALYSIS</h2>
          <span className="calculations-panel__heading-line" />
        </header>
        <div className="calculations-panel__body">
          <form className="error-analysis-form" onSubmit={calculateErrors} noValidate aria-label={`${configuration} error analysis`}>
            <p className="error-analysis-note">True Value = Theoretical Value</p>
            {LOAD_CONFIGURATIONS.map((load) => {
              const loadEntry = verification.entries[load]
              return (
                <article className="error-analysis-load formula-tile" key={load} aria-label={`${load} error formula`}>
                  <div className="error-analysis-load__heading">
                    <h3>{load} Load</h3>
                  </div>
                  <div className="error-analysis-equation">
                    <span className="error-analysis-operator error-analysis-operator--label">% Error =</span>
                    <div className="error-analysis-fraction">
                      <div className="error-analysis-numerator">
                        <span className="error-analysis-absolute-bar" aria-hidden="true">|</span>
                        <label className="error-analysis-value">
                          <span>Measured Value <small>(W)</small></span>
                          <input className="error-analysis-input" aria-label={`${load} measured value in numerator (W)`} type="text" inputMode="decimal"
                            required disabled={!enabled || load !== configuration} title="Manually enter the measured value in watts."
                            value={loadEntry.errorMeasuredPower ?? ''} onChange={(event) => onErrorChange(load, 'errorMeasuredPower', event.target.value)} />
                        </label>
                        <span className="error-analysis-minus" aria-hidden="true">−</span>
                        <label className="error-analysis-value">
                          <span>True Value <small>(W)</small></span>
                          <input className="error-analysis-input" aria-label={`${load} true value in numerator (W)`} type="text" inputMode="decimal"
                            required disabled={!enabled || load !== configuration} title="Manually enter the theoretical value in watts."
                            value={loadEntry.errorTruePower ?? ''} onChange={(event) => onErrorChange(load, 'errorTruePower', event.target.value)} />
                        </label>
                        <span className="error-analysis-absolute-bar" aria-hidden="true">|</span>
                      </div>
                      <label className="error-analysis-denominator">
                        <span>True Value <small>(W)</small></span>
                        <input className="error-analysis-input" aria-label={`${load} true value in denominator (W)`} type="text" inputMode="decimal"
                          required disabled={!enabled || load !== configuration} title="Manually enter the theoretical value in the denominator in watts."
                          value={loadEntry.errorDenominator ?? ''} onChange={(event) => onErrorChange(load, 'errorDenominator', event.target.value)} />
                      </label>
                    </div>
                    <span className="error-analysis-operator error-analysis-operator--multiplier">× 100 =</span>
                    <output className="error-analysis-result" aria-live="polite" aria-label={`${load} percentage error`}>
                      {loadEntry.percentageError != null && loadEntry.errorDenominator != null ? `${loadEntry.percentageError.toFixed(2)}%` : '—'}
                    </output>
                  </div>
                </article>
              )
            })}
            <button className="calculation-button error-analysis-button" type="submit" disabled={!enabled}>Calculate Error</button>
          </form>
        </div>
      </section>
    </section>
  )
}

export default CalculationSection
