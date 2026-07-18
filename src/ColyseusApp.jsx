import { useEffect, useMemo, useRef, useState } from 'react'
import { ColyseusTransport } from './multiplayer/colyseusTransport.js'
import { createLobbyCode } from './multiplayer/lobbyCode.js'
import { useGameAudio } from './multiplayer/useGameAudio.js'
import { hashString } from './npcBehavior.js'
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

function PixelRacer({ racer, roomCode, round, isLocal, localExhausted }) {
  const appearance = racerAppearance(roomCode, round, racer.laneId)
  const movementClass = racer.eliminated ? '' : racer.movementMode
  return <div
    className={`migration-racer archetype-${appearance.palette} ${appearance.shapeClass} ${movementClass} ${racer.eliminated ? 'eliminated' : ''} ${isLocal && localExhausted ? 'winded' : ''}`}
    data-testid={`migration-racer-${racer.laneId}`}
    style={{ left: `${racer.progress}%` }}
    title={`${appearance.species} · ${appearance.palette}`}
  >
    <span className='racer-head' />
    <span className='racer-body' />
    <span className='racer-shadow' />
    <span className='racer-dust' aria-hidden='true' />
    <span className='racer-sweat' aria-hidden='true' />
    {racer.revealedName && <strong className='migration-reveal-name'>{racer.revealedName}</strong>}
  </div>
}

function Countdown({ endsAt }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [])
  if (Number.isFinite(endsAt) && now >= endsAt + 450) return null
  const remaining = Number.isFinite(endsAt) ? Math.ceil((endsAt - now) / 1000) : 3
  return <div className='migration-countdown'>{remaining > 0 ? remaining : 'Go!'}</div>
}

