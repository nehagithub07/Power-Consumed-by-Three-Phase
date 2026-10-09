import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import './ConnectionEndpoints.css'
import ConnectionLab from './components/ConnectionLab.jsx'
import ActionButtons from './components/ActionButtons.jsx'
import ObservationTable from './components/ObservationTable.jsx'
import FormulaSection from './components/FormulaSection.jsx'
import HeaderBoard from './components/HeaderBoard.jsx'
import ReportControls from './components/ReportControls.jsx'
import CalculationSection from './components/CalculationSection.jsx'
import SectionCard from './components/SectionCard.jsx'
import WalkthroughStartButton from './walkthrough/components/WalkthroughStartButton.jsx'
import { useLabAlerts } from './alerts/useLabAlerts.js'
import { getWiringStepAlert } from './alerts/experimentAlerts.js'
import { generateExperimentReport } from './utils/reportGenerator.js'
import { LOAD_CONFIGURATIONS, createObservation, getReadings, validateConnections } from './utils/threePhaseExperiment.js'
import {
  createVerificationState, hasBothObservations, isReportReady, isVerificationComplete,
  submitVerification, unlockVerification, updateVerificationEntry,
} from './utils/manualVerification.js'

const BASE_WIDTH = 1440
const CONTENT_HEIGHT = 1450
const getScale = () => Math.max(Math.min((window.innerWidth - 32) / BASE_WIDTH, 1), 0.1)

