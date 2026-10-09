const wiringSignature = (progress) => JSON.stringify([
  progress.missingConnections.map(({ label }) => label),
  progress.wrongConnections.map(({ label, duplicate }) => [label, duplicate]),
])

export const getWiringStepAlert = (progress, previous, configuration) => {
  if (wiringSignature(progress) === wiringSignature(previous)) return null

  const options = { placement: 'top-right', replaceCurrent: true }
  if (progress.wrongConnections.length) {
    return {
      ...options,
      title: 'Check This Connection',
      description: `Remove incorrect or duplicate wires: ${progress.wrongConnections.map(({ label }) => `(${label})`).join(', ')}. With the MCB off, click a terminal number to remove its wires.`,
      type: 'warning',
    }
  }
  if (progress.isCorrect) {
    return {
      ...options,
      title: 'Wiring Complete',
      description: `All ${configuration} connections are in place. Click CHECK before switching ON the MCB.`,
      type: 'success',
    }
  }

  const next = progress.missingConnections[0]
  const total = progress.matchedCount + progress.missingConnections.length
  return {
    ...options,
    title: progress.totalConnections < previous.totalConnections ? 'Connection Removed' : 'Connection Added',
    description: `${progress.matchedCount} of ${total} required connections are ready. Next, connect terminal ${next.terminals[0]} to terminal ${next.terminals[1]}.`,
    type: 'info',
  }
}
