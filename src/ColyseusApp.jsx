import { useEffect, useMemo, useRef, useState } from 'react'
import { ColyseusTransport } from './multiplayer/colyseusTransport.js'
import { createLobbyCode } from './multiplayer/lobbyCode.js'
import { useGameAudio } from './multiplayer/useGameAudio.js'
import './ColyseusApp.css'

const emptyView = {
  phase: 'menu', players: [], racers: [], shots: [], round: 1, roundCount: 5,
  crosshairs: [], localLaneId: 0, localPlayerId: '', localCrosshairId: '',
  localStamina: 1, localExhausted: false, localEliminated: false,
  hostPlayerId: '', winner: null,
}

const SPECIES = ['Cat', 'Bunny', 'Bear', 'Fox', 'Frog', 'Pig', 'Chick', 'Mouse']
const PALETTES = ['peach', 'sky', 'mint', 'honey', 'berry']
const CLIENT_IDLE_TIMEOUT_MS = 20 * 60 * 1000

const hashString = value => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function racerAppearance(roomCode, round, laneId) {
  const seed = hashString(`${roomCode}:${round}:appearance`)
  const speciesIndex = (laneId * 7 + (seed % SPECIES.length)) % SPECIES.length
  const paletteIndex = (laneId * 3 + (Math.floor(seed / 8) % PALETTES.length)) % PALETTES.length
  return {
    species: SPECIES[speciesIndex],
    shapeClass: `shape-${speciesIndex}`,
    palette: PALETTES[paletteIndex],
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return undefined
    const update = () => setReduced(media.matches)
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])
  return reduced
}

function PixelRacer({ racer, roomCode, round, isLocal, localExhausted, anticipating, launching, winner, showReveal = true }) {
  const appearance = racerAppearance(roomCode, round, racer.laneId)
  const movementClass = racer.eliminated ? '' : racer.movementMode
  return <div
    className={`migration-racer archetype-${appearance.palette} ${appearance.shapeClass} ${movementClass} ${racer.eliminated ? 'eliminated' : ''} ${isLocal && localExhausted ? 'winded' : ''} ${anticipating ? 'anticipating' : ''} ${launching ? 'launching' : ''} ${winner ? 'winner' : ''}`}
    data-testid={`migration-racer-${racer.laneId}`}
    style={{ left: `${racer.progress}%` }}
    title={`${appearance.species} · ${appearance.palette}`}
  >
    <span className='racer-head' />
    <span className='racer-body' />
    <span className='racer-shadow' />
    <span className='racer-dust' aria-hidden='true' />
    <span className='racer-sweat' aria-hidden='true' />
    {showReveal && racer.revealedName && <strong className='migration-reveal-name'>{racer.revealedName}</strong>}
  </div>
}

const PREVIEW_LANES = 20

function previewMode(laneId, tick) {
  const phase = (tick + laneId * 7) % 60
  if (phase < 8) return 'idle'
  if (phase < 40) return 'walking'
  return 'running'
}

function buildPreviewRacers() {
  return Array.from({ length: PREVIEW_LANES }, (_, index) => {
    const laneId = index + 1
    return { laneId, progress: (laneId * 37) % 88, movementMode: previewMode(laneId, 0), gen: 0 }
  })
}

function MenuPreview() {
  const reducedMotion = useReducedMotion()
  const [racers, setRacers] = useState(buildPreviewRacers)
  useEffect(() => {
    if (reducedMotion) return undefined
    let tick = 0
    const timer = window.setInterval(() => {
      tick += 1
      setRacers(previous => previous.map(racer => {
        const movementMode = previewMode(racer.laneId, tick)
        const speed = movementMode === 'running' ? 1.3 : movementMode === 'walking' ? 0.55 : 0
        const next = racer.progress + speed
        if (next > 96) return { ...racer, movementMode, progress: -3, gen: racer.gen + 1 }
        return { ...racer, movementMode, progress: next }
      }))
    }, 80)
    return () => window.clearInterval(timer)
  }, [reducedMotion])
  return <section className='migration-track migration-preview' aria-hidden='true'>
    <div className='migration-finish' />
    {racers.map(racer => <div className='migration-lane' key={racer.laneId} data-lane={racer.laneId}>
      <PixelRacer key={racer.gen} racer={racer} roomCode='LOBBY' round={1} isLocal={false} showReveal={false} />
    </div>)}
  </section>
}

