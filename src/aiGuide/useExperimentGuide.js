import { useCallback, useEffect, useRef, useState } from 'react'
import { useWalkthrough } from '../walkthrough/useWalkthrough.js'
import { EXPERIMENT_MESSAGES, getConnectionNarration } from '../audio/simulationAudio.js'

export const useExperimentGuide = ({ getProgress, onStatus, play, playSequence, stopPlayback }) => {
  const { isOpen: walkthroughOpen } = useWalkthrough()
  const [phase, setPhase] = useState('idle')
  const [highlightedTerminals, setHighlightedTerminals] = useState([])
  const phaseRef = useRef('idle')
  const runRef = useRef(0)
  const expectedRef = useRef(null)
  const walkthroughSeenRef = useRef(false)

  const changePhase = useCallback(next => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const suspend = useCallback(() => {
    runRef.current += 1
    expectedRef.current = null
    setHighlightedTerminals([])
    if (phaseRef.current !== 'idle') changePhase('experiment')
  }, [changePhase])

  const stop = useCallback(() => {
    suspend()
    stopPlayback()
    walkthroughSeenRef.current = false
    changePhase('idle')
  }, [changePhase, stopPlayback, suspend])

  const narrateProgress = useCallback((progress, previousConnection = null, narrate = true) => {
    if (phaseRef.current !== 'connections') return
    const next = progress.missingConnections[0]
    expectedRef.current = next ?? null
    setHighlightedTerminals(next?.terminals ?? [])
    if (!narrate || progress.wrongConnections.length) return
    const message = next ? getConnectionNarration(next) : EXPERIMENT_MESSAGES.connectionsComplete
    onStatus(message.text)
    if (previousConnection?.label === '1-4' && next) {
      playSequence([EXPERIMENT_MESSAGES.nextConnection, message])
    } else {
      play(message)
    }
    if (!next) changePhase('experiment')
  }, [changePhase, onStatus, play, playSequence])

  const resumeConnections = useCallback(async (announcement, narrate = true) => {
    if (phaseRef.current === 'idle') return
    const run = ++runRef.current
    changePhase('waiting')
    expectedRef.current = null
    setHighlightedTerminals([])
    await announcement
    if (runRef.current !== run || phaseRef.current === 'idle') return
    changePhase('connections')
    narrateProgress(getProgress(), null, narrate)
  }, [changePhase, getProgress, narrateProgress])

  const updateProgress = useCallback((progress, previous) => {
    if (phaseRef.current !== 'connections') return
    const expected = expectedRef.current
    const next = progress.missingConnections[0]
    if (next?.label !== expected?.label || (progress.isCorrect && !previous.isCorrect)
      || (previous.wrongConnections.length && !progress.wrongConnections.length)) {
      narrateProgress(progress, expected)
    }
  }, [narrateProgress])

  const start = useCallback(async currentPrompt => {
    if (phaseRef.current !== 'idle') {
      stop()
      return
    }
    const run = ++runRef.current
    walkthroughSeenRef.current = false
    if (currentPrompt) {
      changePhase('experiment')
      onStatus(currentPrompt.text)
      play(currentPrompt)
      return
    }
    changePhase('intro')
    onStatus(EXPERIMENT_MESSAGES.welcome.text)
    await play(EXPERIMENT_MESSAGES.welcome)
    if (runRef.current === run && phaseRef.current === 'intro') changePhase('walkthrough')
  }, [changePhase, onStatus, play, stop])

  useEffect(() => {
    if (!['intro', 'walkthrough'].includes(phase)) return
    if (walkthroughOpen) {
      walkthroughSeenRef.current = true
    } else if (walkthroughSeenRef.current) {
      walkthroughSeenRef.current = false
      onStatus(EXPERIMENT_MESSAGES.walkthroughComplete.text)
      resumeConnections(play(EXPERIMENT_MESSAGES.walkthroughComplete))
    }
  }, [onStatus, phase, play, resumeConnections, walkthroughOpen])

  useEffect(() => () => { runRef.current += 1 }, [])
  return {
    enabled: phase !== 'idle', highlightWalkthrough: phase === 'walkthrough' && !walkthroughOpen,
    highlightedTerminals, resumeConnections, start, stop, suspend, updateProgress,
  }
}
