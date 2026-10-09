import SectionCard from './SectionCard.jsx'

const FormulaSection = () => {
  return (
    <SectionCard className="formula-section-card" icon="formula" id="formula-section-panel" title="FORMULAS">
      <div className="formula-section">
        <div className="formula-grid">
          <article className="formula-tile formula-tile--theory">
            <h3>Theoretical power</h3>
            <p className="formula-equation">P = √3 × V<sub>L</sub> × I<sub>L</sub> × cosφ</p>
            <p className="formula-tile__note">Resistive load · cosφ = 1</p>
          </article>
          <article className="formula-tile">
            <h3>Phase voltage</h3>
            <div className="formula-phase-row"><span><b aria-hidden="true">Y</b> Star</span><span>V<sub>ph</sub> = V<sub>L</sub> / √3</span></div>
            <div className="formula-phase-row"><span><b aria-hidden="true">Δ</b> Delta</span><span>V<sub>ph</sub> = V<sub>L</sub></span></div>
          </article>
          <article className="formula-tile formula-tile--error">
            <h3>Error Analysis</h3>
            <p className="formula-equation formula-equation--error" aria-label="Percent error equals the absolute difference between Measured Value and True Value, divided by True Value, times 100">
              <span aria-hidden="true">% Error = </span>
              <span className="formula-fraction" aria-hidden="true"><span>|Measured Value − True Value|</span><span>True Value</span></span>
              <span aria-hidden="true"> × 100</span>
            </p>
            <p className="formula-tile__note">True Value = Theoretical Value</p>
          </article>
        </div>
      </div>
    </SectionCard>
  )
}
export default FormulaSection
