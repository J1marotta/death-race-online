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
    window.clearInterval(musicRef.current.chordTimer)
    for (const oscillator of musicRef.current.oscillators) oscillator.stop()
    musicRef.current = null
  }, [])

  const startMusic = useCallback(() => {
    if (muted || musicRef.current) return
    const audio = context()
    if (!audio) return
    const chords = [
      [130.81, 164.81, 196, 246.94, 329.63, 65.41],
      [146.83, 174.61, 220, 261.63, 349.23, 73.42],
      [123.47, 155.56, 196, 233.08, 311.13, 61.74],
      [130.81, 164.81, 220, 246.94, 392, 65.41],
    ]
    const gains = [0.007, 0.007, 0.007, 0.006, 0.009, 0.012]
    const oscillators = chords[0].map((frequency, index) => {
      const oscillator = audio.createOscillator()
      oscillator.type = index === 4 ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime)
      const gain = audio.createGain()
      gain.gain.setValueAtTime(gains[index], audio.currentTime)
      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.start()
      return oscillator
    })
    let chordIndex = 0
    const chordTimer = window.setInterval(() => {
      chordIndex = (chordIndex + 1) % chords.length
      oscillators.forEach((oscillator, index) => {
        oscillator.frequency.setValueAtTime(chords[chordIndex][index], audio.currentTime)
      })
    }, 2400)
    musicRef.current = { chordTimer, oscillators }
  }, [context, muted])

  const playShot = useCallback(() => {
    if (muted) return
    const audio = context()
    if (!audio) return
    void audio.resume?.()
    const startedAt = audio.currentTime
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.2), audio.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * (1 - index / channel.length) ** 2
    }
    const crack = audio.createBufferSource()
    const filter = audio.createBiquadFilter()
    const crackGain = audio.createGain()
    crack.buffer = buffer
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2800, startedAt)
    crackGain.gain.setValueAtTime(0.38, startedAt)
    crackGain.gain.exponentialRampToValueAtTime(0.001, startedAt + 0.2)
    crack.connect(filter)
    filter.connect(crackGain)
    crackGain.connect(audio.destination)
    crack.start(startedAt)
    crack.stop(startedAt + 0.21)

    const thump = audio.createOscillator()
    const thumpGain = audio.createGain()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(130, startedAt)
    thump.frequency.exponentialRampToValueAtTime(45, startedAt + 0.18)
    thumpGain.gain.setValueAtTime(0.28, startedAt)
    thumpGain.gain.exponentialRampToValueAtTime(0.001, startedAt + 0.24)
    thump.connect(thumpGain)
    thumpGain.connect(audio.destination)
    thump.start(startedAt)
    thump.stop(startedAt + 0.25)
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
