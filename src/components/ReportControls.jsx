import { PdfIcon } from './Icons.jsx'
import { hasBothObservations, isReportReady } from '../utils/manualVerification.js'

const ReportControls = ({
  observations = [],
  onGenerateReport,
  reportGenerated,
  verification,
}) => {
  const readingsReady = hasBothObservations(observations)
  const reportReady = isReportReady(verification, observations)

  return (
    <button
      id="generate-report-button"
      type="button"
      className="report-button"
      disabled={!reportReady}
      title={!readingsReady ? 'Record both Star and Delta observations first.'
        : !reportReady ? 'Complete theoretical verification for both Star Load Connection and Delta Load Connection first.' : 'Generate the experiment report.'}
      aria-label="Generate Report"
      data-report-generated={reportGenerated ? 'true' : 'false'}
      onClick={reportReady ? onGenerateReport : undefined}
    >
      <PdfIcon />
      <span>Generate Report</span>
    </button>
  )
}

export default ReportControls
