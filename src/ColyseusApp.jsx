import { useEffect, useMemo, useRef, useState } from 'react'
import { ColyseusTransport } from './multiplayer/colyseusTransport.js'
import { createLobbyCode } from './multiplayer/lobbyCode.js'
import { useGameAudio } from './multiplayer/useGameAudio.js'
import './ColyseusApp.css'

const emptyView = {
  phase: 'menu', players: [], racers: [], shots: [], round: 1, roundCount: 5,
  localLaneId: 0, localPlayerId: '', hostPlayerId: '', winner: null,
}

function Countdown({ endsAt }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [])
  const remaining = Number.isFinite(endsAt) ? Math.max(1, Math.ceil((endsAt - now) / 1000)) : 3
  return <div className='migration-countdown'>{remaining}</div>
}

function AuthoritativeRace({ transport, initialView, playShot }) {
  const [raceView, setRaceView] = useState(initialView)
  const [aim, setAim] = useState({ laneId: 1, x: 0 })
  const playfieldRef = useRef(null)
  useEffect(() => transport.subscribe('view', setRaceView), [transport])
  const localPlayer = raceView.players.find(player => player.id === raceView.localPlayerId)
  useEffect(() => {
    const update = event => {
      if (localPlayer?.role === 'spectator') return
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
      if (event.code === 'ArrowRight') transport.move('walking')
      if (event.code === 'Space') { event.preventDefault(); transport.move('running') }
    }
    const stop = event => {
      if (event.code === 'ArrowRight' || event.code === 'Space') transport.move('stopped')
    }
    window.addEventListener('keydown', update)
    window.addEventListener('keyup', stop)
    return () => { window.removeEventListener('keydown', update); window.removeEventListener('keyup', stop) }
  }, [localPlayer?.role, transport])
  const pointFromEvent = event => {
    const bounds = playfieldRef.current.getBoundingClientRect()
    return {
      x: Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100)),
      laneId: Math.min(20, Math.max(1, Math.floor(((event.clientY - bounds.top) / bounds.height) * 20) + 1)),
    }
  }
  const shoot = event => {
    if (!localPlayer?.hasBullet || localPlayer.role === 'spectator') return
    const nextAim = pointFromEvent(event)
    setAim(nextAim)
    playShot()
    transport.shoot(nextAim.x, ((nextAim.laneId - 0.5) / 20) * 100)
  }
  return <>
    <section className='migration-track' ref={playfieldRef} onMouseMove={event => setAim(pointFromEvent(event))} onClick={shoot} aria-label='Race track'>
      {raceView.phase === 'countdown' && <Countdown endsAt={raceView.countdownEndsAt} />}
      <div className='migration-finish' />
      {raceView.racers.map(racer => <div className='migration-lane' key={racer.laneId} data-lane={racer.laneId}>
        <div className={`migration-racer shape-${racer.laneId % 5} ${racer.eliminated ? 'eliminated' : ''}`} style={{ left: `${racer.progress}%` }} />
        {aim.laneId === racer.laneId && <div className={`migration-crosshair ${localPlayer?.hasBullet ? '' : 'spent'}`} style={{ left: `${aim.x}%` }}>+</div>}
      </div>)}
    </section>
    <div className={`migration-controls ${localPlayer?.role === 'spectator' ? 'spectating' : ''}`}><span><kbd>→</kbd> Walk</span><span><kbd>Space</kbd> Sprint</span><span><kbd>Mouse 1</kbd> Aim and shoot</span><strong>{localPlayer?.role === 'spectator' ? 'Spectating' : localPlayer?.hasBullet ? '1 bullet' : 'Bullet spent'}</strong></div>
  </>
}

export default function ColyseusApp({ transport: suppliedTransport }) {
  const transport = useMemo(() => suppliedTransport ?? new ColyseusTransport(), [suppliedTransport])
  const [view, setView] = useState(emptyView)
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [mode, setMode] = useState('create')
  const [privacy, setPrivacy] = useState('public')
  const [roundCount, setRoundCount] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { muted, toggleMuted, playShot } = useGameAudio(view.phase)

  useEffect(() => {
    const offView = transport.subscribe('meta', setView)
    const offError = transport.subscribe('error', event => setError(event?.payload?.message ?? event.message ?? 'Connection error'))
    const offClosed = transport.subscribe('closed', () => setView(emptyView))
    return () => { offView(); offError(); offClosed() }
  }, [transport])

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
          <button type='button' className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>Create lobby</button>
          <button type='button' className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>Join lobby</button>
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
    {(view.phase === 'roundOver' || view.phase === 'gameOver') && <section className='migration-results'>
      <h2>{view.winner?.type === 'npc' ? `${view.winner.name} won` : `${view.winner?.name ?? 'Racer'} wins`}</h2>
      <div className='migration-scoreboard'>{[...view.players].sort((a, b) => b.score - a.score).map(player => <div key={player.id}><strong>{player.name}</strong><span>{player.kills} kills</span><b>{player.score}</b></div>)}</div>
      {isHost && view.phase === 'roundOver' && <button className='migration-primary' onClick={() => transport.nextRound()}>{view.round >= view.roundCount ? 'Show final scores' : 'Next round'}</button>}
    </section>}
  </main>
}
