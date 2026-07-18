import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function useGameAudio(phase) {
  const [muted, setMuted] = useState(false)
  const contextRef = useRef(null)
  const musicRef = useRef(null)
  const atmosphereRef = useRef({ movementMode: 'stopped', exhausted: false, progress: 0 })

  const context = useCallback(() => {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext
    if (!AudioContext) return null
    contextRef.current ??= new AudioContext()
    return contextRef.current
  }, [])

  const stopMusic = useCallback(() => {
    if (!musicRef.current) return
    window.clearInterval(musicRef.current.chordTimer)
    window.clearInterval(musicRef.current.stepTimer)
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
    const masterGain = audio.createGain()
    masterGain.gain.setValueAtTime(1, audio.currentTime)
    masterGain.connect(audio.destination)
    const gains = [0.007, 0.007, 0.007, 0.006, 0.009, 0.012]
    const oscillators = chords[0].map((frequency, index) => {
      const oscillator = audio.createOscillator()
      oscillator.type = index === 4 ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime)
      const gain = audio.createGain()
      gain.gain.setValueAtTime(gains[index], audio.currentTime)
      oscillator.connect(gain)
      gain.connect(masterGain)
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
    let stepCount = 0
    const stepTimer = window.setInterval(() => {
      const atmosphere = atmosphereRef.current
      if (atmosphere.movementMode === 'stopped') return
      stepCount += 1
      const step = audio.createOscillator()
      const stepGain = audio.createGain()
      step.type = 'triangle'
      step.frequency.setValueAtTime(atmosphere.movementMode === 'running' ? 105 : 82, audio.currentTime)
      stepGain.gain.setValueAtTime(atmosphere.movementMode === 'running' ? 0.025 : 0.014, audio.currentTime)
      stepGain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.055)
      step.connect(stepGain)
      stepGain.connect(audio.destination)
      step.start()
      step.stop(audio.currentTime + 0.06)
      if (atmosphere.exhausted && stepCount % 4 === 0) {
        const breath = audio.createOscillator()
        const breathGain = audio.createGain()
        breath.type = 'sine'
        breath.frequency.setValueAtTime(180, audio.currentTime)
        breath.frequency.exponentialRampToValueAtTime(95, audio.currentTime + 0.28)
        breathGain.gain.setValueAtTime(0.012, audio.currentTime)
        breathGain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.3)
        breath.connect(breathGain)
        breathGain.connect(audio.destination)
        breath.start()
        breath.stop(audio.currentTime + 0.31)
      }
    }, 220)
    musicRef.current = { chordTimer, stepTimer, masterGain, oscillators }
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

  const playTone = useCallback((frequency, duration = 0.12, volume = 0.04, type = 'sine') => {
    if (muted) return
    const audio = context()
    if (!audio) return
    void audio.resume?.()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime)
    gain.gain.setValueAtTime(volume, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start()
    oscillator.stop(audio.currentTime + duration)
  }, [context, muted])

  const playCountdownTone = useCallback(step => {
    const frequencies = { 3: 330, 2: 415, 1: 523, 0: 784 }
    playTone(frequencies[step] ?? 330, step === 0 ? 0.28 : 0.11, step === 0 ? 0.065 : 0.035, 'triangle')
  }, [playTone])

  const playNearMiss = useCallback(() => {
    playTone(980, 0.08, 0.025, 'triangle')
    window.setTimeout(() => playTone(620, 0.1, 0.018, 'triangle'), 35)
  }, [playTone])

  const playFinish = useCallback(() => {
    ;[261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
      window.setTimeout(() => playTone(frequency, 0.55, 0.035, index === 3 ? 'triangle' : 'sine'), index * 55)
    })
  }, [playTone])

  const updateAtmosphere = useCallback(next => {
    atmosphereRef.current = { ...atmosphereRef.current, ...next }
    const audio = contextRef.current
    const masterGain = musicRef.current?.masterGain
    if (audio && masterGain) {
      const intensity = atmosphereRef.current.progress >= 66 ? 1.45 : atmosphereRef.current.progress >= 33 ? 1.18 : 1
      masterGain.gain.setValueAtTime(intensity, audio.currentTime)
    }
  }, [])

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

  const toggleMuted = useCallback(() => setMuted(value => !value), [])

  return useMemo(() => ({
    muted,
    toggleMuted,
    playCountdownTone,
    playFinish,
    playNearMiss,
    playShot,
    updateAtmosphere,
  }), [muted, playCountdownTone, playFinish, playNearMiss, playShot, toggleMuted, updateAtmosphere])
}
