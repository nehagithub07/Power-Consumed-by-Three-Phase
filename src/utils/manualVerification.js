import { LOAD_CONFIGURATIONS } from './threePhaseExperiment.js'

// Accepted experimental answers supplied for this lab, not a rounding tolerance.
const ACCEPTED_POWER = {
  Star: [353.33, 353.3],
  Delta: [847.98, 848, 847.9],
}
const MANUAL_FIELDS = ['lineVoltage', 'lineCurrent', 'cosPhi', 'power']
const ERROR_FIELDS = ['errorMeasuredPower', 'errorTruePower', 'errorDenominator']
const DECIMAL_NUMBER = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/
const POWER_NUMBER = /^[0-9]{1,3}(?:\.[0-9]{1,2})?$/
const isPowerInRange = value => POWER_NUMBER.test(String(value)) && Number(value) >= 100 && Number(value) <= 999

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
  if (field === 'cosPhi') {
    return /^(?:[01]?(?:\.[0-9]*)?)?$/.test(text)
      && (text === '' || text === '.' || Number(text) <= 1)
  }
  if (field === 'power' || ERROR_FIELDS.includes(field)) {
    // Allow incomplete values while typing; enforce the lower bound on submission.
    return /^(?:[0-9]{1,3}(?:\.[0-9]{0,2})?)?$/.test(text)
      && (text === '' || Number(text) <= 999)
  }
  return true
}

const fieldState = (value, correct, submitted) => (
  String(value ?? '').trim() === '' && !submitted ? undefined : correct ? 'correct' : 'incorrect'
)

export const getVerificationFieldStates = (configuration, entry, observations) => {
  const observation = observations.find(row => row.configuration === configuration)
  const checks = {
    lineVoltage: /^[0-9]{3}$/.test(entry.lineVoltage) && Number(entry.lineVoltage) === observation?.lineVoltage,
    lineCurrent: /^[0-2](?:\.[0-9])?$/.test(entry.lineCurrent) && Number(entry.lineCurrent) === observation?.lineCurrent,
    cosPhi: DECIMAL_NUMBER.test(entry.cosPhi) && Number(entry.cosPhi) === 1,
    power: isPowerInRange(entry.power) && ACCEPTED_POWER[configuration]?.includes(Number(entry.power)),
  }
  return Object.fromEntries(MANUAL_FIELDS.map(field => [field, fieldState(entry[field], checks[field], Boolean(entry.feedback))]))
}

export const getErrorAnalysisFieldStates = (configuration, entry, observations) => {
  const observation = observations.find(row => row.configuration === configuration)
  const checks = {
    errorMeasuredPower: Number(entry.errorMeasuredPower) === observation?.measuredPower,
    errorTruePower: ACCEPTED_POWER[configuration]?.includes(Number(entry.errorTruePower)),
    errorDenominator: ACCEPTED_POWER[configuration]?.includes(Number(entry.errorDenominator))
      && Number(entry.errorDenominator) === Number(entry.errorTruePower),
  }
  return Object.fromEntries(ERROR_FIELDS.map(field => [field, fieldState(
    entry[field], isPowerInRange(entry[field]) && checks[field], Boolean(entry.errorFeedback),
  )]))
}

export const hasBothObservations = (observations) => LOAD_CONFIGURATIONS.every(
  (configuration) => observations.some((row) => row.configuration === configuration),
)

