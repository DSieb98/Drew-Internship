/**
 * Minimal ambient types for the Web Speech API's SpeechRecognition — not part of
 * TypeScript's standard DOM lib, so it isn't declared anywhere else. Only the members
 * this app actually uses (see src/hooks/useSpeechToText.ts).
 */

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionResultItem {
  0: SpeechRecognitionAlternative
  isFinal: boolean
  length: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResultItem
  [index: number]: SpeechRecognitionResultItem
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}
