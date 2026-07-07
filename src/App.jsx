import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const STATES = [
  'menu',
  'lobby',
  'countdown',
  'playing',
  'paused',
  'roundOver',
  'scoreboard',
  'gameOver',
]

const PLAYERS = ['James', 'Mia', 'Noah', 'Ava']
const WAITING_PLAYERS = ['James', 'Mia', 'Noah', 'Ava', 'Theo']
const LATE_JOINERS = ['Riley']
const ARCHETYPES = ['Driver', 'Runner', 'Mask', 'Coat', 'Cap']
const HUMAN_ASSIGNMENTS = [7, 2, 15, 11]
const LANES = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  archetype: ARCHETYPES[index % ARCHETYPES.length],
  progress: 13 + (index % 5) * 8 + Math.floor(index / 5) * 3,
  depth: Math.floor(index / 5),
}))

const STATE_COPY = {
  menu: {
    eyebrow: 'Death Race Online',
    title: 'Hidden-identity racing with one shot each.',
    body: 'Create a room, fill the grid to 20 racers, and start reading movement tells before anyone reads yours.',
    action: 'Create lobby',
    next: 'lobby',
  },
  lobby: {
    eyebrow: 'Lobby DR-2048',
    title: 'Public room, 4 humans, 16 NPCs.',
    body: 'Host chooses 5 rounds. Names stay here and on the scoreboard, never attached to racers during play.',
    action: 'Start countdown',
    next: 'countdown',
  },
  countdown: {
    eyebrow: 'Round 1',
    title: '3, 2, 1, go.',
    body: 'Assignments are secret. Movement and shooting unlock when the countdown clears.',
    action: 'Go',
    next: 'playing',
  },
  playing: {
    eyebrow: 'Live round',
    title: 'Walk, run, aim, fire once.',
    body: 'Space walks, Left Shift runs, mouse aims, Mouse 1 fires. Crosshairs remain visible until the shot is spent.',
    action: 'Declare winner',
    next: 'roundOver',
  },
  paused: {
    eyebrow: 'Paused',
    title: 'Simulation stopped.',
    body: 'The live state remains visible while action is paused.',
    action: 'Resume',
    next: 'playing',
  },
  roundOver: {
    eyebrow: 'NPC wins',
    title: 'Everyone gets shamed.',
    body: 'Human-controlled racers are revealed and highlighted before the scoreboard appears.',
    action: 'Show scoreboard',
    next: 'scoreboard',
  },
  scoreboard: {
    eyebrow: 'Scoreboard',
    title: 'Round winner earns 1 point.',
    body: 'NPC wins award no human points. Host can instantly start the next round.',
    action: 'Next round',
    next: 'countdown',
  },
  gameOver: {
    eyebrow: 'Match complete',
    title: 'Final scores are locked.',
    body: 'Return to the lobby to change players or round count.',
    action: 'Back to lobby',
    next: 'lobby',
  },
}

const ROOM_CODE = 'DR-2048'
const ROOM_LINK = `deathrace.local/join/${ROOM_CODE}`
const ROUND_OPTIONS = [3, 5, 7]
const COUNTDOWN_STEPS = ['3', '2', '1', 'go']
const WALK_SPEED = 0.35
const RUN_SPEED = 0.85
const TICK_MS = 80
const NPC_PATTERNS = [
  ['walk', 'walk', 'stop', 'walk', 'run', 'walk', 'stop'],
  ['stop', 'walk', 'walk', 'run', 'walk', 'stop', 'walk'],
  ['walk', 'stop', 'walk', 'walk', 'stop', 'run', 'walk'],
  ['walk', 'run', 'walk', 'stop', 'walk', 'walk', 'stop'],
]
const NPC_SPEEDS = {
  stop: 0,
  walk: 0.18,
  run: 0.52,
}

