import { useCallback, useEffect, useRef, useState } from 'react'

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access was denied.',
  'no-speech': "Didn't hear anything — please try again.",
  'audio-capture': 'No microphone was found.',
}

export interface UseSpeechToTextResult {
  /** False in browsers without the Web Speech API (e.g. Firefox) — hide the mic button. */
  supported: boolean
  listening: boolean
  start: () => void
  stop: () => void
}

// Speech-to-text via the browser's built-in Web Speech API — client-side, no Worker call and
// no new credential (unlike the AI assistant, which does go through the Worker). Supported in
// Chromium-based browsers (Chrome, Edge); not in Firefox, hence `supported` for callers to
// gracefully hide the mic button rather than show a dead one. Worth knowing: Chrome's own
// implementation sends the raw audio to Google's servers to transcribe it — that's the
// browser's behavior, not something this app controls.
export function useSpeechToText(
  onResult: (transcript: string) => void,
  onError: (message: string) => void
): UseSpeechToTextResult {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const supported = getSpeechRecognitionCtor() !== null

  useEffect(() => {
    return () => recognitionRef.current?.abort()
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      onError('Voice input is not supported in this browser.')
      return
    }

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = event => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results.item(i)[0].transcript
      }
      transcript = transcript.trim()
      if (transcript) onResult(transcript)
    }
    recognition.onerror = event => {
      onError(ERROR_MESSAGES[event.error] ?? `Voice input error: ${event.error}`)
      setListening(false)
    }
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [onResult, onError])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { supported, listening, start, stop }
}
