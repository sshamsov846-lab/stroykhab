import { useState, useCallback, useRef } from 'react'

interface UseVoiceInputReturn {
  isRecording: boolean
  transcript: string
  error: string | null
  startRecording: () => void
  stopRecording: () => void
  clearTranscript: () => void
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startRecording = useCallback(() => {
    setError(null)
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setError('Голосовой ввод не поддерживается')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'ru-RU'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => setIsRecording(true)
    recognition.onresult = (event) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript
      }
      if (finalTranscript) setTranscript((prev) => `${prev} ${finalTranscript.trim()}`.trim())
    }
    recognition.onerror = (event) => {
      setError(`Ошибка: ${event.error}`)
      setIsRecording(false)
    }
    recognition.onend = () => setIsRecording(false)

    recognition.start()
    recognitionRef.current = recognition
  }, [])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsRecording(false)
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  return { isRecording, transcript, error, startRecording, stopRecording, clearTranscript }
}
