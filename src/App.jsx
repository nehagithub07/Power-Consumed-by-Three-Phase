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
import { generateExperimentReport } from './utils/reportGenerator.js'
import { LOAD_CONFIGURATIONS, createObservation, getReadings, validateConnections } from './utils/threePhaseExperiment.js'

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
  const [reportGenerated, setReportGenerated] = useState(false)
  const [guidePlaying, setGuidePlaying] = useState(false)
  const [wiringReady, setWiringReady] = useState(false)
  const [wiringProgress, setWiringProgress] = useState(() => validateConnections([], 'Star'))
  const [status, setStatus] = useState('Select Star or Delta and make the connections. Click CHECK before switching on the MCB.')
  const [sessionStart, setSessionStart] = useState(() => Date.now())
  const circuitRef = useRef(null)
  const readings = getReadings(configuration, powerOn)
  const alreadyRecorded = observations.some((row) => row.configuration === configuration)
  const bothRecorded = observations.length === 2
  const nextConnection = wiringProgress.missingConnections[0]
  const activeStep = !connectionsVerified ? (wiringProgress.isCorrect ? 'check' : 'connections')
    : !powerOn ? 'mcb' : !alreadyRecorded ? 'reading'
      : !bothRecorded ? 'configuration' : !reportGenerated ? 'calculations' : 'finish'
  const guideText = !connectionsVerified
    ? wiringProgress.wrongConnections.length
      ? 'Remove the incorrect connections by clicking their terminal numbers, then click CHECK.'
      : nextConnection ? `Connect terminal ${nextConnection.terminals[0]} to terminal ${nextConnection.terminals[1]}.`
        : 'All wires are connected. Click CHECK to verify the connections.'
    : !powerOn ? 'Turn on the MCB.'
      : !alreadyRecorded ? 'Observe line voltage, line current, W1 and W2. Click ADD to record the readings.'
        : !bothRecorded ? 'Turn off the MCB, select the other load configuration, change the lamp links and click CHECK.'
          : !reportGenerated ? 'Click CALCULATE, select Star or Delta, and calculate power to verify the readings. Then generate the report.'
            : 'Report generated. Review the calculations for both configurations.'

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

  const notify = (title, description, type = 'info') => {
    setStatus(description)
    showAlert({ title, description, type })
  }

  const handleReady = useCallback((api) => {
    circuitRef.current = api
    setWiringReady(Boolean(api))
  }, [])

  const handleWiringChange = useCallback((progress) => {
    setWiringProgress(progress)
    setConnectionsVerified(false)
    setPowerOn(false)
  }, [])

  const selectConfiguration = (nextConfiguration) => {
    if (powerOn || nextConfiguration === configuration) return
    setConfiguration(nextConfiguration)
    setConnectionsVerified(false)
    setWiringProgress(circuitRef.current?.validate(nextConfiguration) ?? validateConnections([], nextConfiguration))
    setStatus(nextConfiguration === 'Delta'
      ? 'Keep the supply and wattmeter wires. Remove (17–19), (19–21); add (16–19), (18–21), (17–20). Then click CHECK.'
      : 'Keep the supply and wattmeter wires. Remove the Delta links and join (17–19), (19–21). Then click CHECK.')
    clearAlerts()
  }

  const handleCheck = () => {
    if (!circuitRef.current || powerOn) return
    const result = circuitRef.current.validate()
    setWiringProgress(result)
    setConnectionsVerified(result.isCorrect)
    if (result.isCorrect) {
      notify('Right Connections', `${configuration} connections verified. Switch ON the MCB to observe the readings.`, 'success')
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

  const togglePower = () => {
    if (powerOn) {
      setPowerOn(false)
      setStatus('MCB is OFF. You can change the load configuration or edit the wiring.')
      return
    }
    if (!connectionsVerified || !circuitRef.current?.validate().isCorrect) {
      notify('Check the Connections', 'Make the required connections and click CHECK before switching ON the MCB.', 'warning')
      return
    }
    setPowerOn(true)
    setStatus(`${configuration} load is ON. Lamps glow ${configuration === 'Star' ? 'dimly' : 'brightly'}. Click ADD to record the readings.`)
  }

  const recordObservation = () => {
    if (!powerOn || !connectionsVerified) return
    if (alreadyRecorded) {
      notify('Reading Already Exists', `The ${configuration} reading is already recorded. Switch off the MCB and select the other configuration.`, 'warning')
      return
    }
    setObservations((rows) => [...rows, createObservation(configuration, rows.length + 1)])
    setReportGenerated(false)
    notify('Reading Added', `${configuration} readings added: W1 + W2 = ${readings.w1 + readings.w2} W. ${observations.length === 0 ? 'Switch OFF the MCB and repeat for the other configuration.' : 'Both readings are ready. Click CALCULATE to verify the results.'}`, 'success')
  }

  const reset = () => {
    clearAlerts()
    setGuidePlaying(false)
    circuitRef.current?.reset()
    setConfiguration('Star')
    setPowerOn(false)
    setConnectionsVerified(false)
    setWiringProgress(validateConnections([], 'Star'))
    setObservations([])
    setReportGenerated(false)
    setSessionStart(Date.now())
    setStatus('Simulation reset. Make the Star connections and click CHECK.')
  }

  const openCalculations = () => {
    document.getElementById('calculations-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('calculation-load')?.focus({ preventScroll: true })
    setStatus('Select Star or Delta in CALCULATIONS, then calculate the load power to verify the readings.')
  }

  const report = () => {
    if (!bothRecorded) return
    const opened = generateExperimentReport({ observations, sessionStart })
    setReportGenerated(opened)
    if (!opened) notify('Report Window Blocked', 'Allow pop-ups for this page, then click Generate Report again.', 'warning')
    else setStatus('Report generated. Use Print / Save as PDF in the report window.')
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
                      onCheck: !wiringReady || powerOn, onAiGuide: !wiringReady }}
                    onAdd={recordObservation} onCheck={handleCheck} onCalculate={openCalculations}
                    onPrint={() => window.print()} onReset={reset}
                    onAiGuide={() => setGuidePlaying((playing) => !playing)}
                    onAutoConnect={() => {
                      circuitRef.current?.autoConnect()
                      setStatus(`${configuration} wires connected. Click CHECK to verify before switching ON the MCB.`)
                    }} />
                  <SectionCard icon="buttons" title="LOAD CONNECTION" id="load-configuration-panel">
                    <div className="load-configuration" role="group" aria-label="Load connection">
                      {LOAD_CONFIGURATIONS.map((name) => (
                        <button key={name} type="button" aria-pressed={configuration === name} disabled={powerOn}
                          onClick={() => selectConfiguration(name)}>{name === 'Star' ? 'Y' : 'Δ'} {name}</button>
                      ))}
                    </div>
                    <p className="configuration-note">{powerOn ? 'Switch OFF the MCB to change configuration.' : 'Select the load, connect the wires, then CHECK.'}</p>
                  </SectionCard>
                  <ObservationTable observations={observations} />
                  <FormulaSection observations={observations} />
                  <ReportControls minReadings={2} onGenerateReport={report}
                    readingCount={observations.length} reportGenerated={reportGenerated} />
                </aside>
                <section className="right-panel">
                  <ConnectionLab configuration={configuration} powerOn={powerOn} readings={readings} scale={scale}
                    onReady={handleReady} onWiringChange={handleWiringChange} onTogglePower={togglePower}
                    highlightedTerminals={guidePlaying && !connectionsVerified ? nextConnection?.terminals ?? [] : []} />
                  <p className="experiment-status" role="status" aria-live="polite">{guidePlaying ? guideText : status}</p>
                </section>
              </section>
            </main>
            <CalculationSection key={sessionStart} observations={observations} />
            <footer className="simulation-footer">&copy; 2026 Virtual Labs IIT Roorkee</footer>
          </div>
        </div>
      </div>
    </div>
  )
}
export default App
