import { isReportReady } from './manualVerification.js'

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character])

export const generateExperimentReport = ({ observations, sessionStart, verification, connectionAttempts = 0 }) => {
  if (!isReportReady(verification, observations)) {
    return false
  }
  const rows = observations.map((row) => `<tr><td>${row.id}</td><td>${escapeHtml(row.configuration)}</td><td>${row.lineVoltage}</td><td>${row.lineCurrent}</td><td>${row.w1}</td><td>${row.w2}</td><td><strong>${row.measuredPower}</strong></td></tr>`).join('')
  const resultRows = observations.map((row) => {
    const entry = verification.entries[row.configuration]
    return `<tr><td>${escapeHtml(row.configuration)}</td><td>${escapeHtml(entry.lineVoltage)}</td><td>${escapeHtml(entry.lineCurrent)}</td><td>${Number(entry.power).toFixed(2)}</td><td>${entry.attempts}</td><td>Verified</td></tr>`
  }).join('')
  const attempts = Object.values(verification.entries).reduce((total, entry) => total + entry.attempts, 0)
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - sessionStart) / 1000))
  const elapsed = `${Math.floor(elapsedSeconds / 60)} min ${elapsedSeconds % 60} sec`
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
    <p class="meta">Virtual Labs IIT Roorkee · ${escapeHtml(new Date().toLocaleString())} · Duration: ${elapsed}</p>
    <p class="meta">Verification attempts: ${attempts} · Connection-check attempts (including Auto Connect): ${connectionAttempts}</p>
    <h2>Aim</h2><p>The aim of the experiment is to study and measure the power consumed by a three-phase resistive load using the two-wattmeter method.</p>
    <h2>Apparatus</h2><ul>
      <li>MCB — <strong>Rating:</strong> 16A, 3P, 415V AC, 50 Hz</li>
      <li>AC Voltmeter — <strong>Rating:</strong> 0 - 600 V</li>
      <li>AC Ammeter — <strong>Rating:</strong> 0 - 10 A</li>
      <li>Two AC Wattmeters — <strong>Rating:</strong> 0 - 600W</li>
      <li>Three-phase resistive lamp load with Star and Delta connections</li>
    </ul>
    <h2>Observation Table</h2><table><thead><tr><th>S. No.</th><th>Load</th><th>V<sub>L</sub> (V)</th><th>I<sub>L</sub> (A)</th><th>W<sub>1</sub> (W)</th><th>W<sub>2</sub> (W)</th><th>W<sub>1</sub> + W<sub>2</sub> (W)</th></tr></thead><tbody>${rows}</tbody></table>
    <h2>Theoretical Verification</h2><p>P = √3 × V<sub>L</sub> × I<sub>L</sub> × cosφ. For a resistive load, cosφ = 1. The values below were entered and verified by the user.</p>
    <h2>User-calculated Results</h2><table><thead><tr><th>Load</th><th>Entered V<sub>L</sub> (V)</th><th>Entered I<sub>L</sub> (A)</th><th>User-calculated P (W)</th><th>Attempts</th><th>Status</th></tr></thead><tbody>${resultRows}</tbody></table>
    <h2>Conclusion</h2><p>The manually calculated power values for both Star and Delta loads were verified. Total measured power is the sum of the two wattmeter readings, W<sub>1</sub> + W<sub>2</sub>. The Delta-connected load consumes more power and its lamps glow brighter. The Star-connected load consumes less power and its lamps glow less brightly. Phase voltage is V<sub>L</sub> / √3 in Star and V<sub>L</sub> in Delta.</p>
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
