import SectionCard from './SectionCard.jsx'

const FormulaSection = ({ observations }) => (
  <SectionCard className="formula-section-card" icon="formula" id="formula-section-panel" title="FORMULAS & VERIFICATION">
    <div className="formula-section">
      <p><strong>Measured power:</strong> W = W1 + W2</p>
      <p><strong>Theoretical power:</strong> P = √3 × VL × IL × cosφ</p>
      <p>For a resistive load, cosφ = 1.</p>
      <p><strong>Error (%)</strong> = |W − P| / P × 100</p>
      <p><strong>Phase voltage:</strong> Star = VL / √3; Delta = VL</p>
      {observations.length > 0 && (
        <table className="verification-table" aria-label="Power verification">
          <thead><tr><th>Load</th><th>P (W)</th><th>W (W)</th><th>Error</th></tr></thead>
          <tbody>{observations.map((row) => <tr key={row.configuration}>
            <td>{row.configuration}</td><td>{row.theoreticalPower.toFixed(2)}</td>
            <td>{row.measuredPower}</td><td>{row.percentageError.toFixed(2)}%</td>
          </tr>)}</tbody>
        </table>
      )}
    </div>
  </SectionCard>
)
export default FormulaSection
