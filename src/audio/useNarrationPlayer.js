import { useCallback, useEffect, useRef } from 'react'
import { registerExclusiveAudio } from './exclusiveAudio.js'

export const useNarrationPlayer = () => {
  const audioRef = useRef(null)
  const playbackRef = useRef(null)
  const runRef = useRef(0)

  const stop = useCallback(() => {
    runRef.current += 1
    playbackRef.current?.stop()
    playbackRef.current = null
  }, [])

  const playAudio = useCallback(source => new Promise(resolve => {
    const audio = audioRef.current ?? new Audio()
    audioRef.current = audio
    audio.src = source
    let settled = false
    let exclusive
    const finish = result => {
      if (settled) return
      settled = true
      audio.removeEventListener('ended', ended)
      audio.removeEventListener('error', failed)
      exclusive?.release()
      playbackRef.current = null
      resolve(result)
    }
    const ended = () => finish(true)
    const failed = () => finish(false)
    const cancel = () => {
      audio.pause()
      audio.currentTime = 0
      finish(null)
    }
    audio.addEventListener('ended', ended)
    audio.addEventListener('error', failed)
    exclusive = registerExclusiveAudio(() => {
      runRef.current += 1
      cancel()
    })
    playbackRef.current = { stop: cancel }
    audio.play().catch(failed)
  }), [])

  const speak = useCallback(text => new Promise(resolve => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      resolve(false)
      return
    }
    const speech = new SpeechSynthesisUtterance(text)
    let settled = false
    let exclusive
    const finish = result => {
      if (settled) return
      settled = true
      speech.onend = null
      speech.onerror = null
      exclusive?.release()
      playbackRef.current = null
      resolve(result)
    }
    const cancel = () => {
      finish(null)
      window.speechSynthesis.cancel()
    }
    speech.lang = 'en-IN'
    speech.rate = 0.95
    speech.onend = () => finish(true)
    speech.onerror = () => finish(false)
    exclusive = registerExclusiveAudio(() => {
      runRef.current += 1
      cancel()
    })
    playbackRef.current = { stop: cancel }
    window.speechSynthesis.speak(speech)
  }), [])

  const playStep = useCallback(async (message, run) => {
    if (message.audio) {
      const result = await playAudio(message.audio)
      if (result !== false || runRef.current !== run) return result
    }
    if (runRef.current !== run) return null
    return speak(message.text)
  }, [playAudio, speak])

  const playSequence = useCallback(async messages => {
    stop()
    const run = runRef.current
    for (const message of messages.filter(Boolean)) {
      if (runRef.current !== run) return false
      const completed = await playStep(message, run)
      if (!completed) return false
    }
    return runRef.current === run
  }, [playStep, stop])

  const play = useCallback(message => playSequence([message]), [playSequence])
  useEffect(() => stop, [stop])
  return { play, playSequence, stop }
}