function AudioControls({ audio }) {
  const { muted, toggleMuted, volume, setVolume } = audio
  return <div className='migration-audio'>
    <button className='migration-sound' type='button' onClick={toggleMuted} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? 'Sound off' : 'Sound on'}</button>
    <input className='migration-volume' type='range' min='0' max='100' value={Math.round(volume * 100)} onChange={event => setVolume(Number(event.target.value) / 100)} disabled={muted} aria-label='Volume' />
  </div>
}

function Countdown({ endsAt, onBeat }) {
  const [now, setNow] = useState(Date.now())
  const lastBeat = useRef(null)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [])
  const remaining = Number.isFinite(endsAt) ? Math.ceil((endsAt - now) / 1000) : 3
  const beat = remaining > 0 ? Math.min(3, remaining) : 0
  const expired = Number.isFinite(endsAt) && now >= endsAt + 450
  useEffect(() => {
    if (expired) return
    if (lastBeat.current === beat) return
    lastBeat.current = beat
    onBeat?.(beat)
  }, [beat, expired, onBeat])
  if (expired) return null
  return <div className={`migration-countdown beat-${beat}`}>{beat > 0 ? beat : 'Go!'}</div>
}

function AuthoritativeRace({ transport, initialView, audio, interactive = true }) {
  const [raceView, setRaceView] = useState(initialView)
  const [aim, setAim] = useState({ laneId: 1, x: 0, y: 50 })
  const [pressedKeys, setPressedKeys] = useState({ walking: false, running: false })
  const [screenEffect, setScreenEffect] = useState(null)
  const [localShotEffect, setLocalShotEffect] = useState(null)
  const [serverShotEffect, setServerShotEffect] = useState(null)
  const [revealCount, setRevealCount] = useState(interactive ? 20 : 0)
  const reducedMotion = useReducedMotion()
  const playfieldRef = useRef(null)
  const lastAimSentAt = useRef(0)
  const pendingAim = useRef(null)
  const aimFrame = useRef(0)
  const heldKeysRef = useRef(new Set())
  const lastMovementRef = useRef('stopped')
  const localShotSequence = useRef(0)
  const processedEvents = useRef(new Set())
  useEffect(() => transport.subscribe('view', setRaceView), [transport])
  useEffect(() => {
    processedEvents.current.clear()
  }, [raceView.round])
  const localPlayer = raceView.players.find(player => player.id === raceView.localPlayerId)
  useEffect(() => {
    if (!interactive) return undefined
    let clearEffect
    const unsubscribe = transport.subscribe('event', envelope => {
      const shot = envelope?.payload
      if (!shot?.eventId || processedEvents.current.has(shot.eventId)) return
      processedEvents.current.add(shot.eventId)
      if (processedEvents.current.size > 300) {
        const oldest = processedEvents.current.values().next().value
        processedEvents.current.delete(oldest)
      }
      if (!shot.hit && shot.shooterName === localPlayer?.name) {
        audio.playNearMiss()
        window.clearTimeout(clearEffect)
        setServerShotEffect({ kind: 'miss', eventId: shot.eventId, x: shot.impactX, laneId: shot.laneId })
        clearEffect = window.setTimeout(() => setServerShotEffect(null), 320)
        return
      }
      if (!shot.hit) return
      const kind = shot.laneId === raceView.localLaneId
        ? 'victim'
        : shot.shooterName === localPlayer?.name
          ? 'shooter'
          : null
      if (!kind) return
      window.clearTimeout(clearEffect)
      setScreenEffect({ kind, eventId: shot.eventId })
      setServerShotEffect({ kind: 'hit', eventId: shot.eventId, x: shot.impactX, laneId: shot.laneId })
      clearEffect = window.setTimeout(() => {
        setScreenEffect(null)
        setServerShotEffect(null)
      }, kind === 'victim' ? 520 : 320)
    })
    return () => {
      window.clearTimeout(clearEffect)
      unsubscribe()
    }
  }, [audio, interactive, localPlayer?.name, raceView.localLaneId, transport])
  useEffect(() => {
    if (interactive || !raceView.winner?.eventId) return undefined
    const revealed = raceView.racers.filter(racer => racer.revealedName)
    if (reducedMotion) {
      setRevealCount(revealed.length)
      return undefined
    }
    setRevealCount(0)
    const timer = window.setInterval(() => {
      setRevealCount(count => {
        if (count >= revealed.length) {
          window.clearInterval(timer)
          return count
        }
        return count + 1
      })
    }, 130)
    return () => window.clearInterval(timer)
  }, [interactive, raceView.racers, raceView.winner?.eventId, reducedMotion])

  const localRacer = raceView.racers.find(racer => racer.laneId === raceView.localLaneId)
  useEffect(() => {
    if (!interactive || raceView.phase !== 'playing') {
      audio.updateAtmosphere({ movementMode: 'stopped', exhausted: false, progress: 0 })
      return
    }
    audio.updateAtmosphere({
      movementMode: localRacer?.movementMode ?? 'stopped',
      exhausted: raceView.localExhausted,
      progress: localRacer?.progress ?? 0,
    })
  }, [audio, interactive, localRacer?.movementMode, localRacer?.progress, raceView.localExhausted, raceView.phase])
  useEffect(() => {
    const heldKeys = heldKeysRef.current
    const isTyping = target => target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement
    const publishMovement = () => {
      const movement = heldKeys.has('Space')
        ? 'running'
        : heldKeys.has('ArrowRight')
          ? 'walking'
          : 'stopped'
      setPressedKeys({
        walking: heldKeys.has('ArrowRight'),
        running: heldKeys.has('Space'),
      })
      if (movement !== lastMovementRef.current) {
        lastMovementRef.current = movement
        transport.move(movement)
      }
    }
    const update = event => {
      if (!interactive || raceView.phase !== 'playing') return
      if (localPlayer?.role === 'spectator') return
      if (isTyping(event.target)) return
      if (event.code !== 'ArrowRight' && event.code !== 'Space') return
      if (event.code === 'Space') event.preventDefault()
      heldKeys.add(event.code)
      publishMovement()
    }
    const stop = event => {
      if (!interactive || raceView.phase !== 'playing') return
      if (isTyping(event.target)) return
      if (event.code !== 'ArrowRight' && event.code !== 'Space') return
      heldKeys.delete(event.code)
      publishMovement()
    }
    window.addEventListener('keydown', update)
    window.addEventListener('keyup', stop)
    return () => {
      heldKeys.clear()
      lastMovementRef.current = 'stopped'
      window.removeEventListener('keydown', update)
      window.removeEventListener('keyup', stop)
    }
  }, [interactive, localPlayer?.role, raceView.phase, transport])
  const pointFromEvent = event => {
    const bounds = playfieldRef.current.getBoundingClientRect()
    return {
      x: Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100)),
      laneId: Math.min(20, Math.max(1, Math.floor(((event.clientY - bounds.top) / bounds.height) * 20) + 1)),
    }
  }
  const updateAim = event => {
    if (!interactive || raceView.phase !== 'playing') return
    if (localPlayer?.role === 'spectator') return
    pendingAim.current = pointFromEvent(event)
    if (aimFrame.current) return
    aimFrame.current = window.requestAnimationFrame(() => {
      aimFrame.current = 0
      if (raceView.phase !== 'playing' || localPlayer?.role === 'spectator') return
      const nextAim = pendingAim.current
      if (!nextAim) return
      setAim(nextAim)
      const now = performance.now()
      if (now - lastAimSentAt.current >= 50) {
        lastAimSentAt.current = now
        transport.aim(nextAim.x, nextAim.y)
      }
    })
  }
  useEffect(() => () => { if (aimFrame.current) window.cancelAnimationFrame(aimFrame.current) }, [])
  const shoot = event => {
    if (!interactive || raceView.phase !== 'playing') return
    if (!localPlayer?.hasBullet || localPlayer.role === 'spectator') return
    const nextAim = pointFromEvent(event)
    setAim(nextAim)
    localShotSequence.current += 1
    setLocalShotEffect({ id: localShotSequence.current, x: nextAim.x, y: nextAim.y })
    window.setTimeout(() => setLocalShotEffect(null), 180)
    audio.playShot()
    transport.shoot(nextAim.x, nextAim.y)
  }
  const crosshairs = raceView.crosshairs.map(crosshair =>
    crosshair.id === raceView.localCrosshairId
      ? { ...crosshair, aimX: aim.x, aimY: aim.y }
      : crosshair,
  )
  const recentShots = raceView.shots.slice(-4).reverse()
  const launchAge = Date.now() - raceView.countdownEndsAt
  const launching = raceView.phase === 'playing' && launchAge >= 0 && launchAge < 700
  const revealedRacers = raceView.racers.filter(racer => racer.revealedName)
  return <>
    <section className={`migration-track phase-${raceView.phase} ${launching ? 'is-launching' : ''} ${raceView.winner?.eventId ? 'is-celebrating' : ''} ${raceView.localEliminated ? 'local-eliminated' : ''} ${screenEffect ? `effect-${screenEffect.kind}` : ''}`} data-winner-event={raceView.winner?.eventId || undefined} ref={playfieldRef} onMouseMove={updateAim} onClick={shoot} aria-label='Race track'>
      {screenEffect && <div className={`migration-hit-flash ${screenEffect.kind}`} data-event-id={screenEffect.eventId} aria-hidden='true' />}
      {(raceView.phase === 'countdown' || (raceView.phase === 'playing' && raceView.countdownEndsAt > 0)) && <Countdown endsAt={raceView.countdownEndsAt} onBeat={audio.playCountdownTone} />}
      {localShotEffect && <div className='migration-local-shot' key={localShotEffect.id} style={{ left: `${localShotEffect.x}%`, top: `${localShotEffect.y}%` }} aria-hidden='true'><i /><b /></div>}
      {serverShotEffect && <div className={`migration-impact ${serverShotEffect.kind}`} data-event-id={serverShotEffect.eventId} style={{ left: `${serverShotEffect.x}%`, top: `${((serverShotEffect.laneId - 0.5) / 20) * 100}%` }} aria-hidden='true' />}
      {raceView.winner?.eventId && <div className='migration-finish-burst' aria-hidden='true'>{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--particle': index }} />)}</div>}
      <div className='migration-finish' />
      {raceView.racers.map(racer => <div className='migration-lane' key={racer.laneId} data-lane={racer.laneId}>
        <PixelRacer racer={racer} roomCode={raceView.roomCode} round={raceView.round} isLocal={racer.laneId === raceView.localLaneId} localExhausted={raceView.localExhausted} anticipating={raceView.phase === 'countdown'} launching={launching} winner={racer.laneId === raceView.winner?.laneId} showReveal={interactive || !raceView.winner?.eventId || !racer.revealedName || revealedRacers.indexOf(racer) < revealCount} />
        {raceView.shots.filter(shot => shot.hit && shot.laneId === racer.laneId).slice(-1).map(shot => <div className='migration-ko' key={shot.eventId} style={{ left: `${shot.impactX}%` }}>KO! <small>{shot.shooterName}</small></div>)}
      </div>)}
      {interactive && crosshairs.map(crosshair => <div
        className={`migration-crosshair color-${crosshair.colorIndex} ${crosshair.id === raceView.localCrosshairId ? 'is-local' : ''} ${crosshair.hasBullet ? '' : 'spent'} ${localShotEffect && crosshair.id === raceView.localCrosshairId ? 'recoil' : ''}`}
        key={crosshair.id}
        style={{ left: `${crosshair.aimX}%`, top: `${crosshair.aimY}%` }}
      ><span>+</span>{crosshair.hasBullet && <i aria-label='Loaded bullet' />}</div>)}
      {recentShots.length > 0 && <div className='migration-kill-feed' aria-label='Kill feed'>{recentShots.map(shot => <div key={shot.eventId}><strong>{shot.shooterName}</strong><span>▸</span><span>{shot.hit ? shot.victimName || `NPC ${shot.laneId}` : 'missed'}</span></div>)}</div>}
    </section>
    {interactive && <div className={`migration-controls ${localPlayer?.role === 'spectator' || raceView.localEliminated ? 'spectating' : ''}`}><span className={pressedKeys.walking ? 'pressed' : ''}><kbd>→</kbd> Walk</span><span className={`migration-sprint ${pressedKeys.running ? 'pressed' : ''} ${raceView.localExhausted ? 'exhausted' : ''}`} style={{ '--stamina': raceView.localStamina }}><b><i /></b><kbd>Space</kbd> Sprint</span><span className={!localPlayer?.hasBullet ? 'spent' : ''}><kbd>Mouse 1</kbd> Aim and shoot</span><strong>{localPlayer?.role === 'spectator' || raceView.localEliminated ? 'Spectating' : localPlayer?.hasBullet ? '1 bullet' : 'Bullet spent'}</strong></div>}
  </>
}

export default function ColyseusApp({ transport: suppliedTransport }) {
  const transport = useMemo(() => suppliedTransport ?? new ColyseusTransport(), [suppliedTransport])
  const [view, setView] = useState(emptyView)
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [mode, setMode] = useState('join')
  const [privacy, setPrivacy] = useState('public')
  const [roundCount, setRoundCount] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [roundBaseline, setRoundBaseline] = useState({ round: 0, players: {} })
  const celebratedWinners = useRef(new Set())
  const audio = useGameAudio(view.phase)

  useEffect(() => {
    const offView = transport.subscribe('meta', setView)
    const offError = transport.subscribe('error', event => setError(event?.payload?.message ?? event.message ?? 'Connection error'))
    const offClosed = transport.subscribe('closed', details => setView(details?.reason
      ? { ...emptyView, phase: 'closed', closedReason: details.message }
      : emptyView))
    return () => { offView(); offError(); offClosed() }
  }, [transport])

  useEffect(() => {
    if (view.phase === 'menu' || view.phase === 'closed') {
      celebratedWinners.current.clear()
      return undefined
    }
    let timeout
    const leaveIdleRoom = () => {
      void transport.leave().catch(() => {})
      celebratedWinners.current.clear()
      setView(emptyView)
    }
    const resetIdleTimeout = () => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(leaveIdleRoom, CLIENT_IDLE_TIMEOUT_MS)
    }
    resetIdleTimeout()
    window.addEventListener('pointerdown', resetIdleTimeout, true)
    window.addEventListener('pointermove', resetIdleTimeout, true)
    window.addEventListener('keydown', resetIdleTimeout, true)
    window.addEventListener('wheel', resetIdleTimeout, true)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('pointerdown', resetIdleTimeout, true)
      window.removeEventListener('pointermove', resetIdleTimeout, true)
      window.removeEventListener('keydown', resetIdleTimeout, true)
      window.removeEventListener('wheel', resetIdleTimeout, true)
    }
  }, [transport, view.phase])

  useEffect(() => {
    if (view.phase !== 'countdown' || roundBaseline.round === view.round) return
    setRoundBaseline({
      round: view.round,
      players: Object.fromEntries(view.players.map(player => [player.id, { score: player.score, kills: player.kills }])),
    })
  }, [roundBaseline.round, view.phase, view.players, view.round])

  useEffect(() => {
    const eventId = view.winner?.eventId
    if (!eventId || celebratedWinners.current.has(eventId)) return
    celebratedWinners.current.add(eventId)
    audio.playFinish()
  }, [audio, view.winner?.eventId])

  const localPlayer = view.players.find(player => player.id === view.localPlayerId)
  const isHost = view.localPlayerId && view.localPlayerId === view.hostPlayerId
  const allReady = view.players.length > 0 && view.players.every(player => player.connected && player.ready)

  const connect = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const code = roomCode.trim().toUpperCase() || createLobbyCode()
      setRoomCode(code)
      if (mode === 'create') {
        await transport.create({ roomCode: code, playerName: name, privacy, roundCount })
      } else {
        await transport.join({ roomCode: code, playerName: name })
      }
    } catch (connectionError) {
      setError(connectionError.message)
    } finally {
      setBusy(false)
    }
  }

  if (view.phase === 'menu') {
    return <main className='migration-shell'>
      <header className='migration-menu-head'>
        <div><p>Death Race</p><h1>Enter the race</h1></div>
        <AudioControls audio={audio} />
      </header>
      <div className='migration-menu'>
        <MenuPreview />
        <form className='migration-connect' onSubmit={connect}>
        <div className='migration-tabs' role='tablist'>
          <button type='button' className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>Join lobby</button>
          <button type='button' className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>Host a game</button>
        </div>
        <label>Your name<input value={name} onChange={event => setName(event.target.value)} maxLength={24} required /></label>
        <label>Lobby code<input value={roomCode} onChange={event => setRoomCode(event.target.value)} maxLength={12} required={mode === 'join'} placeholder={mode === 'create' ? 'Generated automatically' : 'Enter shared code'} /></label>
        <div className='migration-options'>
          <label>Privacy<select value={privacy} disabled={mode === 'join'} onChange={event => setPrivacy(event.target.value)}><option value='public'>Public</option><option value='private'>Private</option></select></label>
          <label>Rounds<select value={roundCount} disabled={mode === 'join'} onChange={event => setRoundCount(Number(event.target.value))}><option>3</option><option>5</option><option>7</option></select></label>
        </div>
        {error && <p className='migration-error' role='alert'>{error}</p>}
        <button className='migration-primary' disabled={busy}>{busy ? 'Connecting...' : mode === 'create' ? 'Create lobby' : 'Join lobby'}</button>
        </form>
      </div>
    </main>
  }

  if (view.phase === 'closed') {
    return <main className='migration-shell'>
      <header><p>Death Race</p><h1>Room closed</h1></header>
      <section className='migration-closed'>
        <p>{view.closedReason || 'This room is no longer available.'}</p>
        <button className='migration-primary' onClick={() => { setError(''); setView(emptyView) }}>Return to menu</button>
      </section>
    </main>
  }

  const playing = view.phase === 'countdown' || view.phase === 'playing'
  return <main className={`migration-shell ${playing ? 'is-playing' : ''}`}>
    <header className='migration-topbar'>
      <div><p>Death Race</p><h1>{playing ? `Round ${view.round}` : `Lobby ${view.roomCode}`}</h1></div>
      <div className='migration-summary'><span>{view.players.length} real players</span><span>Round {view.round} of {view.roundCount}</span></div>
      <AudioControls audio={audio} />
    </header>
    {!playing && view.phase === 'lobby' && <section className='migration-lobby'>
      <div className='migration-actions'>
        <label>Display name<input value={name} onChange={event => setName(event.target.value)} onBlur={() => name.trim() && transport.rename(name)} /></label>
        <button className='migration-primary' onClick={() => transport.setReady(!localPlayer?.ready)}>{localPlayer?.ready ? 'Not ready' : 'Ready'}</button>
        {isHost && <button disabled={!allReady} onClick={() => transport.startCountdown()}>Start game</button>}
      </div>
      <div className='migration-roster'>{view.players.map(player => <div key={player.id}><strong>{player.name}</strong><span>{player.role === 'host' ? 'Host' : player.ready ? 'Ready' : 'Waiting'}</span></div>)}</div>
    </section>}
    {playing && <AuthoritativeRace transport={transport} initialView={transport.currentView ?? { ...view, racers: [] }} audio={audio} />}
    {(view.phase === 'roundOver' || view.phase === 'gameOver') && <div className='migration-postround'>
      <div className='migration-reveal-track'><AuthoritativeRace transport={transport} initialView={transport.currentView ?? view} audio={audio} interactive={false} /></div>
      <section className='migration-results'>
        <p>{view.winner?.type === 'npc' ? 'NPC shame. Humans revealed.' : 'Human winner. Racers revealed.'}</p>
        <h2>{view.winner?.type === 'npc' ? `${view.winner.name} won` : `${view.winner?.name ?? 'Racer'} wins`}</h2>
        <div className='migration-scoreboard'>{[...view.players].sort((a, b) => b.score - a.score).map((player, index) => {
          const baseline = roundBaseline.players[player.id] ?? { score: 0, kills: 0 }
          const scoreDelta = Math.max(0, player.score - baseline.score)
          const killDelta = Math.max(0, player.kills - baseline.kills)
          return <div className={scoreDelta || killDelta ? 'earned' : ''} key={player.id} style={{ '--row': index }}><strong>{player.name}</strong><span>{player.kills} kills {killDelta > 0 && <i>+{killDelta}</i>}</span><b>{player.score} {scoreDelta > 0 && <i>+{scoreDelta}</i>}</b></div>
        })}</div>
        {isHost && view.phase === 'roundOver' && <button className='migration-primary' onClick={() => transport.nextRound()}>{view.round >= view.roundCount ? 'Show final scores' : 'Next round'}</button>}
      </section>
    </div>}
  </main>
}