const App = () => {
  const { clearAlerts, showAlert } = useLabAlerts()
  const [scale, setScale] = useState(getScale)
  const [configuration, setConfiguration] = useState('Star')
  const [powerOn, setPowerOn] = useState(false)
  const [connectionsVerified, setConnectionsVerified] = useState(false)
  const [observations, setObservations] = useState([])
  const [verification, setVerification] = useState(createVerificationState)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [guidePlaying, setGuidePlaying] = useState(false)
  const [wiringReady, setWiringReady] = useState(false)
  const [wiringProgress, setWiringProgress] = useState(() => validateConnections([], 'Star'))
  const [status, setStatus] = useState('Select Star or Delta. Connect the wires and click CHECK, or use AUTO CONNECT to connect and verify automatically.')
  const [sessionStart, setSessionStart] = useState(() => Date.now())
  const circuitRef = useRef(null)
  const initialAlertShown = useRef(false)
  const suppressWiringAlerts = useRef(false)
  const previousWiringProgress = useRef(validateConnections([], 'Star'))
  const readings = getReadings(configuration, powerOn)
  const alreadyRecorded = observations.some((row) => row.configuration === configuration)
  const bothRecorded = hasBothObservations(observations)
  const bothVerified = isReportReady(verification, observations)
  const nextConnection = wiringProgress.missingConnections[0]
  const activeStep = bothRecorded ? (reportGenerated ? 'finish' : bothVerified ? 'report' : 'calculations')
    : alreadyRecorded ? 'configuration'
      : !connectionsVerified ? (wiringProgress.isCorrect ? 'check' : 'connections')
        : !powerOn ? 'mcb' : 'reading'
  const guideText = bothRecorded
    ? reportGenerated ? 'Report generated. Review the calculations for both configurations.'
      : bothVerified ? 'Both load calculations are verified. Click Generate Report to review your results.'
        : 'Theoretical verification is enabled. Manually enter the voltage, current and calculated power for each load, then click Verify.'
    : alreadyRecorded
      ? `${powerOn ? 'Turn off the MCB, then select' : 'Select'} the other load configuration, change the lamp links and click CHECK or AUTO CONNECT.`
      : !connectionsVerified
    ? wiringProgress.wrongConnections.length
      ? 'Remove the incorrect connections by clicking their terminal numbers, then click CHECK.'
      : nextConnection ? `Connect terminal ${nextConnection.terminals[0]} to terminal ${nextConnection.terminals[1]}.`
        : 'All wires are connected. Click CHECK to verify the connections.'
        : !powerOn ? 'Turn on the MCB.'
          : 'Observe line voltage, line current, W1 and W2. Click ADD to record the readings.'

  useEffect(() => {
    const resize = () => setScale(getScale())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    if (!guidePlaying || !('speechSynthesis' in window)) return
    const speech = new SpeechSynthesisUtterance(guideText)
    speech.lang = 'en-IN'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(speech)
    return () => window.speechSynthesis.cancel()
  }, [guidePlaying, guideText])

  const notify = useCallback((title, description, type = 'info', options = {}) => {
    setStatus(description)
    showAlert({ ...options, title, description, type })
  }, [showAlert])

  const handleReady = useCallback((api) => {
    circuitRef.current = api
    setWiringReady(Boolean(api))
    if (api && !initialAlertShown.current) {
      initialAlertShown.current = true
      notify('Start the Experiment', 'Select Star or Delta. Connect the terminals and click CHECK, or use AUTO CONNECT to connect and verify the circuit automatically.')
    }
  }, [notify])

  const handleWiringChange = useCallback((progress) => {
    const previous = previousWiringProgress.current
    previousWiringProgress.current = progress
    setWiringProgress(progress)
    setConnectionsVerified(false)
    setPowerOn(false)
    if (suppressWiringAlerts.current) return
    const alert = getWiringStepAlert(progress, previous, configuration)
    if (alert) notify(alert.title, alert.description, alert.type, alert)
  }, [configuration, notify])

  const selectConfiguration = (nextConfiguration) => {
    if (powerOn || nextConfiguration === configuration) return
    setConfiguration(nextConfiguration)
    setConnectionsVerified(false)
    const progress = circuitRef.current?.validate(nextConfiguration) ?? validateConnections([], nextConfiguration)
    previousWiringProgress.current = progress
    setWiringProgress(progress)
    clearAlerts()
    notify(`${nextConfiguration} Load Selected`, progress.totalConnections === 0
      ? `Connect the supply, meters and ${nextConfiguration} lamp links, then click CHECK. You can also use AUTO CONNECT to connect and verify this load automatically.`
      : nextConfiguration === 'Delta'
      ? 'Keep the supply and wattmeter wires. Remove (17–19), (19–21); add (16–19), (18–21), (17–20). Then click CHECK.'
      : 'Keep the supply and wattmeter wires. Remove the Delta links and join (17–19), (19–21). Then click CHECK.')
  }

  const handleCheck = (automatic = false) => {
    if (!circuitRef.current || powerOn) return
    setConnectionAttempts((attempts) => attempts + 1)
    clearAlerts()
    const result = circuitRef.current.validate()
    setWiringProgress(result)
    setConnectionsVerified(result.isCorrect)
    if (result.isCorrect) {
      notify(automatic ? 'Auto Connect Complete' : 'Right Connections', `${configuration} connections verified. Switch ON the MCB to observe the readings.`, 'success')
    } else {
      const wrong = result.wrongConnections.map(({ label }) => `(${label})`).join(', ')
      const missing = result.missingConnections.map(({ label }) => `(${label})`).join(', ')
      notify('Invalid Connections', [
        wrong && `Remove incorrect or duplicate wires: ${wrong}.`,
        missing && `Missing connections: ${missing}.`,
        'Click a terminal number to remove its wires.',
      ].filter(Boolean).join('\n\n'), 'warning')
    }
  }

  const handleAutoConnect = () => {
    if (!circuitRef.current || powerOn) return
    clearAlerts()
    suppressWiringAlerts.current = true
    try {
      circuitRef.current.autoConnect()
    } finally {
      suppressWiringAlerts.current = false
    }
    handleCheck(true)
  }

  const togglePower = () => {
    if (powerOn) {
      setPowerOn(false)
      notify('MCB Switched OFF', bothRecorded
        ? 'Both observations are recorded. Verify both loads in the theoretical verification section, then generate the report.'
        : alreadyRecorded ? 'Select the other load configuration, update the lamp links, then click CHECK or AUTO CONNECT.'
          : 'You can edit the wiring or change the load. Switch ON the MCB again to record this load’s readings.')
      return
    }
    if (!connectionsVerified || !circuitRef.current?.validate().isCorrect) {
      notify('Check the Connections', 'Connect the wires and click CHECK, or use AUTO CONNECT to connect and verify automatically before switching ON the MCB.', 'warning')
      return
    }
    setPowerOn(true)
    notify('MCB Switched ON', `${configuration} lamps glow ${configuration === 'Star' ? 'dimly' : 'brightly'}. ${alreadyRecorded
      ? 'This load is already recorded. Switch OFF the MCB to change loads or open the verification panel to compare the readings.'
      : 'Observe the voltmeter, ammeter and both wattmeters, then click ADD to record the readings.'}`, 'success')
  }

  const recordObservation = () => {
    if (!powerOn || !connectionsVerified) return
    if (alreadyRecorded) {
      notify('Reading Already Exists', bothRecorded
        ? 'Both load observations are already recorded. Verify both loads in the theoretical verification section, then generate the report.'
        : `The ${configuration} reading is already recorded. Switch off the MCB and select the other configuration.`, 'warning')
      return
    }
    const nextObservations = [...observations, createObservation(configuration, observations.length + 1)]
    setObservations(nextObservations)
    setVerification((current) => unlockVerification(current, nextObservations))
    setReportGenerated(false)
    notify('Reading Added', `${configuration} readings added: W1 + W2 = ${readings.w1 + readings.w2} W. ${hasBothObservations(nextObservations) ? 'Theoretical verification is now enabled. Manually enter the voltage, current and calculated power for each load, then click Verify.' : 'Switch OFF the MCB and repeat for the other configuration.'}`, 'success')
  }

  const reset = () => {
    clearAlerts()
    setGuidePlaying(false)
    suppressWiringAlerts.current = true
    try {
      circuitRef.current?.reset()
    } finally {
      suppressWiringAlerts.current = false
    }
    setConfiguration('Star')
    setPowerOn(false)
    setConnectionsVerified(false)
    setWiringProgress(validateConnections([], 'Star'))
    previousWiringProgress.current = validateConnections([], 'Star')
    setObservations([])
    setVerification(createVerificationState())
    setConnectionAttempts(0)
    setReportGenerated(false)
    setSessionStart(Date.now())
    notify('Simulation Reset', 'Wires, readings and calculations have been cleared. Select a load, then connect the terminals and click CHECK or use AUTO CONNECT.', 'success')
  }

  const updateCalculation = (load, field, value) => {
    if (!verification.enabled || !bothRecorded) return
    setVerification((current) => updateVerificationEntry(current, load, field, value))
    setReportGenerated(false)
  }

  const verifyCalculation = (load) => {
    const next = submitVerification(verification, load, observations)
    if (next === verification) {
      notify('Verification Locked', 'Add both Star and Delta observations to enable theoretical verification.', 'warning')
      return
    }
    setVerification(next)
    setReportGenerated(false)
    const result = next.entries[load].feedback
    const nextStep = isVerificationComplete(next)
      ? ' Both loads are verified. You can now generate the report.'
      : ` Select ${load === 'Star' ? 'Delta' : 'Star'} and verify its calculated power next.`
    notify(result.title, result.description + (result.verified ? nextStep : ''), result.type)
  }

  const report = () => {
    if (!bothRecorded || !bothVerified) {
      notify('Complete Both Verifications', 'Record Star and Delta observations and verify both manual power calculations before generating the report.', 'warning')
      return
    }
    const opened = generateExperimentReport({ observations, sessionStart, verification, connectionAttempts })
    setReportGenerated(opened)
    if (!opened) notify('Report Window Blocked', 'Allow pop-ups for this page, then click Generate Report again.', 'warning')
    else notify('Report Generated', 'The report includes your observations, entered power values, attempts and conclusion. Use Print / Save as PDF in the report window.', 'success')
  }

  const toggleGuide = () => {
    setGuidePlaying(!guidePlaying)
    notify(guidePlaying ? 'AI Guide Stopped' : 'AI Guide Started', guidePlaying
      ? 'Continue the experiment using INSTRUCTIONS. Click AI GUIDE to hear the next step again.'
      : guideText)
  }

  const printSimulation = () => {
    notify('Print Simulation', 'Choose a printer or Save as PDF in the print dialog to save the current experiment.')
    window.print()
  }

  return (
    <div id="app-wrapper">
      <div id="app-viewport" style={{ height: CONTENT_HEIGHT * scale, width: BASE_WIDTH * scale }}>
        <div id="app-scale" style={{ '--app-scale': scale, '--app-render-scale': 2, height: CONTENT_HEIGHT * 2, width: BASE_WIDTH * 2 }}>
          <div id="app-render">
            <main className="simulation-shell" id="walkthrough-demo-experiment">
              <HeaderBoard />
              <WalkthroughStartButton variant="side-tab" />
              <section className="workspace-grid">
                <aside className="left-panel">
                  <ActionButtons configuration={configuration} activeConnectionPair={nextConnection?.label}
                    activeInstructionStepId={activeStep} activeButtons={{ onAiGuide: guidePlaying }}
                    disabledButtons={{ onAdd: !powerOn || !connectionsVerified, onAutoConnect: !wiringReady || powerOn,
                      onCheck: !wiringReady || powerOn || connectionsVerified, onAiGuide: !wiringReady }}
                    onAdd={recordObservation} onCheck={() => handleCheck()}
                    onPrint={printSimulation} onReset={reset}
                    onAiGuide={toggleGuide}
                    onInstructionsOpen={() => notify('Experiment Instructions', 'Follow the numbered steps in the instructions panel. The active step and next connection are highlighted as you work.')}
                    onAutoConnect={handleAutoConnect} />
                  <SectionCard icon="buttons" title="LOAD CONNECTION" id="load-configuration-panel">
                    <div className="load-configuration" role="group" aria-label="Load connection">
                      {LOAD_CONFIGURATIONS.map((name) => (
                        <button key={name} type="button" aria-pressed={configuration === name} disabled={powerOn}
                          onClick={() => selectConfiguration(name)}>{name === 'Star' ? 'Y' : 'Δ'} {name}</button>
                      ))}
                    </div>
                    <p className="configuration-note">{powerOn ? 'Switch OFF the MCB to change configuration.'
                      : connectionsVerified ? 'Connections verified. Switch ON the MCB.'
                        : 'Connect and CHECK, or use AUTO CONNECT.'}</p>
                  </SectionCard>
                  <ObservationTable observations={observations} />
                  <FormulaSection />
                  <ReportControls observations={observations} verification={verification}
                    onGenerateReport={report} reportGenerated={reportGenerated} />
                </aside>
                <section className="right-panel">
                  <ConnectionLab configuration={configuration} powerOn={powerOn} readings={readings} scale={scale}
                    onReady={handleReady} onWiringChange={handleWiringChange} onTogglePower={togglePower}
                    highlightedTerminals={guidePlaying && !connectionsVerified ? nextConnection?.terminals ?? [] : []} />
                  <p className="sr-only" role="status" aria-live="polite">{guidePlaying ? guideText : status}</p>
                </section>
              </section>
            </main>
            <CalculationSection key={sessionStart} observations={observations} verification={verification}
              onChange={updateCalculation} onVerify={verifyCalculation} onNotify={notify} />
            <footer className="simulation-footer">&copy; 2026 Virtual Labs IIT Roorkee</footer>
          </div>
        </div>
      </div>
    </div>
  )
}
export default App
