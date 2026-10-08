import { PdfIcon } from './Icons.jsx'

const ReportControls = ({
  minReadings,
  onGenerateReport,
  readingCount,
  reportGenerated,
}) => {
  const readingsReady = readingCount >= minReadings

  return (
    <button
      id="generate-report-button"
      type="button"
      className="report-button"
      disabled={!readingsReady}
      aria-label="Generate Report"
      data-report-generated={reportGenerated ? 'true' : 'false'}
      onClick={onGenerateReport}
    >
      <PdfIcon />
      <span>Generate Report</span>
    </button>
  )
}

export default ReportControls
