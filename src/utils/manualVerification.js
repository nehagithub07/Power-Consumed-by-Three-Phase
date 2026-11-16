import { LOAD_CONFIGURATIONS } from './threePhaseExperiment.js'

// Accepted experimental answers supplied for this lab, not a rounding tolerance.
const ACCEPTED_POWER = {
  Star: [353.33, 353.3],
  Delta: [847.98, 848, 847.9],
}
const MANUAL_FIELDS = ['lineVoltage', 'lineCurrent', 'cosPhi', 'power']
const ERROR_FIELDS = ['errorMeasuredPower', 'errorTruePower', 'errorDenominator']
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
  if (field === 'cosPhi') {
    return /^(?:[01]?(?:\.[0-9]*)?)?$/.test(text)
      && (text === '' || text === '.' || Number(text) <= 1)
  }
  return true
}

export const hasBothObservations = (observations) => LOAD_CONFIGURATIONS.every(
  (configuration) => observations.some((row) => row.configuration === configuration),
)

export const createVerificationState = () => ({
  enabled: false,
  errorFeedback: null,
  entries: Object.fromEntries(LOAD_CONFIGURATIONS.map((configuration) => [configuration, {
    lineVoltage: '', lineCurrent: '', cosPhi: '', power: '', verified: false, attempts: 0, feedback: null,
    errorMeasuredPower: '', errorTruePower: '', errorDenominator: '', absoluteDifference: null, percentageError: null,
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
        ...state.entries[configuration], [field]: value, verified: false, feedback: null,
        errorMeasuredPower: '', errorTruePower: '', errorDenominator: '', absoluteDifference: null, percentageError: null,
      },
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
  const cosPhi = String(entry.cosPhi ?? '').trim()
  if (!DECIMAL_NUMBER.test(cosPhi) || Number(cosPhi) < 0 || Number(cosPhi) > 1) {
    return warning('Check Power Factor', 'Manually enter cos φ as a decimal value from 0 to 1.')
  }
  if (Number(cosPhi) !== 1) {
    return warning('Check Power Factor', 'For this resistive load, cos φ = 1. Enter 1 and recalculate your power P.')
  }
  const power = String(entry.power ?? '').trim()
  if (!DECIMAL_NUMBER.test(power) || !Number.isFinite(Number(power)) || Number(power) <= 0) {
    return warning('Check Calculated Power', 'Manually enter a positive decimal value for your calculated power P.')
  }
  if (Number(entry.lineVoltage) !== observation.lineVoltage || Number(entry.lineCurrent) !== observation.lineCurrent) {
    return warning('Check Voltage and Current', `Use the line voltage and line current recorded for ${configuration} in the observation table.`)
  }
  if (!ACCEPTED_POWER[configuration].includes(Number(entry.power))) {
    return warning('Check Calculated Power', `The entered ${configuration} power is incorrect. Recalculate P = √3 × Vₗ × Iₗ × cos φ and enter your answer in watts, then click Calculate again.`)
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

export const updateErrorAnalysisEntry = (state, configuration, field, value) => {
  if (!state.enabled || !state.entries[configuration]?.verified || !ERROR_FIELDS.includes(field)) return state
  return {
    ...state,
    errorFeedback: null,
    entries: {
      ...state.entries,
      [configuration]: { ...state.entries[configuration], [field]: value, absoluteDifference: null, percentageError: null },
    },
  }
}

export const submitErrorAnalysis = (state, observations) => {
  const warning = (title, description) => ({ ...state, errorFeedback: { type: 'warning', title, description } })
  if (!isReportReady(state, observations)) {
    return warning('Calculate Both Loads', 'Click Calculate for both Star and Delta power values before calculating percentage errors.')
  }
  for (const configuration of LOAD_CONFIGURATIONS) {
    const entry = state.entries[configuration]
    for (const [field, label] of [
      ['errorMeasuredPower', 'Measured Value in the numerator'],
      ['errorTruePower', 'True Value in the numerator'],
      ['errorDenominator', 'True Value in the denominator'],
    ]) {
      const value = String(entry[field] ?? '').trim()
      const requiresPositive = field !== 'errorMeasuredPower'
      if (!DECIMAL_NUMBER.test(value) || !Number.isFinite(Number(value)) || (requiresPositive && Number(value) <= 0)) {
        return warning('Check Error Analysis Values', `For ${configuration}, manually enter ${requiresPositive ? 'a positive' : 'a non-negative'} decimal value for ${label} in watts.`)
      }
    }
    const difference = Math.abs(Number(entry.errorMeasuredPower) - Number(entry.errorTruePower))
    if (!Number.isFinite(difference / Number(entry.errorDenominator) * 100)) {
      return warning('Check Error Analysis Values', `The ${configuration} percentage error is too large. Check the measured and true values in watts.`)
    }
  }
  return {
    ...state,
    entries: Object.fromEntries(LOAD_CONFIGURATIONS.map((configuration) => {
      const entry = state.entries[configuration]
      const absoluteDifference = Math.abs(Number(entry.errorMeasuredPower) - Number(entry.errorTruePower))
      return [configuration, { ...entry, absoluteDifference, percentageError: absoluteDifference / Number(entry.errorDenominator) * 100 }]
    })),
    errorFeedback: {
      type: 'success', title: 'Percentage Errors Calculated',
      description: 'Star and Delta percentage errors have been calculated using your manually entered measured and true values.',
    },
  }
}
