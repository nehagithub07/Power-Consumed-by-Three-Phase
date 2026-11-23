import { PdfIcon } from './Icons.jsx'
import { isReportReady } from '../utils/manualVerification.js'

const ReportControls = ({
  observations = [],
  onGenerateReport,
  reportGenerated,
  verification,
}) => {
  const reportReady = isReportReady(verification, observations)

  return (
    <button
      id="generate-report-button"
      type="button"
      className="report-button"
      disabled={!reportReady}
      aria-label="GENERATE REPORT"
      data-report-generated={reportGenerated ? 'true' : 'false'}
      onClick={reportReady ? onGenerateReport : undefined}
    >
      <PdfIcon />
      <span>GENERATE REPORT</span>
    </button>
  )
}

export default ReportControls
