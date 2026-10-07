export const LOAD_CONFIGURATIONS = ['Star', 'Delta']

const COMMON_CONNECTIONS = [
  [1, 4], [2, 5], [4, 6],
  [7, 10], [10, 11],
  [9, 16], [8, 18], [2, 8],
  [3, 14], [14, 15], [13, 20], [12, 18],
]

export const CONNECTIONS = {
  Star: [...COMMON_CONNECTIONS, [17, 19], [19, 21]],
  Delta: [...COMMON_CONNECTIONS, [16, 19], [18, 21], [17, 20]],
}

// Supplied experimental observations, including measured instrument differences.
const MEASURED_READINGS = {
  Star: { lineVoltage: 408, lineCurrent: 0.5, w1: 180, w2: 190 },
  Delta: { lineVoltage: 408, lineCurrent: 1.2, w1: 520, w2: 320 },
}

export const getReadings = (configuration, powerOn = true) => (
  powerOn ? { ...MEASURED_READINGS[configuration] }
    : { lineVoltage: 0, lineCurrent: 0, w1: 0, w2: 0 }
)

export const createObservation = (configuration, id) => {
  const readings = getReadings(configuration)
  const measuredPower = readings.w1 + readings.w2
  const theoreticalPower = Math.sqrt(3) * readings.lineVoltage * readings.lineCurrent
  return {
    id, configuration, ...readings, measuredPower, theoreticalPower,
    percentageError: Math.abs(measuredPower - theoreticalPower) / theoreticalPower * 100,
  }
}

export const connectionKey = (first, second) => [Number(first), Number(second)].sort((a, b) => a - b).join('-')

export const validateConnections = (pairs, configuration) => {
  const required = CONNECTIONS[configuration]
  const requiredKeys = new Set(required.map(([first, second]) => connectionKey(first, second)))
  const matched = new Set()
  const wrongConnections = []
  pairs.forEach(([first, second]) => {
    const key = connectionKey(first, second)
    if (!requiredKeys.has(key) || matched.has(key)) {
      wrongConnections.push({ label: `${first}-${second}`, duplicate: matched.has(key) })
    } else {
      matched.add(key)
    }
  })
  const missingConnections = required
    .filter(([first, second]) => !matched.has(connectionKey(first, second)))
    .map(([first, second]) => ({ label: `${first}-${second}`, terminals: [first, second] }))
  return {
    isCorrect: wrongConnections.length === 0 && missingConnections.length === 0,
    matchedCount: matched.size,
    totalConnections: pairs.length,
    missingConnections,
    wrongConnections,
  }
}
