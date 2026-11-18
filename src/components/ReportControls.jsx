import { PdfIcon } from './Icons.jsx'
import { hasBothObservations, isReportReady, isVerificationComplete } from '../utils/manualVerification.js'

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
        : !isVerificationComplete(verification) ? 'Complete the Star and Delta power calculations first.'
        : !reportReady ? 'Complete error analysis for both Star and Delta loads first.' : 'Generate the experiment report.'}
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
