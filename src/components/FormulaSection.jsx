import { useState } from 'react'
import SectionCard from './SectionCard.jsx'
import { CheckIcon } from './Icons.jsx'

const views = ['formulas', 'verification']

const FormulaSection = ({ observations }) => {
  const [activeView, setActiveView] = useState('formulas')

  const changeTab = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length
    setActiveView(views[nextIndex])
    document.getElementById(`formula-tab-${views[nextIndex]}`)?.focus()
  }

  return (
    <SectionCard className="formula-section-card" icon="formula" id="formula-section-panel" title={
      <span className="formula-tabs" role="tablist" aria-label="Formulas and verification">
        {views.map((view, index) => <button key={view} type="button" role="tab"
          id={`formula-tab-${view}`} aria-controls={`formula-view-${view}`}
          aria-selected={activeView === view} tabIndex={activeView === view ? 0 : -1}
          onClick={() => setActiveView(view)} onKeyDown={(event) => changeTab(event, index)}>
          {view.toUpperCase()}
        </button>)}
      </span>
    }>
      <div className="formula-section">
        <div id="formula-view-formulas" role="tabpanel" aria-labelledby="formula-tab-formulas"
          tabIndex={0} hidden={activeView !== 'formulas'}>
          <div className="formula-grid">
            <article className="formula-tile">
              <h3>Measured power</h3>
              <p className="formula-equation">W = W<sub>1</sub> + W<sub>2</sub></p>
              <p className="formula-tile__note">Two-wattmeter method</p>
            </article>
            <article className="formula-tile formula-tile--theory">
              <h3>Theoretical power</h3>
              <p className="formula-equation">P = √3 × V<sub>L</sub> × I<sub>L</sub> × cosφ</p>
              <p className="formula-tile__note">Resistive load · cosφ = 1</p>
            </article>
            <article className="formula-tile">
              <h3>Percentage error</h3>
              <p className="formula-equation formula-equation--error" aria-label="Error in percent equals absolute W minus P, divided by P, times 100">
                <span aria-hidden="true">Error = </span>
                <span className="formula-fraction" aria-hidden="true"><span>|W − P|</span><span>P</span></span>
                <span aria-hidden="true"> × 100%</span>
              </p>
            </article>
            <article className="formula-tile">
              <h3>Phase voltage</h3>
              <div className="formula-phase-row"><span><b aria-hidden="true">Y</b> Star</span><span>V<sub>ph</sub> = V<sub>L</sub> / √3</span></div>
              <div className="formula-phase-row"><span><b aria-hidden="true">Δ</b> Delta</span><span>V<sub>ph</sub> = V<sub>L</sub></span></div>
            </article>
          </div>
        </div>
        <div className="formula-verification" id="formula-view-verification" role="tabpanel"
          aria-labelledby="formula-tab-verification" tabIndex={0} hidden={activeView !== 'verification'}>
          {observations.length > 0 ? (
            <table className="verification-table" aria-label="Power verification">
              <caption>Recorded power comparison</caption>
              <thead><tr><th scope="col">Load</th><th scope="col">P (W)</th><th scope="col">W (W)</th><th scope="col">Error</th></tr></thead>
              <tbody>{observations.map((row) => <tr key={row.configuration}>
                <th scope="row">{row.configuration}</th><td>{row.theoreticalPower.toFixed(2)}</td>
                <td>{row.measuredPower.toFixed(2)}</td><td><span className="verification-error">{row.percentageError.toFixed(2)}%</span></td>
              </tr>)}</tbody>
            </table>
          ) : (
            <div className="formula-empty-state">
              <CheckIcon />
              <strong>No readings recorded</strong>
              <p>Use ADD to record Star or Delta readings.</p>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
export default FormulaSection