export const createVerificationState = () => ({
  enabled: false,
  errorFeedback: null,
  entries: Object.fromEntries(LOAD_CONFIGURATIONS.map((configuration) => [configuration, {
    lineVoltage: '', lineCurrent: '', cosPhi: '', power: '', verified: false, attempts: 0, feedback: null,
    errorMeasuredPower: '', errorTruePower: '', errorDenominator: '', errorFeedback: null,
    absoluteDifference: null, percentageError: null,
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
    errorFeedback: null,
    entries: {
      ...state.entries,
      [configuration]: {
        ...state.entries[configuration], [field]: value, verified: false, feedback: null, errorFeedback: null,
        absoluteDifference: null, percentageError: null,
      },
    },
  }
}

export const validateManualVerification = (configuration, entry, observations) => {
  const observation = observations.find((row) => row.configuration === configuration)
  const warning = (title, description, narrationKey = 'powerIncorrect') => ({
    verified: false, type: 'warning', title, description, narrationKey,
  })
  if (!observation || !ACCEPTED_POWER[configuration]) {
    return warning('Observation Required', `Record the ${configuration} observation before verifying this load.`)
  }
  const missingCount = MANUAL_FIELDS.filter(field => String(entry[field] ?? '').trim() === '').length
  if (missingCount) {
    return warning('Incomplete Values', missingCount === 1
      ? 'Please enter the required value, then click the "Calculate" button.'
      : 'Please enter all the values, then click the "Calculate" button.',
    missingCount === 1 ? 'powerMissingOne' : 'powerMissingMany')
  }
  const voltage = String(entry.lineVoltage ?? '')
  if (!/^[0-9]{3}$/.test(voltage) || Number(voltage) < 400 || Number(voltage) > 450) {
    return warning('Check Line Voltage', 'Enter a three-digit whole-number line voltage from 400 to 450 V.')
  }
  const current = String(entry.lineCurrent ?? '')
  if (!/^[0-2](?:\.[0-9])?$/.test(current) || Number(current) > 2) {
    return warning('Check Line Current', 'Enter a line current from 0 to 2 A with at most one decimal place, such as 0.5.')
  }
  const cosPhi = String(entry.cosPhi ?? '').trim()
  if (!DECIMAL_NUMBER.test(cosPhi) || Number(cosPhi) < 0 || Number(cosPhi) > 1) {
    return warning('Check Power Factor', 'Manually enter cos φ as a decimal value from 0 to 1.')
  }
  if (Number(cosPhi) !== 1) {
    return warning('Check Power Factor', 'For this resistive load, cos φ = 1. Enter 1 and recalculate your power P.')
  }
  const power = String(entry.power ?? '').trim()
  if (!isPowerInRange(power)) {
    return warning('Check Calculated Power', 'Enter your calculated power P from 100 to 999 W with at most two decimal places.')
  }
  if (Number(entry.lineVoltage) !== observation.lineVoltage || Number(entry.lineCurrent) !== observation.lineCurrent) {
    return warning('Check Voltage and Current', `Use the line voltage and line current recorded for ${configuration} in the observation table.`)
  }
  if (!ACCEPTED_POWER[configuration].includes(Number(entry.power))) {
    return warning('Check Calculated Power', `The entered ${configuration} power is incorrect. Recalculate P = √3 × Vₗ × Iₗ × cos φ and enter your answer in watts, then click Calculate again.`)
  }
  return {
    verified: true,
    narrationKey: 'powerCorrect',
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
  && LOAD_CONFIGURATIONS.every(configuration => {
    const entry = state.entries[configuration]
    if (!validateManualVerification(configuration, entry, observations).verified
      || !Number.isFinite(entry.absoluteDifference) || !Number.isFinite(entry.percentageError)) return false
    const checked = submitErrorAnalysis(state, configuration, observations)
    return checked.errorFeedback.type === 'success'
      && checked.entries[configuration].absoluteDifference === entry.absoluteDifference
      && checked.entries[configuration].percentageError === entry.percentageError
  })
)

export const updateErrorAnalysisEntry = (state, configuration, field, value) => {
  if (!state.enabled || !state.entries[configuration]?.verified || !ERROR_FIELDS.includes(field)) return state
  if (!isAllowedVerificationInput(field, value)) return state
  return {
    ...state,
    errorFeedback: null,
    entries: {
      ...state.entries,
      [configuration]: { ...state.entries[configuration], [field]: value, errorFeedback: null, absoluteDifference: null, percentageError: null },
    },
  }
}

export const submitErrorAnalysis = (state, configuration, observations) => {
  const warning = (title, description, narrationKey = 'errorIncorrect') => {
    const errorFeedback = { type: 'warning', title, description, narrationKey }
    return {
      ...state, errorFeedback,
      entries: state.entries[configuration] ? {
        ...state.entries,
        [configuration]: { ...state.entries[configuration], errorFeedback, absoluteDifference: null, percentageError: null },
      } : state.entries,
    }
  }
  if (!state.enabled || !hasBothObservations(observations)) {
    return warning('Error Analysis Locked', 'Record both Star and Delta observations to enable error analysis.')
  }
  if (!LOAD_CONFIGURATIONS.includes(configuration)) {
    return warning('Select a Load', 'Select Star or Delta in theoretical verification to calculate its percentage error.')
  }
  const entry = state.entries[configuration]
  if (!entry.verified || !validateManualVerification(configuration, entry, observations).verified) {
    return warning('Error Analysis Locked', `Verify the ${configuration} power calculation correctly before entering error analysis values.`)
  }
  const missingCount = ERROR_FIELDS.filter(field => String(entry[field] ?? '').trim() === '').length
  if (missingCount) {
    return warning('Incomplete Values', missingCount === 1
      ? 'Please enter the required value, then click the "Calculate Error" button.'
      : 'Please enter all the values, then click the "Calculate Error" button.',
    missingCount === 1 ? 'errorMissingOne' : 'errorMissingMany')
  }
  for (const [field, label] of [
    ['errorMeasuredPower', 'Measured Value in the numerator'],
    ['errorTruePower', 'True Value in the numerator'],
    ['errorDenominator', 'True Value in the denominator'],
  ]) {
    const value = String(entry[field] ?? '').trim()
    if (!isPowerInRange(value)) {
      return warning('Check Error Analysis Values', `For ${configuration}, enter ${label} from 100 to 999 W with at most two decimal places.`)
    }
  }
  const observation = observations.find(row => row.configuration === configuration)
  if (Number(entry.errorMeasuredPower) !== observation.measuredPower
    || !ACCEPTED_POWER[configuration].includes(Number(entry.errorTruePower))
    || Number(entry.errorDenominator) !== Number(entry.errorTruePower)) {
    return warning('Incorrect Calculations', 'Incorrect calculations. Please review your calculations and try again.')
  }
  const absoluteDifference = Math.abs(Number(entry.errorMeasuredPower) - Number(entry.errorTruePower))
  const percentageError = absoluteDifference / Number(entry.errorDenominator) * 100
  if (!Number.isFinite(percentageError)) {
    return warning('Check Error Analysis Values', `The ${configuration} percentage error is too large. Check the measured and true values in watts.`)
  }
  return {
    ...state,
    entries: {
      ...state.entries,
      [configuration]: { ...entry, errorFeedback: null, absoluteDifference, percentageError },
    },
    errorFeedback: {
      narrationKey: LOAD_CONFIGURATIONS.every(load => load === configuration || state.entries[load].percentageError != null)
        ? 'secondErrorCorrect' : 'firstErrorCorrect',
      type: 'success', title: `${configuration} Percentage Error Calculated`,
      description: `${configuration} percentage error has been calculated using your manually entered measured and true values.`,
    },
  }
}
