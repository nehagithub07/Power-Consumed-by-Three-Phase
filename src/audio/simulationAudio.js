import guideConfig from '../aiGuide/aiGuideConfig.json'
import { CONNECTIONS } from '../utils/threePhaseExperiment.js'

const audioFiles = import.meta.glob('./*.wav', { eager: true, import: 'default', query: '?url' })
const sharedRecordings = new Set([
  'AI Guide click.wav', 'The interface walkthrough is now complete.wav',
  'Generate Report button click.wav', 'Reset.wav', 'Print.wav',
])

const getAudioUrl = fileName => (
  audioFiles[`./${fileName}`]
  ?? (sharedRecordings.has(fileName)
    ? `${import.meta.env.BASE_URL}simulation-audios/${encodeURIComponent(fileName)}`
    : null)
)

export const EXPERIMENT_MESSAGES = Object.fromEntries(
  Object.entries(guideConfig.messages).map(([key, message]) => [key, {
    ...message, audio: getAudioUrl(message.audioFile),
  }]),
)

export const getWrongConnectionMessage = (progress, configuration) => {
  const candidates = [
    ...progress.missingConnections.map(connection => connection.terminals),
    ...CONNECTIONS[configuration],
  ]
  return {
    ...EXPERIMENT_MESSAGES.wrongConnection,
    text: progress.wrongConnections.map(({ label, duplicate }) => {
      const terminals = label.split('-').map(Number)
      const rightConnection = duplicate ? terminals
        : candidates.find(pair => pair.includes(terminals[0]))
          ?? candidates.find(pair => pair.includes(terminals[1]))
      return `Wrong connection: ${label}${duplicate ? ' (duplicate)' : ''}. Right connection is: ${rightConnection.join('-')}${duplicate ? ' (keep only one wire)' : ''}.`
    }).join(' '),
  }
}

export const getConnectionCheckMessage = (progress, configuration, firstCheck = false) => {
  // Report wrong wiring before checking for missing wires; these are separate alerts.
  if (progress.wrongConnections.length) return getWrongConnectionMessage(progress, configuration)
  if (firstCheck && progress.totalConnections === 0) return EXPERIMENT_MESSAGES.emptyCheck
  const missing = progress.missingConnections.map(connection => connection.label)
  return {
    text: `${configuration} load. Add the missing connections: ${missing.join(', ')}. Then click CHECK again.`,
    title: 'Missing Connections',
    type: 'warning',
    alert: true,
    audio: null,
    silent: true,
  }
}

const connectionFiles = {
  '1-4': 'Click  terminal 1 to 4. .wav',
  '2-5': 'Connect terminal 2 to terminal 5.wav',
  '4-6': 'Connect terminal 4 to terminal 6..wav',
  '7-10': 'Connect terminal 7 to terminal 10.wav',
  '10-11': 'Connect terminal 10 to terminal 11.wav',
  '9-16': 'Connect terminal 9 to terminal 16.wav',
  '8-18': 'Connect terminal 8 to terminal 18.wav',
  '2-8': 'Connect terminal 2 to terminal 8..wav',
  '3-14': 'Connect terminal 3 to terminal 14..wav',
  '14-15': 'Connect terminal 14 to terminal 15..wav',
  '13-20': 'Connect terminal 13 to terminal 20..wav',
  '12-18': 'Connect terminal 12 to terminal 18.wav',
  '17-19': 'Connect terminal 17 to terminal 19..wav',
  '19-21': 'Connect terminal 19 to terminal 21..wav',
  '16-19': 'Connect terminal 16 to terminal 19..wav',
  '18-21': 'Connect terminal 18 to terminal 21.wav',
  '17-20': 'Connect terminal 17 to terminal 20.wav',
}

export const getConnectionNarration = connection => ({
  ...connection,
  audio: getAudioUrl(connectionFiles[connection.label]),
  text: connection.label === '1-4'
    ? 'Click and drag the wire from terminal 1 and drop it on terminal 4.'
    : `Connect terminal ${connection.terminals[0]} to terminal ${connection.terminals[1]}.`,
})