function AuthoritativeRace({ transport, initialView, playShot, interactive = true }) {
  const [raceView, setRaceView] = useState(initialView)
  const [aim, setAim] = useState({ laneId: 1, x: 0 })
  const [pressedKeys, setPressedKeys] = useState({ walking: false, running: false })
  const [screenEffect, setScreenEffect] = useState(null)
  const playfieldRef = useRef(null)
  const lastAimSentAt = useRef(0)
  const heldKeysRef = useRef(new Set())
  const lastMovementRef = useRef('stopped')
  useEffect(() => transport.subscribe('view', setRaceView), [transport])
  const localPlayer = raceView.players.find(player => player.id === raceView.localPlayerId)
  useEffect(() => {
    if (!interactive) return undefined
    let clearEffect
    const unsubscribe = transport.subscribe('event', envelope => {
      const shot = envelope?.payload
      if (!shot?.hit) return
      const kind = shot.laneId === raceView.localLaneId
        ? 'victim'
        : shot.shooterName === localPlayer?.name
          ? 'shooter'
          : null
      if (!kind) return
      window.clearTimeout(clearEffect)
      setScreenEffect({ kind, eventId: shot.eventId })
      clearEffect = window.setTimeout(() => setScreenEffect(null), kind === 'victim' ? 520 : 260)
    })
    return () => {
      window.clearTimeout(clearEffect)
      unsubscribe()
    }
  }, [interactive, localPlayer?.name, raceView.localLaneId, transport])
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
    const nextAim = pointFromEvent(event)
    setAim(nextAim)
    const now = performance.now()
    if (now - lastAimSentAt.current >= 50) {
      lastAimSentAt.current = now
      transport.aim(nextAim.x, nextAim.y)
    }
  }
  const shoot = event => {
    if (!interactive || raceView.phase !== 'playing') return
    if (!localPlayer?.hasBullet || localPlayer.role === 'spectator') return
    const nextAim = pointFromEvent(event)
    setAim(nextAim)
    playShot()
    transport.shoot(nextAim.x, nextAim.y)
  }
  const crosshairs = raceView.crosshairs.map(crosshair =>
    crosshair.id === raceView.localCrosshairId
      ? { ...crosshair, aimX: aim.x, aimY: aim.y }
      : crosshair,
  )
  const recentShots = raceView.shots.slice(-4).reverse()
  return <>
    <section className={`migration-track ${raceView.localEliminated ? 'local-eliminated' : ''} ${screenEffect ? `effect-${screenEffect.kind}` : ''}`} ref={playfieldRef} onMouseMove={updateAim} onClick={shoot} aria-label='Race track'>
      {screenEffect && <div className={`migration-hit-flash ${screenEffect.kind}`} data-event-id={screenEffect.eventId} aria-hidden='true' />}
      {(raceView.phase === 'countdown' || raceView.phase === 'playing') && <Countdown endsAt={raceView.countdownEndsAt} />}
      <div className='migration-finish' />
      {raceView.racers.map(racer => <div className='migration-lane' key={racer.laneId} data-lane={racer.laneId}>
        <PixelRacer racer={racer} roomCode={raceView.roomCode} round={raceView.round} isLocal={racer.laneId === raceView.localLaneId} localExhausted={raceView.localExhausted} />
        {raceView.shots.filter(shot => shot.hit && shot.laneId === racer.laneId).slice(-1).map(shot => <div className='migration-ko' key={shot.eventId} style={{ left: `${shot.impactX}%` }}>KO! <small>{shot.shooterName}</small></div>)}
      </div>)}
      {interactive && crosshairs.map(crosshair => <div
        className={`migration-crosshair color-${crosshair.colorIndex} ${crosshair.hasBullet ? '' : 'spent'}`}
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
  const { muted, toggleMuted, playShot } = useGameAudio(view.phase)

  useEffect(() => {
    const offView = transport.subscribe('meta', setView)
    const offError = transport.subscribe('error', event => setError(event?.payload?.message ?? event.message ?? 'Connection error'))
    const offClosed = transport.subscribe('closed', details => setView(details?.reason
      ? { ...emptyView, phase: 'closed', closedReason: details.message }
      : emptyView))
    return () => { offView(); offError(); offClosed() }
  }, [transport])

  useEffect(() => {
    if (view.phase === 'menu' || view.phase === 'closed') return undefined
    let timeout
    const leaveIdleRoom = () => {
      void transport.leave().catch(() => {})
      setView(emptyView)
    }
    const resetIdleTimeout = () => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(leaveIdleRoom, CLIENT_IDLE_TIMEOUT_MS)
    }
    resetIdleTimeout()
    window.addEventListener('pointerdown', resetIdleTimeout, true)
    window.addEventListener('keydown', resetIdleTimeout, true)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('pointerdown', resetIdleTimeout, true)
      window.removeEventListener('keydown', resetIdleTimeout, true)
    }
  }, [transport, view.phase])

  const localPlayer = view.players.find(player => player.id === view.localPlayerId)
  const isHost = view.localPlayerId && view.localPlayerId === view.hostPlayerId
  const allReady = view.players.length > 0 && view.players.every(player => player.connected && player.ready)

  const connect = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const code = roomCode.trim().toUpperCase() || createLobbyCode()
      if (mode === 'create') {
        setRoomCode(code)
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
      <header><p>Death Race</p><h1>Enter the race</h1></header>
      <form className='migration-connect' onSubmit={connect}>
        <div className='migration-tabs' role='tablist'>
          <button type='button' className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>Join lobby</button>
          <button type='button' className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>Host a game</button>
        </div>
        <label>Your name<input value={name} onChange={event => setName(event.target.value)} maxLength={24} required /></label>
        <label>Lobby code<input value={roomCode} onChange={event => setRoomCode(event.target.value)} maxLength={12} required={mode === 'join'} placeholder={mode === 'create' ? 'Generated automatically' : 'Enter shared code'} /></label>
        {mode === 'create' && <div className='migration-options'>
          <label>Privacy<select value={privacy} onChange={event => setPrivacy(event.target.value)}><option value='public'>Public</option><option value='private'>Private</option></select></label>
          <label>Rounds<select value={roundCount} onChange={event => setRoundCount(Number(event.target.value))}><option>3</option><option>5</option><option>7</option></select></label>
        </div>}
        {error && <p className='migration-error' role='alert'>{error}</p>}
        <button className='migration-primary' disabled={busy}>{busy ? 'Connecting...' : mode === 'create' ? 'Create lobby' : 'Join lobby'}</button>
      </form>
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
      <button className='migration-sound' type='button' onClick={toggleMuted} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? 'Sound off' : 'Sound on'}</button>
    </header>
    {!playing && view.phase === 'lobby' && <section className='migration-lobby'>
      <div className='migration-actions'>
        <label>Display name<input value={name} onChange={event => setName(event.target.value)} onBlur={() => name.trim() && transport.rename(name)} /></label>
        <button className='migration-primary' onClick={() => transport.setReady(!localPlayer?.ready)}>{localPlayer?.ready ? 'Not ready' : 'Ready'}</button>
        {isHost && <button disabled={!allReady} onClick={() => transport.startCountdown()}>Start game</button>}
      </div>
      <div className='migration-roster'>{view.players.map(player => <div key={player.id}><strong>{player.name}</strong><span>{player.role === 'host' ? 'Host' : player.ready ? 'Ready' : 'Waiting'}</span></div>)}</div>
    </section>}
    {playing && <AuthoritativeRace transport={transport} initialView={{ ...view, racers: [] }} playShot={playShot} />}
    {(view.phase === 'roundOver' || view.phase === 'gameOver') && <div className='migration-postround'>
      <div className='migration-reveal-track'><AuthoritativeRace transport={transport} initialView={transport.currentView ?? view} playShot={playShot} interactive={false} /></div>
      <section className='migration-results'>
        <p>{view.winner?.type === 'npc' ? 'NPC shame. Humans revealed.' : 'Human winner. Racers revealed.'}</p>
        <h2>{view.winner?.type === 'npc' ? `${view.winner.name} won` : `${view.winner?.name ?? 'Racer'} wins`}</h2>
        <div className='migration-scoreboard'>{[...view.players].sort((a, b) => b.score - a.score).map(player => <div key={player.id}><strong>{player.name}</strong><span>{player.kills} kills</span><b>{player.score}</b></div>)}</div>
        {isHost && view.phase === 'roundOver' && <button className='migration-primary' onClick={() => transport.nextRound()}>{view.round >= view.roundCount ? 'Show final scores' : 'Next round'}</button>}
      </section>
    </div>}
  </main>
}