function App() {
  const [state, setState] = useState('menu')
  const [privacy, setPrivacy] = useState('public')
  const [roundCount, setRoundCount] = useState(5)
  const [countdownIndex, setCountdownIndex] = useState(0)
  const [movementMode, setMovementMode] = useState('stopped')
  const [controlledProgress, setControlledProgress] = useState(0)
  const [npcTick, setNpcTick] = useState(0)
  const pressedKeys = useRef({ run: false, walk: false })
  const activeState = STATE_COPY[state]
  const lobbyInProgress = !['menu', 'lobby'].includes(state)
  const activePlayers = lobbyInProgress ? PLAYERS : WAITING_PLAYERS
  const spectators = lobbyInProgress ? LATE_JOINERS : []
  const movementLocked = state === 'countdown'
  const controlledRacerId = HUMAN_ASSIGNMENTS[0]
  const roundRacers = useMemo(
    () =>
      LANES.map((lane) => {
        const playerIndex = HUMAN_ASSIGNMENTS.indexOf(lane.id)
        const npcPattern = NPC_PATTERNS[(lane.id + lane.depth) % NPC_PATTERNS.length]
        return {
          ...lane,
          controller:
            playerIndex >= 0
              ? {
                  type: 'human',
                  name: PLAYERS[playerIndex],
                  color: ['red', 'blue', 'green', 'yellow'][playerIndex],
                }
              : {
                  type: 'npc',
                  name: `NPC ${lane.id}`,
                  color: 'npc',
                },
          npc: {
            pattern: npcPattern,
            offset: lane.id % npcPattern.length,
            progress: 0,
          },
        }
      }),
    [],
  )
  const humansAssigned = roundRacers.filter(
    (racer) => racer.controller.type === 'human',
  )
  const npcCount = roundRacers.length - humansAssigned.length

  useEffect(() => {
    if (state !== 'playing') {
      pressedKeys.current = { run: false, walk: false }
      setMovementMode('stopped')
    }
  }, [state])

  useEffect(() => {
    const syncMovement = () => {
      const { run, walk } = pressedKeys.current
      if (run) {
        setMovementMode('running')
        return
      }
      if (walk) {
        setMovementMode('walking')
        return
      }
      setMovementMode('stopped')
    }

    const handleKeyDown = (event) => {
      if (event.code !== 'Space' && event.code !== 'ShiftLeft') {
        return
      }
      event.preventDefault()
      if (state !== 'playing') {
        return
      }
      if (event.code === 'Space') {
        pressedKeys.current.walk = true
      }
      if (event.code === 'ShiftLeft') {
        pressedKeys.current.run = true
      }
      syncMovement()
    }

    const handleKeyUp = (event) => {
      if (event.code !== 'Space' && event.code !== 'ShiftLeft') {
        return
      }
      event.preventDefault()
      if (event.code === 'Space') {
        pressedKeys.current.walk = false
      }
      if (event.code === 'ShiftLeft') {
        pressedKeys.current.run = false
      }
      syncMovement()
    }

    const clearMovement = () => {
      pressedKeys.current = { run: false, walk: false }
      setMovementMode('stopped')
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearMovement)
    document.addEventListener('visibilitychange', clearMovement)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearMovement)
      document.removeEventListener('visibilitychange', clearMovement)
    }
  }, [state])

  useEffect(() => {
    if (state !== 'playing' || movementMode === 'stopped') {
      return undefined
    }
    const speed = movementMode === 'running' ? RUN_SPEED : WALK_SPEED
    const intervalId = window.setInterval(() => {
      setControlledProgress((current) => Math.min(current + speed, 28))
    }, TICK_MS)
    return () => window.clearInterval(intervalId)
  }, [movementMode, state])

  useEffect(() => {
    if (state !== 'playing') {
      return undefined
    }
    const intervalId = window.setInterval(() => {
      setNpcTick((current) => current + 1)
    }, TICK_MS)
    return () => window.clearInterval(intervalId)
  }, [state])

  const statusItems = useMemo(
    () => [
      ['Room', 'DR-2048'],
      ['Mode', 'Local prototype'],
      ['Rounds', `1 / ${roundCount}`],
      ['Racers', roundRacers.length],
    ],
    [roundCount, roundRacers.length],
  )

  const moveToState = (nextState) => {
    if (nextState === 'countdown') {
      setCountdownIndex(0)
      setControlledProgress(0)
      setNpcTick(0)
    }
    setState(nextState)
  }

  const advanceCountdown = () => {
    const nextIndex = countdownIndex + 1
    if (nextIndex >= COUNTDOWN_STEPS.length) {
      moveToState('playing')
      return
    }
    setCountdownIndex(nextIndex)
  }

  const renderLobby = () => (
    <div className="lobby-panel" aria-label="Lobby controls">
      <div className="room-card">
        <span>Room code</span>
        <strong>{ROOM_CODE}</strong>
        <code>{ROOM_LINK}</code>
      </div>

      <div className="control-group">
        <span>Privacy</span>
        <div className="segmented-control" aria-label="Lobby privacy">
          {['public', 'private'].map((option) => (
            <button
              key={option}
              type="button"
              className={privacy === option ? 'active' : ''}
              onClick={() => setPrivacy(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <span>Rounds</span>
        <div className="round-options" aria-label="Round count">
          {ROUND_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={roundCount === option ? 'active' : ''}
              onClick={() => setRoundCount(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="player-list" aria-label="Lobby players">
        <div className="list-heading">
          <span>Players</span>
          <strong>{activePlayers.length}/20</strong>
        </div>
        {activePlayers.map((player, index) => (
          <div className="player-row" key={player}>
            <span>{player}</span>
            <small>{index === 0 ? 'Host' : 'Ready'}</small>
          </div>
        ))}
      </div>

      <div className="player-list spectator-list" aria-label="Spectators">
        <div className="list-heading">
          <span>Spectators</span>
          <strong>{spectators.length}</strong>
        </div>
        {spectators.length > 0 ? (
          spectators.map((player) => (
            <div className="player-row" key={player}>
              <span>{player}</span>
              <small>Next round</small>
            </div>
          ))
        ) : (
          <p>No late joiners yet.</p>
        )}
      </div>

      <button
        type="button"
        className="host-start"
        onClick={() => moveToState('countdown')}
        disabled={lobbyInProgress}
      >
        {lobbyInProgress ? 'Round in progress' : 'Start round'}
      </button>
    </div>
  )

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Death Race</p>
          <h1>Read the racer, hide the tell.</h1>
        </div>
        <div className="state-tabs" aria-label="Game state controls">
          {STATES.map((item) => (
            <button
              key={item}
              type="button"
              className={item === state ? 'active' : ''}
              onClick={() => moveToState(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <section className="status-strip" aria-label="Round status">
        {statusItems.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className="hero-panel" aria-labelledby="state-title">
        <div className="state-card">
          <p className="eyebrow">{activeState.eyebrow}</p>
          <h2 id="state-title">{activeState.title}</h2>
          <p>{activeState.body}</p>
          {state === 'countdown' ? (
            <div className="countdown-panel" aria-label="Countdown">
              <span>{COUNTDOWN_STEPS[countdownIndex]}</span>
              <p>Movement and shooting are locked until go.</p>
              <button type="button" onClick={advanceCountdown}>
                Advance countdown
              </button>
            </div>
          ) : null}
          {state !== 'menu' ? (
            <div className="assignment-summary" aria-label="Round setup">
              <span>Round setup</span>
              <strong>{roundRacers.length} racers</strong>
              <p>
                {humansAssigned.length} hidden humans, {npcCount} NPCs.
              </p>
            </div>
          ) : null}
          {state === 'playing' ? (
            <div className="npc-summary" aria-label="NPC behavior">
              <span>NPC behavior</span>
              <strong>{npcCount} racers thinking</strong>
              <p>Walk, pause, and occasional run patterns. NPCs never shoot.</p>
            </div>
          ) : null}
          {state !== 'menu' ? renderLobby() : null}
          {state === 'lobby' || state === 'countdown' ? null : (
            <div className="actions">
              <button type="button" onClick={() => moveToState(activeState.next)}>
                {activeState.action}
              </button>
              {state === 'playing' ? (
                <button type="button" onClick={() => moveToState('paused')}>
                  Pause
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="playfield" aria-label="20 lane race playfield">
          {roundRacers.map((lane) => {
            const isHuman = lane.controller.type === 'human'
            const isControlled = lane.id === controlledRacerId
            const isRevealed = state === 'roundOver' || state === 'scoreboard'
            const archetypeClass = lane.archetype.toLowerCase()
            const npcStep =
              lane.npc.pattern[
                (Math.floor(npcTick / 7) + lane.npc.offset) %
                  lane.npc.pattern.length
              ]
            const npcProgress =
              !isHuman && state === 'playing'
                ? Math.min(npcTick * NPC_SPEEDS[npcStep], 34)
                : 0
            const racerProgress =
              lane.progress + (isControlled ? controlledProgress : npcProgress)
            return (
              <div
                className={[
                  'lane',
                  movementLocked ? 'locked' : '',
                  isControlled ? 'controlled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={lane.id}
                style={{ '--depth': lane.depth }}
              >
                <span className="lane-number">{lane.id}</span>
                <span className="lane-stripe" />
                <span
                  className={[
                    'racer',
                    `archetype-${archetypeClass}`,
                    isControlled ? movementMode : '',
                    !isHuman && state === 'playing' ? npcStep : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ '--racer-progress': `${racerProgress}%` }}
                  title={lane.archetype}
                >
                  <span className="racer-head" />
                  <span className="racer-body" />
                  <span className="racer-shadow" />
                </span>
                {isHuman && isRevealed ? (
                  <span className="reveal-tag">{lane.controller.name}</span>
                ) : null}
                {isHuman && state === 'playing' ? (
                  <span
                    className={`crosshair crosshair-${lane.controller.color}`}
                    style={{ left: `${62 + lane.id * 3}%` }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default App
