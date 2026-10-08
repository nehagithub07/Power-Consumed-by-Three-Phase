const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character])

export const generateExperimentReport = ({ observations, sessionStart }) => {
  const rows = observations.map((row) => `<tr><td>${row.id}</td><td>${escapeHtml(row.configuration)}</td><td>${row.lineVoltage}</td><td>${row.lineCurrent}</td><td>${row.w1}</td><td>${row.w2}</td><td><strong>${row.measuredPower}</strong></td></tr>`).join('')
  const resultRows = observations.map((row) => `<tr><td>${escapeHtml(row.configuration)}</td><td>${row.theoreticalPower.toFixed(2)}</td><td>${row.measuredPower}</td><td>${row.percentageError.toFixed(2)}%</td></tr>`).join('')
  const calculations = observations.map((row) => `<p><strong>${escapeHtml(row.configuration)}:</strong> P = √3 × ${row.lineVoltage} × ${row.lineCurrent} = ${row.theoreticalPower.toFixed(2)} W; W = ${row.w1} + ${row.w2} = ${row.measuredPower} W; error = ${row.percentageError.toFixed(2)}%.</p>`).join('')
  const elapsed = Math.max(0, Math.round((Date.now() - sessionStart) / 60000))
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Three-Phase Power — Experiment Report</title>
    <style>
      *{box-sizing:border-box}body{margin:0;background:#eee2cf;color:#392615;font:14px/1.5 Arial,sans-serif}
      main{max-width:960px;margin:32px auto;padding:36px;background:#fffbf4;border:2px solid #987249;border-radius:12px}
      h1{font-size:26px;line-height:1.3;color:#50311a}h2{font-size:18px;margin:24px 0 8px;color:#694220}
      table{width:100%;border-collapse:collapse}th{background:#65401f;color:white}th,td{padding:9px;border:1px solid #ceb899;text-align:center}
      .meta{color:#725c46}
      button{padding:12px 20px;background:#65401f;color:white;border:0;border-radius:7px;cursor:pointer;font-weight:bold}
      @media print{body{background:white}main{margin:0;padding:10px;border:0}button{display:none}h2,table{break-inside:avoid}}@page{size:A4;margin:16mm}
    </style></head><body><main>
    <button onclick="window.print()">Print / Save as PDF</button>
    <h1>Power Consumed by Three-Phase Resistive Load by Two-Wattmeter Method</h1>
    <p class="meta">Virtual Labs IIT Roorkee · ${escapeHtml(new Date().toLocaleString())} · Duration: ${elapsed} min</p>
    <h2>Aim</h2><p>Measure the power consumed by Star-connected and Delta-connected three-phase resistive loads using two wattmeters.</p>
    <h2>Apparatus</h2><p>MCB (1–3), voltmeter (4–5), ammeter (6–7), W1 (8–11), W2 (12–15), lamp load (16–21).</p>
    <h2>Observation Table</h2><table><thead><tr><th>S. No.</th><th>Load</th><th>VL (V)</th><th>IL (A)</th><th>W1 (W)</th><th>W2 (W)</th><th>W1 + W2 (W)</th></tr></thead><tbody>${rows}</tbody></table>
    <h2>Formula and Verification</h2><p>W = W1 + W2. P = √3 × VL × IL × cosφ. For a resistive load, cosφ = 1.<br>Error (%) = |W − P| / P × 100. Calculations retain full precision until display.</p>${calculations}
    <h2>Result</h2><table><thead><tr><th>Load</th><th>Theoretical Power (W)</th><th>Measured Power (W)</th><th>Error</th></tr></thead><tbody>${resultRows}</tbody></table>
    <p>The Delta-connected load consumes more power and its lamps glow brighter. The Star-connected load consumes less power and its lamps glow less brightly. Phase voltage is VL / √3 in Star and VL in Delta.</p>
    </main></body></html>`
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const reportWindow = window.open(url, '_blank')
  if (!reportWindow) {
    URL.revokeObjectURL(url)
    return false
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  return true
}
