import SectionCard from './SectionCard.jsx'

const ObservationTable = ({ observations }) => (
  <SectionCard icon="table" id="observation-table-panel" title="OBSERVATION TABLE">
    <div className="observation-table-wrap">
      <table className="observation-table">
        <thead><tr>
          <th>S. No.</th><th>Load</th><th>V<sub>L</sub><br />(V)</th><th>I<sub>L</sub><br />(A)</th>
          <th>W<sub>1</sub><br />(W)</th><th>W<sub>2</sub><br />(W)</th><th>W<sub>1</sub> + W<sub>2</sub><br />(W)</th>
        </tr></thead>
        <tbody>{[0, 1].map((index) => {
          const row = observations[index]
          return <tr key={index}>
            <td>{row?.id ?? ''}</td><td>{row?.configuration ?? ''}</td>
            <td>{row?.lineVoltage ?? ''}</td><td>{row?.lineCurrent ?? ''}</td>
            <td>{row?.w1 ?? ''}</td><td>{row?.w2 ?? ''}</td>
            <td>{row ? <strong>{row.measuredPower}</strong> : ''}</td>
          </tr>
        })}</tbody>
      </table>
    </div>
  </SectionCard>
)
export default ObservationTable
