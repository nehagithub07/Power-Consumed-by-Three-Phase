import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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
import { EXPERIMENT_MESSAGES, getConnectionCheckMessage, getWrongConnectionMessage } from './audio/simulationAudio.js'
import { useNarrationPlayer } from './audio/useNarrationPlayer.js'
import { useExperimentGuide } from './aiGuide/useExperimentGuide.js'
import { generateExperimentReport } from './utils/reportGenerator.js'
import { CONNECTIONS, LOAD_CONFIGURATIONS, createObservation, getReadings, validateConnections } from './utils/threePhaseExperiment.js'
import {
  createVerificationState, hasBothObservations, isReportReady, isVerificationComplete,
  submitErrorAnalysis, submitVerification, unlockVerification, updateErrorAnalysisEntry, updateVerificationEntry,
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
  const [printRequested, setPrintRequested] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [wiringReady, setWiringReady] = useState(false)
  const [wiringProgress, setWiringProgress] = useState(() => validateConnections([], 'Star'))
  const [status, setStatus] = useState('Select Star or Delta. Connect the wires and click CHECK, or use AUTO CONNECT to connect and verify automatically.')
  const [sessionStart, setSessionStart] = useState(() => Date.now())
  const circuitRef = useRef(null)
  const configurationRef = useRef('Star')
  const conversionRef = useRef(null)
  const suppressWiringAlerts = useRef(false)
  const previousWiringProgress = useRef(validateConnections([], 'Star'))
  const alreadyRecorded = observations.some((row) => row.configuration === configuration)
  const bothRecorded = hasBothObservations(observations)
  const bothVerified = isVerificationComplete(verification)
  const nextConnection = wiringProgress.missingConnections[0]
  const errorsCalculated = LOAD_CONFIGURATIONS.every(load => verification.entries[load].percentageError != null)
  const activeStep = printRequested ? 'reset' : bothRecorded
    ? reportGenerated ? 'print' : !bothVerified ? 'calculations' : !errorsCalculated ? 'errors' : 'report'
    : alreadyRecorded ? 'configuration'
    : !connectionsVerified ? wiringProgress.isCorrect ? 'check' : 'connections'
    : !powerOn ? 'mcb' : 'reading'
  const readings = getReadings(configuration, powerOn)
  const { play, playSequence, stop: stopPlayback } = useNarrationPlayer()
  const getProgress = useCallback(() => (
    circuitRef.current?.validate(configurationRef.current) ?? validateConnections([], configurationRef.current)
  ), [])
  const guide = useExperimentGuide({ getProgress, onStatus: setStatus, play, playSequence, stopPlayback })

  const advanceToReset = useCallback(() => {
    setPrintRequested(true)
    setInstructionsOpen(true)
  }, [])

  useEffect(() => {
    const resize = () => setScale(getScale())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])


  const announce = useCallback((key, options = {}) => {
    const message = typeof key === 'string' ? EXPERIMENT_MESSAGES[key] : key
    setStatus(message.text)
    if (message.alert) {
      // Replace the visible alert before its corresponding narration starts.
      flushSync(() => {
        clearAlerts()
        showAlert({
          title: message.title, description: message.text, type: message.type,
          duration: Math.max(6500, message.text.length * 60), ...options,
        })
      })
    }
    return play(message)
  }, [clearAlerts, play, showAlert])

  const handleReady = useCallback(api => {
    circuitRef.current = api
    setWiringReady(Boolean(api))
  }, [])

  const handleWiringChange = useCallback(progress => {
    progress = circuitRef.current?.validate(configurationRef.current) ?? progress
    const previous = previousWiringProgress.current
    previousWiringProgress.current = progress
    setWiringProgress(progress)
    setConnectionsVerified(false)
    setPowerOn(false)
    if (suppressWiringAlerts.current) return
    const newWrongConnection = progress.wrongConnections.some(connection => (
      !previous.wrongConnections.some(previousConnection => (
        previousConnection.label === connection.label && previousConnection.duplicate === connection.duplicate
      ))
    ))
    if (newWrongConnection) {
      guide.resumeConnections(announce(getWrongConnectionMessage(progress, configurationRef.current)), false)
    } else {
      guide.updateProgress(progress, previous)
    }
    const previousLoad = conversionRef.current
    if (previousLoad) {
      const oldProgress = circuitRef.current?.validate(previousLoad)
      const lampLinks = CONNECTIONS[previousLoad].slice(12)
      const removed = oldProgress && lampLinks.every(([first, second]) => (
        oldProgress.missingConnections.some(({ label }) => label === `${first}-${second}`)
      ))
      if (removed) {
        conversionRef.current = null
        guide.suspend()
        const nextConfiguration = previousLoad === 'Star' ? 'Delta' : 'Star'
        configurationRef.current = nextConfiguration
        setConfiguration(nextConfiguration)
        const nextProgress = circuitRef.current.validate(nextConfiguration)
        previousWiringProgress.current = nextProgress
        setWiringProgress(nextProgress)
        const announcement = announce(previousLoad === 'Star' ? 'starRemoved' : 'deltaRemoved')
        guide.resumeConnections(announcement)
      }
    }
  }, [announce, guide])

  const selectConfiguration = nextConfiguration => {
    if (powerOn || nextConfiguration === configuration) return
    guide.suspend()
    configurationRef.current = nextConfiguration
    setConfiguration(nextConfiguration)
    setConnectionsVerified(false)
    const progress = circuitRef.current?.validate(nextConfiguration) ?? validateConnections([], nextConfiguration)
    previousWiringProgress.current = progress
    setWiringProgress(progress)
    const announcement = announce(nextConfiguration === 'Star' ? 'starSelected' : 'deltaSelected')
    guide.resumeConnections(announcement)
  }

  const handleCheck = (automatic = false) => {
    if (!circuitRef.current || powerOn) return
    setConnectionAttempts(attempts => attempts + 1)
    const result = getProgress()
    setWiringProgress(result)
    setConnectionsVerified(result.isCorrect)
    if (result.isCorrect) {
      guide.suspend()
      announce(automatic ? 'autoConnect' : 'connectionsVerified')
      return
    }
    const message = getConnectionCheckMessage(result, configurationRef.current, connectionAttempts === 0)
    guide.resumeConnections(announce(message), !message.silent)
  }

  const handleAutoConnect = () => {
    if (!circuitRef.current || powerOn) return
    guide.suspend()
    conversionRef.current = null
    suppressWiringAlerts.current = true
    try {
      circuitRef.current.autoConnect(configurationRef.current)
    } finally {
      suppressWiringAlerts.current = false
    }
    handleCheck(true)
  }

  const togglePower = () => {
    if (powerOn) {
      if (!alreadyRecorded) {
        announce({
          text: `Add the ${configuration} load readings to the observation table before turning OFF the MCB.`,
          title: 'Record Readings First', type: 'warning', alert: true,
        })
        return
      }
      guide.suspend()
      setPowerOn(false)
      conversionRef.current = configuration
      announce('mcbOff' + configuration)
      return
    }
    if (!connectionsVerified || !getProgress().isCorrect) {
      guide.resumeConnections(announce('mcbBlocked'))
      return
    }
    guide.suspend()
    setPowerOn(true)
    announce('mcbOn' + configuration)
  }

  const recordObservation = () => {
    if (!powerOn || !connectionsVerified) return
    if (alreadyRecorded) {
      announce('duplicateReading')
      return
    }
    const nextObservations = [...observations, createObservation(configuration, observations.length + 1)]
    setObservations(nextObservations)
    setVerification(current => unlockVerification(current, nextObservations))
    setReportGenerated(false)
    setPrintRequested(false)
    announce(nextObservations.length === 1 ? 'firstReading' : 'secondReading')
  }

  const reset = () => {
    clearAlerts()
    guide.stop()
    conversionRef.current = null
    configurationRef.current = 'Star'
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
    setPrintRequested(false)
    setSessionStart(Date.now())
    announce('reset')
  }

  const updateCalculation = (load, field, value) => {
    if (!verification.enabled || !bothRecorded) return
    setVerification((current) => updateVerificationEntry(current, load, field, value))
    setReportGenerated(false)
    setPrintRequested(false)
  }

  const calculatePower = (load) => {
    const next = submitVerification(verification, load, observations)
    if (next === verification) {
      setStatus('Add both Star and Delta observations to enable theoretical verification.')
      return
    }
    setVerification(next)
    setReportGenerated(false)
    setPrintRequested(false)
    const result = next.entries[load].feedback
    announce(result.narrationKey ?? 'powerIncorrect')
  }

  const updateErrorInput = (load, field, value) => {
    setVerification((current) => updateErrorAnalysisEntry(current, load, field, value))
    setReportGenerated(false)
    setPrintRequested(false)
  }

  const calculateErrors = (load) => {
    const next = submitErrorAnalysis(verification, load, observations)
    setVerification(next)
    setReportGenerated(false)
    setPrintRequested(false)
    const result = next.errorFeedback
    announce(result.narrationKey ?? 'errorIncorrect')
  }

  const report = () => {
    if (!isReportReady(verification, observations)) {
      setStatus('Complete the power calculations and error analysis for both Star and Delta loads before generating the report.')
      return
    }
    announce('reportGenerated', {
      requiresConfirmation: true,
      confirmLabel: 'OK',
      onConfirm: () => {
        const opened = generateExperimentReport({ observations, sessionStart, verification, connectionAttempts, onPrint: advanceToReset })
        setReportGenerated(opened)
        setPrintRequested(false)
        if (!opened) setStatus('Allow pop-ups for this page, then click Generate Report again.')
      },
    })
  }

  const toggleGuide = () => {
    if (guide.enabled) {
      guide.stop()
      setStatus('AI Guide stopped.')
      return
    }
    let currentPrompt = null
    if (connectionsVerified) currentPrompt = EXPERIMENT_MESSAGES.connectionsVerified
    if (powerOn) currentPrompt = EXPERIMENT_MESSAGES['mcbOn' + configuration]
    if (alreadyRecorded) currentPrompt = EXPERIMENT_MESSAGES.firstReading
    if (bothRecorded) currentPrompt = EXPERIMENT_MESSAGES.secondReading
    if (bothVerified) currentPrompt = EXPERIMENT_MESSAGES.powerCorrect
    if (errorsCalculated) currentPrompt = EXPERIMENT_MESSAGES.secondErrorCorrect
    guide.start(currentPrompt)
  }

  const printSimulation = async () => {
    setStatus(EXPERIMENT_MESSAGES.print.text)
    await play(EXPERIMENT_MESSAGES.print)
    window.print()
    advanceToReset()
  }

  return (
    <div id="app-wrapper">
      <div id="app-viewport" style={{ height: CONTENT_HEIGHT * scale, width: BASE_WIDTH * scale }}>
        <div id="app-scale" style={{ '--app-scale': scale, '--app-render-scale': 2, height: CONTENT_HEIGHT * 2, width: BASE_WIDTH * 2 }}>
          <div id="app-render">
            <main className="simulation-shell" id="walkthrough-demo-experiment">
              <HeaderBoard />
              <WalkthroughStartButton variant="side-tab" highlighted={guide.highlightWalkthrough} />
              <section className="workspace-grid">
                <aside className="left-panel">
                  <ActionButtons configuration={configuration} activeConnectionPair={nextConnection?.label}
                    activeInstructionStepId={activeStep} activeButtons={{ onAiGuide: guide.enabled }}
                    instructionsOpen={instructionsOpen} onInstructionsChange={setInstructionsOpen}
                    disabledButtons={{ onAdd: !powerOn || !connectionsVerified, onAutoConnect: !wiringReady || powerOn,
                      onCheck: !wiringReady || powerOn || connectionsVerified, onAiGuide: !wiringReady }}
                    onAdd={recordObservation} onCheck={() => handleCheck()}
                    onPrint={printSimulation} onReset={reset}
                    onAiGuide={toggleGuide}
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
                    highlightedTerminals={guide.highlightedTerminals} />
                  <p className="sr-only" role="status" aria-live="polite">{status}</p>
                </section>
              </section>
            </main>
            <CalculationSection key={sessionStart} observations={observations} verification={verification}
              onChange={updateCalculation} onCalculate={calculatePower} onErrorChange={updateErrorInput}
              onCalculateErrors={calculateErrors} />
            <footer className="simulation-footer">&copy; 2026 Virtual Labs | IIT Roorkee</footer>
          </div>
        </div>
      </div>
    </div>
  )
}
export default App
