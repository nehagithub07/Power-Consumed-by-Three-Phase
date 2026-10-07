const ComparisonChart = ({ observations, error = false }) => {
  const maximum = error ? 5 : 1000
  const series = error ? [{ key: 'percentageError', label: 'Error', color: '#b45309' }]
    : [{ key: 'theoreticalPower', label: 'Theoretical', color: '#0f766e' }, { key: 'measuredPower', label: 'Measured', color: '#b45309' }]
  const title = error ? 'Percentage Error' : 'Theoretical & Measured Power'
  return (
    <article className="results-graph-card">
      <h3>{title}</h3>
      <svg className="results-graph-card__chart" viewBox="0 0 650 286" role="img" aria-label={title}>
        {[0, 1, 2, 3, 4, 5].map((tick) => {
          const y = 220 - tick * 34
          return <g key={tick}>
            <line x1="70" x2="610" y1={y} y2={y} className="results-graph__grid-line" />
            <text x="58" y={y + 4} textAnchor="end" className="results-graph__tick-label">{maximum * tick / 5}</text>
          </g>
        })}
        <path d="M70 50 V220 H610" className="results-graph__axis-line" />
        <text x="18" y="135" textAnchor="middle" transform="rotate(-90 18 135)" className="results-graph__axis-title">{error ? 'Error (%)' : 'Power (W)'}</text>
        {['Star', 'Delta'].map((configuration, index) => {
          const row = observations.find((observation) => observation.configuration === configuration)
          const center = 220 + index * 245
          return <g key={configuration}>
            <text x={center} y="245" textAnchor="middle" className="results-graph__tick-label">{configuration}</text>
            {row && series.map(({ key, label, color }, seriesIndex) => {
              const height = row[key] / maximum * 170
              const x = center - (error ? 25 : 58) + seriesIndex * 66
              return <g key={key}>
                <title>{`${configuration}: ${label} ${row[key].toFixed(2)} ${error ? '%' : 'W'}`}</title>
                <rect x={x} y={220 - height} width="50" height={height} rx="3" fill={color} />
                <text x={x + 25} y={212 - height} textAnchor="middle" className="results-graph__tick-label">{Number(row[key].toFixed(2))}</text>
              </g>
            })}
          </g>
        })}
        {series.map(({ label, color }, index) => <g key={label} transform={`translate(${220 + index * 160}, 270)`}>
          <rect width="12" height="12" y="-10" rx="2" fill={color} /><text x="20" className="results-graph__tick-label">{label}</text>
        </g>)}
        {!observations.length && <text x="340" y="125" textAnchor="middle" className="results-graph__tick-label">Record both loads, then click PLOT</text>}
      </svg>
    </article>
  )
}
const ResultsGraphs = ({ observations, plotted }) => (
  <section className="results-graphs-panel" id="results-graphs-panel" aria-label="Experiment result graphs">
    <div className="results-graphs-panel__heading"><h2>GRAPHS</h2></div>
    <div className="results-graphs-grid">
      <ComparisonChart observations={plotted ? observations : []} />
      <ComparisonChart observations={plotted ? observations : []} error />
    </div>
  </section>
)
export default ResultsGraphs
