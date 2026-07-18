import { useCallback, useEffect, useRef, useState } from 'react'

export function useGameAudio(phase) {
  const [muted, setMuted] = useState(false)
  const contextRef = useRef(null)
  const musicRef = useRef(null)

  const context = useCallback(() => {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext
    if (!AudioContext) return null
    contextRef.current ??= new AudioContext()
    return contextRef.current
  }, [])

  const stopMusic = useCallback(() => {
    if (!musicRef.current) return
    for (const oscillator of musicRef.current.oscillators) oscillator.stop()
    musicRef.current = null
  }, [])

  const startMusic = useCallback(() => {
    if (muted || musicRef.current) return
    const audio = context()
    if (!audio) return
    const gain = audio.createGain()
    gain.gain.setValueAtTime(0.025, audio.currentTime)
    gain.connect(audio.destination)
    const oscillators = [55, 82.5].map(frequency => {
      const oscillator = audio.createOscillator()
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime)
      oscillator.connect(gain)
      oscillator.start()
      return oscillator
    })
    musicRef.current = { gain, oscillators }
  }, [context, muted])

  const playShot = useCallback(() => {
    if (muted) return
    const audio = context()
    if (!audio) return
    void audio.resume?.()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(180, audio.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(45, audio.currentTime + 0.09)
    gain.gain.setValueAtTime(0.12, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.1)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start()
    oscillator.stop(audio.currentTime + 0.1)
  }, [context, muted])

  useEffect(() => {
    if (phase === 'playing' && !muted) startMusic()
    else stopMusic()
  }, [muted, phase, startMusic, stopMusic])

  useEffect(() => {
    const unlock = () => { void context()?.resume?.() }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      stopMusic()
      void contextRef.current?.close?.()
    }
  }, [context, stopMusic])

  return { muted, toggleMuted: () => setMuted(value => !value), playShot }
}
