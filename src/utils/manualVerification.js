import { LOAD_CONFIGURATIONS } from './threePhaseExperiment.js'

// Accepted experimental answers supplied for this lab, not a rounding tolerance.
const ACCEPTED_POWER = {
  Star: [353.33, 353.32],
  Delta: [847.98, 848],
}
const MANUAL_FIELDS = ['lineVoltage', 'lineCurrent', 'power']
const DECIMAL_NUMBER = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/

export const isAllowedVerificationInput = (field, value) => {
  const text = String(value)
  if (field === 'lineVoltage') {
    return /^[0-9]{0,3}$/.test(text)
      && (text.length < 3 || (Number(text) >= 400 && Number(text) <= 450))
  }
  if (field === 'lineCurrent') {
    return /^(?:[0-2](?:\.[0-9]?)?)?$/.test(text)
      && (text === '' || Number(text) <= 2)
  }
  return true
}

export const hasBothObservations = (observations) => LOAD_CONFIGURATIONS.every(
  (configuration) => observations.some((row) => row.configuration === configuration),
)

export const createVerificationState = () => ({
  enabled: false,
  entries: Object.fromEntries(LOAD_CONFIGURATIONS.map((configuration) => [configuration, {
    lineVoltage: '', lineCurrent: '', power: '', verified: false, attempts: 0, feedback: null,
  }])),
})

export const unlockVerification = (state, observations) => (
  hasBothObservations(observations) ? { ...state, enabled: true } : state
)

export const updateVerificationEntry = (state, configuration, field, value) => {
  if (!state.enabled || !state.entries[configuration] || !MANUAL_FIELDS.includes(field)) return state
  if (!isAllowedVerificationInput(field, value)) return state
  return {
    ...state,
    entries: {
      ...state.entries,
      [configuration]: { ...state.entries[configuration], [field]: value, verified: false, feedback: null },
    },
  }
}

export const validateManualVerification = (configuration, entry, observations) => {
  const observation = observations.find((row) => row.configuration === configuration)
  const warning = (title, description) => ({ verified: false, type: 'warning', title, description })
  if (!observation || !ACCEPTED_POWER[configuration]) {
    return warning('Observation Required', `Record the ${configuration} observation before verifying this load.`)
  }
  const voltage = String(entry.lineVoltage ?? '')
  if (!/^[0-9]{3}$/.test(voltage) || Number(voltage) < 400 || Number(voltage) > 450) {
    return warning('Check Line Voltage', 'Enter a three-digit whole-number line voltage from 400 to 450 V.')
  }
  const current = String(entry.lineCurrent ?? '')
  if (!/^[0-2](?:\.[0-9])?$/.test(current) || Number(current) > 2) {
    return warning('Check Line Current', 'Enter a line current from 0 to 2 A with at most one decimal place, such as 0.5.')
  }
  const power = String(entry.power ?? '').trim()
  if (!DECIMAL_NUMBER.test(power) || !Number.isFinite(Number(power)) || Number(power) <= 0) {
    return warning('Check Calculated Power', 'Manually enter a positive decimal value for your calculated power P.')
  }
  if (Number(entry.lineVoltage) !== observation.lineVoltage || Number(entry.lineCurrent) !== observation.lineCurrent) {
    return warning('Check Voltage and Current', `Use the line voltage and line current recorded for ${configuration} in the observation table.`)
  }
  if (!ACCEPTED_POWER[configuration].includes(Number(entry.power))) {
    return warning('Check Calculated Power', `The entered ${configuration} power is incorrect. Recalculate P = √3 × Vₗ × Iₗ and enter your answer in watts, then click Verify again.`)
  }
  return {
    verified: true,
    type: 'success',
    title: `${configuration} Load Verified`,
    description: `Your ${configuration} power value of ${Number(entry.power).toFixed(2)} W is correct.`,
  }
}

export const submitVerification = (state, configuration, observations) => {
  if (!state.enabled || !hasBothObservations(observations) || !state.entries[configuration]) return state
  const entry = state.entries[configuration]
  const feedback = validateManualVerification(configuration, entry, observations)
  return {
    ...state,
    entries: {
      ...state.entries,
      [configuration]: { ...entry, verified: feedback.verified, feedback, attempts: entry.attempts + 1 },
    },
  }
}

export const isVerificationComplete = (state) => Boolean(state?.enabled && LOAD_CONFIGURATIONS.every(
  (configuration) => state.entries?.[configuration]?.verified === true,
))

export const isReportReady = (state, observations = []) => (
  hasBothObservations(observations)
  && isVerificationComplete(state)
  && LOAD_CONFIGURATIONS.every((configuration) => (
    validateManualVerification(configuration, state.entries[configuration], observations).verified
  ))
)
