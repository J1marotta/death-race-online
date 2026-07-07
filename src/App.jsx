import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  startCountdown as apiStartCountdown,
  startNextRound as apiStartNextRound,
  setPlayerReady,
  submitPlayerInput,
  updateRoom,
} from './multiplayer/api'
import { canStartRoom } from './multiplayer/roomState'

const STATES = [
  'menu',
  'lobby',
  'countdown',
  'playing',
  'paused',
  'roundOver',
  'scoreboard',
  'gameOver'
]

const PLAYERS = ['James', 'Mia', 'Noah', 'Ava']
const WAITING_PLAYERS = ['James', 'Mia', 'Noah', 'Ava', 'Theo']
const LATE_JOINERS = ['Riley']
const ARCHETYPES = ['Driver', 'Runner', 'Mask', 'Coat', 'Cap']
const HUMAN_ASSIGNMENTS = [7, 2, 15, 11]
const HUMAN_COLORS = ['red', 'blue', 'green', 'yellow']
const START_POSITIONS = [
  7.2, 9.6, 8.4, 10.8, 7.9, 9.1, 8.8, 10.3, 7.5, 9.9,
  8.1, 10.6, 7.7, 9.2, 8.6, 10.1, 7.4, 9.4, 8.9, 10.4,
]

const shuffleStartPositions = (count) => {
  const pool = [...START_POSITIONS]
  const result = []
  for (let index = 0; index < count; index += 1) {
    const pick = (index * 3 + 2) % pool.length
    result.push(pool.splice(pick, 1)[0])
  }
  return result
}

const laneShapeSeed = (index) => `shape-${(index * 5 + Math.floor(index / 3)) % 5}`

const laneStartPositions = shuffleStartPositions(20)

const LANES = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  archetype: ARCHETYPES[index % ARCHETYPES.length],
  progress: laneStartPositions[index],
  depth: Math.floor(index / 5),
  shapeClass: laneShapeSeed(index)
}))

const STATE_COPY = {
  menu: {
    eyebrow: 'Death race online',
    title: 'Hidden-identity racing with one shot each.',
    body: 'Create a room, fill the grid to 20 racers, and start reading movement tells before anyone reads yours.',
    action: 'Create lobby',
    next: 'lobby'
  },
  lobby: {
    eyebrow: 'Lobby DR-2048',
    title: 'Public room, 4 humans, 16 NPCs.',
    body: 'Host chooses 5 rounds. Names stay here and on the scoreboard, never attached to racers during play.',
    action: 'Start countdown',
    next: 'countdown'
  },
  countdown: {
    eyebrow: 'Round 1',
    title: '3, 2, 1, go.',
    body: 'Assignments are secret. Movement and shooting unlock when the countdown clears.',
    action: 'Go',
    next: 'playing'
  },
  playing: {
    eyebrow: 'Live round',
    title: 'Walk, run, aim, fire once.',
    body: 'Space walks, Left shift runs, mouse aims, Mouse 1 fires. Crosshairs remain visible until the shot is spent.',
    action: 'Waiting for finish',
    next: 'playing'
  },
  paused: {
    eyebrow: 'Paused',
    title: 'Simulation stopped.',
    body: 'The live state remains visible while action is paused.',
    action: 'Resume',
    next: 'playing'
  },
  roundOver: {
    eyebrow: 'NPC wins',
    title: 'Everyone gets shamed.',
    body: 'Human-controlled racers are revealed and highlighted before the scoreboard appears.',
    action: 'Next round',
    next: 'countdown'
  },
  scoreboard: {
    eyebrow: 'Scoreboard',
    title: 'Round winner earns 1 point.',
    body: 'NPC wins award no human points. Host can instantly start the next round.',
    action: 'Next round',
    next: 'countdown'
  },
  gameOver: {
    eyebrow: 'Match complete',
    title: 'Final scores are locked.',
    body: 'Return to the lobby to change players or round count.',
    action: 'Back to lobby',
    next: 'lobby'
  }
}

const STATE_LABELS = {
  menu: 'Menu',
  lobby: 'Lobby',
  countdown: 'Countdown',
  playing: 'Playing',
  paused: 'Paused',
  roundOver: 'Round over',
  scoreboard: 'Scoreboard',
  gameOver: 'Game over'
}

const ROOM_CODE = 'DR-2048'
const ROUND_OPTIONS = [3, 5, 7]
const COUNTDOWN_STEPS = ['3', '2', '1', 'go']
const WALK_SPEED = 0.018
const RUN_SPEED = 0.018
const TICK_MS = 80
const FINISH_PROGRESS = 88
const HIT_WINDOW_PERCENT = 3.5
const NPC_MAX_PROGRESS = 82
const NPC_PATTERNS = [
  ['walk', 'walk', 'stop', 'walk', 'walk', 'stop', 'idle'],
  ['stop', 'walk', 'walk', 'idle', 'walk', 'stop', 'walk'],
  ['walk', 'idle', 'walk', 'walk', 'stop', 'walk', 'idle'],
  ['walk', 'walk', 'idle', 'stop', 'walk', 'walk', 'stop']
]
const NPC_SPEEDS = {
  idle: 0.006,
  stop: 0,
  walk: 0.018
}

const createNpcProgressByLane = () =>
  Object.fromEntries(
    LANES.filter((lane) => !HUMAN_ASSIGNMENTS.includes(lane.id)).map((lane) => [
      lane.id,
      lane.progress
    ])
  )

const generateRoomCode = () =>
  `DR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

function App() {
  const controlledRacerId = HUMAN_ASSIGNMENTS[0]
  const initialRoomCode = (() => {
    const match = window.location.pathname.match(/\/join\/([^/]+)/)
    return match?.[1]?.toUpperCase() ?? ROOM_CODE
  })()
  const [state, setState] = useState('menu')
  const [privacy, setPrivacy] = useState('public')
  const [roundCount, setRoundCount] = useState(5)
  const [joinName, setJoinName] = useState(PLAYERS[0])
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode)
  const [roomCode, setRoomCode] = useState(initialRoomCode)
  const [countdownIndex, setCountdownIndex] = useState(0)
  const [movementMode, setMovementMode] = useState('stopped')
  const [controlledProgress, setControlledProgress] = useState(0)
  const [npcTick, setNpcTick] = useState(0)
  const [npcProgressByLane, setNpcProgressByLane] = useState(
    createNpcProgressByLane
  )
  const [aim, setAim] = useState({ x: 68, laneId: controlledRacerId })
  const [bullets, setBullets] = useState(() =>
    Object.fromEntries(PLAYERS.map(player => [player, true]))
  )
  const [shotRacerIds, setShotRacerIds] = useState([])
  const [roundWinner, setRoundWinner] = useState(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [scores, setScores] = useState(() =>
    Object.fromEntries(PLAYERS.map(player => [player, 0]))
  )
  const [roundHistory, setRoundHistory] = useState([])
  const [roomSnapshot, setRoomSnapshot] = useState(null)
  const [roomSyncState, setRoomSyncState] = useState('local')
  const playfieldRef = useRef(null)
  const pressedKeys = useRef({ run: false, walk: false })
  const activeState = STATE_COPY[state]
  const lobbyInProgress = !['menu', 'lobby'].includes(state)
  const activePlayers = lobbyInProgress ? PLAYERS : WAITING_PLAYERS
  const movementLocked = state === 'countdown'
  const gameFocused = state === 'playing'
  const roundRacers = useMemo(
    () =>
      LANES.map(lane => {
        const playerIndex = HUMAN_ASSIGNMENTS.indexOf(lane.id)
        const npcPattern =
          NPC_PATTERNS[(lane.id + lane.depth) % NPC_PATTERNS.length]
        return {
          ...lane,
          controller:
            playerIndex >= 0
              ? {
                  type: 'human',
                  name: PLAYERS[playerIndex],
                  color: HUMAN_COLORS[playerIndex]
                }
              : {
                  type: 'npc',
                  name: `NPC ${lane.id}`,
                  color: 'npc'
                },
          npc: {
            pattern: npcPattern,
            offset: lane.id % npcPattern.length,
            progress: 0
          }
        }
      }),
    []
  )
  const humansAssigned = roundRacers.filter(
    racer => racer.controller.type === 'human'
  )
  const npcCount = roundRacers.length - humansAssigned.length
  const localPlayerName = PLAYERS[0]
  const localHasBullet = bullets[localPlayerName]
  const eliminatedHumans = humansAssigned.filter(racer =>
    shotRacerIds.includes(racer.id)
  )
  const spectators = lobbyInProgress
    ? [...LATE_JOINERS, ...eliminatedHumans.map(racer => racer.controller.name)]
    : []
  const controlledRacerEliminated = shotRacerIds.includes(controlledRacerId)
  const matchComplete = currentRound >= roundCount
  const getLiveProgress = useCallback(
    racer => {
      if (shotRacerIds.includes(racer.id)) {
        return racer.progress
      }
      if (racer.id === controlledRacerId) {
        return Math.min(racer.progress + controlledProgress, 99)
      }
      if (racer.controller.type === 'npc') {
        return npcProgressByLane[racer.id] ?? racer.progress
      }
      return racer.progress
    },
    [controlledProgress, controlledRacerId, npcProgressByLane, shotRacerIds]
  )
  const rankedPlayers = [...PLAYERS].sort(
    (a, b) => scores[b] - scores[a] || PLAYERS.indexOf(a) - PLAYERS.indexOf(b)
  )
  const lobbyPlayers = roomSnapshot?.players ?? []
  const lobbySpectators = roomSnapshot?.spectators ?? spectators
  const roomReady = roomSnapshot ? canStartRoom(roomSnapshot) : false
  const hostCanStart = state === 'lobby' ? roomReady : true
  const activeRoomCode = roomSnapshot?.roomCode ?? roomCode
  const roomHostName =
    roomSnapshot?.players.find((player) => player.id === roomSnapshot.hostId)?.name ??
    PLAYERS[0]
  const latestInputEntry = roomSnapshot
    ? Object.entries(roomSnapshot.inputs ?? {}).sort(
        (a, b) =>
          new Date(b[1]?.updatedAt ?? 0).getTime() -
          new Date(a[1]?.updatedAt ?? 0).getTime(),
      )[0]
    : null
  const latestInputSummary = latestInputEntry
    ? `${latestInputEntry[0]} ${latestInputEntry[1]?.movementMode ?? 'stopped'}`
    : 'No live input yet'
  const currentRoomLink = `${window.location.origin}/join/${activeRoomCode}`
  const activeStateCopy =
    state === 'roundOver' && roundWinner
      ? {
          ...activeState,
          eyebrow:
            roundWinner.controller.type === 'human'
              ? `${roundWinner.controller.name} wins`
              : 'NPC wins',
          title:
            roundWinner.controller.type === 'human'
              ? `${roundWinner.controller.name} crossed first.`
              : 'Everyone gets shamed.',
          body:
            roundWinner.controller.type === 'human'
              ? `Lane ${roundWinner.id} was secretly ${roundWinner.controller.name}. All human racers are now revealed.`
              : `Lane ${roundWinner.id} was ${roundWinner.controller.name}. No human points, and every human racer is exposed.`
        }
      : state === 'scoreboard' && roundWinner
        ? {
            ...activeState,
            title: `Scoreboard after round ${currentRound}.`,
            body:
              roundWinner.controller.type === 'human'
                ? `${roundWinner.controller.name} gained 1 point. Host can start the next round.`
                : `${roundWinner.controller.name} was an NPC, so no human points were awarded.`,
            action: matchComplete ? 'Show final scores' : 'Next round'
          }
        : state === 'gameOver'
          ? {
              ...activeState,
              title: `${rankedPlayers[0]} wins the match.`,
              body: `Final scores are locked after ${roundCount} rounds.`
            }
          : activeState

  useEffect(() => {
    if (state !== 'playing' || controlledRacerEliminated) {
      pressedKeys.current = { run: false, walk: false }
      setMovementMode('stopped')
    }
  }, [controlledRacerEliminated, state])

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

    const handleKeyDown = event => {
      if (event.code !== 'Space' && event.code !== 'ShiftLeft') {
        return
      }
      event.preventDefault()
      if (state !== 'playing' || controlledRacerEliminated) {
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

    const handleKeyUp = event => {
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
  }, [controlledRacerEliminated, state])

  useEffect(() => {
    if (
      state !== 'playing' ||
      movementMode === 'stopped' ||
      controlledRacerEliminated
    ) {
      return undefined
    }
    const speed = movementMode === 'running' ? RUN_SPEED : WALK_SPEED
    const intervalId = window.setInterval(() => {
      setControlledProgress(current => Math.min(current + speed, 86))
    }, TICK_MS)
    return () => window.clearInterval(intervalId)
  }, [controlledRacerEliminated, movementMode, state])

  useEffect(() => {
    if (state !== 'playing') {
      return undefined
    }
    const intervalId = window.setInterval(() => {
      setNpcTick(current => {
        const nextTick = current + 1
        setNpcProgressByLane(progressByLane =>
          Object.fromEntries(
            roundRacers
              .filter(racer => racer.controller.type === 'npc')
              .map(racer => {
                if (shotRacerIds.includes(racer.id)) {
                  return [racer.id, progressByLane[racer.id] ?? racer.progress]
                }
                const step =
                  racer.npc.pattern[
                    (Math.floor(nextTick / 22) + racer.npc.offset) %
                      racer.npc.pattern.length
                  ]
                const laneDrag = 0.78 + racer.depth * 0.05
                const nextProgress =
                  (progressByLane[racer.id] ?? racer.progress) +
                  NPC_SPEEDS[step] * laneDrag
                return [racer.id, Math.min(nextProgress, NPC_MAX_PROGRESS)]
              })
          )
        )
        return nextTick
      })
    }, TICK_MS)
    return () => window.clearInterval(intervalId)
  }, [roundRacers, shotRacerIds, state])

  useEffect(() => {
    if (state !== 'playing' || roundWinner) {
      return
    }
    const winner = roundRacers.find(
      racer =>
        !shotRacerIds.includes(racer.id) &&
        getLiveProgress(racer) >= FINISH_PROGRESS
    )
    if (winner) {
      const resolvedWinner = {
        ...winner,
        finalProgress: getLiveProgress(winner)
      }
      setRoundWinner(resolvedWinner)
      setRoundHistory(current => [
        ...current,
        {
          round: currentRound,
          winnerName: resolvedWinner.controller.name,
          winnerType: resolvedWinner.controller.type,
          laneId: resolvedWinner.id
        }
      ])
      if (resolvedWinner.controller.type === 'human') {
        setScores(current => ({
          ...current,
          [resolvedWinner.controller.name]:
            current[resolvedWinner.controller.name] + 1
        }))
      }
      setState('roundOver')
    }
  }, [
    controlledProgress,
    currentRound,
    getLiveProgress,
    npcTick,
    roundRacers,
    roundWinner,
    shotRacerIds,
    state
  ])

  const statusItems = useMemo(
    () => [
      ['Room', activeRoomCode],
      ['Mode', 'Room-backed'],
      ['Sync', roomSyncState],
      ['Rounds', `${currentRound} / ${roundCount}`],
      ['Racers', roundRacers.length]
    ],
    [activeRoomCode, currentRound, roomSyncState, roundCount, roundRacers.length]
  )

  const syncRoom = useCallback(async (action, payload = {}, targetRoomCode = roomCode) => {
    try {
      let result
      if (action === 'create') {
        result = await createRoom(targetRoomCode, payload)
      } else if (action === 'settings') {
        result = await updateRoom(targetRoomCode, payload)
      } else if (action === 'countdown') {
        result = await apiStartCountdown(targetRoomCode)
      } else if (action === 'next-round') {
        result = await apiStartNextRound(targetRoomCode)
      } else if (action === 'join') {
        result = await joinRoom(targetRoomCode, payload)
      } else if (action === 'ready') {
        result = await setPlayerReady(targetRoomCode, payload)
      } else if (action === 'input') {
        result = await submitPlayerInput(targetRoomCode, payload)
      } else {
        result = await getRoom(targetRoomCode)
      }
      setRoomSnapshot(result.room)
      setRoomSyncState('connected')
      return result.room
    } catch {
      setRoomSyncState('offline')
      return null
    }
  }, [roomCode])

  useEffect(() => {
    if (!['lobby', 'countdown', 'playing'].includes(state)) {
      return undefined
    }

    void syncRoom('input', {
      playerName: joinName || PLAYERS[0],
      movementMode,
      aim,
      firing: !localHasBullet,
    })
  }, [aim, joinName, localHasBullet, movementMode, state, syncRoom])

  useEffect(() => {
    if (state !== 'lobby') {
      return undefined
    }

    let active = true
    const hydrateRoom = async () => {
      const room = await syncRoom('join', { playerName: joinName || PLAYERS[0] })
      if (!active || !room) {
        return
      }
      setRoomSnapshot(room)
      setRoomCode(room.roomCode || roomCode)
    }

    void hydrateRoom()
    return () => {
      active = false
      void leaveRoom(roomCode, { playerName: joinName || PLAYERS[0] })
    }
  }, [joinName, roomCode, state, syncRoom])

  useEffect(() => {
    if (!['lobby', 'countdown', 'roundOver', 'scoreboard'].includes(state)) {
      return undefined
    }

    const refreshRoom = () => {
      void syncRoom('get')
    }

    refreshRoom()
    const intervalId = window.setInterval(refreshRoom, 3000)
    return () => window.clearInterval(intervalId)
  }, [state, syncRoom])

  const resetRoundState = () => {
    setCountdownIndex(0)
    setControlledProgress(0)
    setNpcTick(0)
    setNpcProgressByLane(createNpcProgressByLane())
    setBullets(Object.fromEntries(PLAYERS.map(player => [player, true])))
    setShotRacerIds([])
    setRoundWinner(null)
    setAim({ x: 68, laneId: controlledRacerId })
  }

  const startNextRound = () => {
    if (matchComplete) {
      setState('gameOver')
      return
    }
    void syncRoom('next-round')
    setCurrentRound(round => round + 1)
    resetRoundState()
    setState('countdown')
  }

  const moveToState = nextState => {
    if (nextState === 'countdown') {
      if (state === 'roundOver' || state === 'scoreboard') {
        startNextRound()
        return
      }
      if (state === 'menu') {
        setCurrentRound(1)
        setScores(Object.fromEntries(PLAYERS.map(player => [player, 0])))
        setRoundHistory([])
        const nextRoomCode = generateRoomCode()
        setRoomCode(nextRoomCode)
        setRoomCodeInput(nextRoomCode)
        void syncRoom('create', {
          hostName: PLAYERS[0],
          privacy,
          roundCount,
        }, nextRoomCode)
      }
      resetRoundState()
    }
    if (nextState === 'lobby') {
      setCurrentRound(1)
      setScores(Object.fromEntries(PLAYERS.map(player => [player, 0])))
      setRoundHistory([])
      resetRoundState()
      const nextRoomCode = generateRoomCode()
      setRoomCode(nextRoomCode)
      setRoomCodeInput(nextRoomCode)
      void syncRoom('create', {
        hostName: PLAYERS[0],
        privacy,
        roundCount,
      }, nextRoomCode)
    }
    setState(nextState)
  }

  useEffect(() => {
    const handleUnload = () => {
      void leaveRoom(roomCode, { playerName: joinName || PLAYERS[0] })
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [joinName, roomCode])
  const advanceCountdown = () => {
    const nextIndex = countdownIndex + 1
    if (nextIndex >= COUNTDOWN_STEPS.length) {
      void syncRoom('countdown')
      moveToState('playing')
      return
    }
    setCountdownIndex(nextIndex)
  }

  const getAimFromPointer = event => {
    if (!playfieldRef.current) {
      return aim
    }
    const bounds = playfieldRef.current.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 100
    const y = event.clientY - bounds.top
    const laneHeight = bounds.height / roundRacers.length
    const laneId = Math.min(
      roundRacers.length,
      Math.max(1, Math.floor(y / laneHeight) + 1)
    )
    return {
      x: Math.min(96, Math.max(6, x)),
      laneId
    }
  }

  const updateAimFromPointer = event => {
    if (state !== 'playing') {
      return
    }
    setAim(getAimFromPointer(event))
  }

  const fireLocalShot = event => {
    if (state !== 'playing' || !localHasBullet) {
      return
    }
    const nextAim = getAimFromPointer(event)
    const targetRacer = roundRacers.find(racer => racer.id === nextAim.laneId)
    const targetProgress = targetRacer ? getLiveProgress(targetRacer) : null
    const shotHits =
      targetProgress !== null &&
      Math.abs(targetProgress - nextAim.x) <= HIT_WINDOW_PERCENT

    setAim(nextAim)
    setBullets(current => ({
      ...current,
      [localPlayerName]: false
    }))
    void syncRoom('input', {
      playerName: joinName || PLAYERS[0],
      movementMode,
      aim: nextAim,
      firing: true,
    })
    if (shotHits) {
      setShotRacerIds(current =>
        current.includes(nextAim.laneId)
          ? current
          : [...current, nextAim.laneId]
      )
    }
  }

  const renderLobby = () => (
    <div className='lobby-panel' aria-label='Lobby controls'>
      <div className='room-card'>
        <span>{lobbyInProgress ? 'Room status' : 'Room code'}</span>
        <strong>{roomCode}</strong>
        <code>
          {state === 'lobby'
            ? `${privacy} lobby, waiting to start`
            : lobbyInProgress
              ? `${STATE_LABELS[state]} in progress`
              : currentRoomLink}
        </code>
      </div>

      <button
        type='button'
        className='host-start'
        onClick={() => moveToState('countdown')}
        disabled={lobbyInProgress || !hostCanStart}
      >
        {lobbyInProgress
          ? `${STATE_LABELS[state]} in progress`
          : !hostCanStart
            ? 'Waiting for room'
            : 'Start round'}
      </button>

      <div className='control-group'>
        <span>Privacy</span>
        <div className='segmented-control' aria-label='Lobby privacy'>
          {['public', 'private'].map(option => (
            <button
              key={option}
              type='button'
              className={privacy === option ? 'active' : ''}
              onClick={() => {
                setPrivacy(option)
                void syncRoom('settings', { privacy: option, roundCount })
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className='control-group'>
        <span>Rounds</span>
        <div className='round-options' aria-label='Round count'>
          {ROUND_OPTIONS.map(option => (
            <button
              key={option}
              type='button'
              className={roundCount === option ? 'active' : ''}
              onClick={() => {
                setRoundCount(option)
                void syncRoom('settings', { privacy, roundCount: option })
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className='control-group'>
        <span>Join room</span>
        <div className='join-row'>
          <input
            aria-label='Player name'
            value={joinName}
            onChange={(event) => setJoinName(event.target.value)}
            placeholder='Player name'
          />
          <input
            aria-label='Room code'
            value={roomCodeInput}
            onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
            placeholder='Room code'
          />
          <button
            type='button'
            onClick={() => {
              const targetRoomCode = roomCodeInput.trim().toUpperCase() || roomCode
              setRoomCode(targetRoomCode)
              void syncRoom('join', { playerName: joinName || PLAYERS[0] }, targetRoomCode)
              setState('lobby')
            }}
          >
            Join
          </button>
        </div>
      </div>

      <button
        type='button'
        className='host-start'
        onClick={() =>
          void syncRoom('ready', {
            playerName: joinName || PLAYERS[0],
            ready: true,
          })
        }
      >
        Ready up
      </button>

      <div className='player-list' aria-label='Lobby players'>
        <div className='list-heading'>
          <span>Players</span>
          <strong>{(lobbyPlayers.length || activePlayers.length)}/20</strong>
        </div>
        {(lobbyPlayers.length ? lobbyPlayers : activePlayers).map((player) => (
          <div className='player-row' key={player.name ?? player}>
            <span>{player.name ?? player}</span>
            <small>
              {player.role === 'host'
                ? 'Host'
                : lobbyInProgress
                  ? player.connected === false
                    ? 'Disconnected'
                    : 'In round'
                  : player.connected === false
                    ? 'Left'
                    : 'Ready'}
            </small>
          </div>
        ))}
      </div>

      <div className='player-list spectator-list' aria-label='Spectators'>
        <div className='list-heading'>
          <span>Spectators</span>
          <strong>{lobbySpectators.length}</strong>
        </div>
        {lobbySpectators.length > 0 ? (
          lobbySpectators.map(player => (
            <div className='player-row' key={player}>
              <span>{player}</span>
              <small>
                {eliminatedHumans.some(
                  racer => racer.controller.name === player
                )
                  ? 'Eliminated'
                  : 'Next round'}
              </small>
            </div>
          ))
        ) : (
          <p>No late joiners yet.</p>
        )}
      </div>
    </div>
  )

  return (
    <main className='app-shell'>
      <header className='top-bar'>
        <div>
          <p className='eyebrow'>Death race</p>
          <h1>Read the racer, hide the tell.</h1>
        </div>
        <div className='state-tabs' aria-label='Game state controls'>
          {STATES.map(item => (
            <button
              key={item}
              type='button'
              className={item === state ? 'active' : ''}
              onClick={() => moveToState(item)}
            >
              {STATE_LABELS[item]}
            </button>
          ))}
        </div>
      </header>

      <section className='status-strip' aria-label='Round status'>
        {statusItems.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section
        className={`hero-panel${gameFocused ? ' game-focused' : ''}`}
        aria-label='Game area'
      >
        {gameFocused ? null : (
          <div className='state-card'>
            <p className='eyebrow'>
              {state === 'lobby' ? `Lobby ${activeRoomCode}` : activeStateCopy.eyebrow}
            </p>
            <h2 id='state-title'>{activeStateCopy.title}</h2>
            <p>{activeStateCopy.body}</p>
            {roomSnapshot ? (
              <div className='assignment-summary' aria-label='Room sync'>
                <span>Room sync</span>
                <strong>{roomSnapshot.phase}</strong>
                <p>
                  {roomSnapshot.players.length} connected, {roomSnapshot.spectators.length} spectating.
                </p>
                <small>Host: {roomHostName}</small>
                <small>Latest input: {latestInputSummary}</small>
              </div>
            ) : null}
            {state === 'lobby' || state === 'countdown' ? null : (
              <div className='actions'>
                <button
                  type='button'
                  onClick={() => moveToState(activeStateCopy.next)}
                >
                  {activeStateCopy.action}
                </button>
              </div>
            )}
            {state === 'lobby' ? (
              <div className='assignment-summary' aria-label='Room readiness'>
                <span>Room readiness</span>
                <strong>{roomReady ? 'Ready' : 'Waiting'}</strong>
                <p>
                  {roomReady
                    ? 'The host can start this room now.'
                    : 'Start is blocked until every connected player is ready.'}
                </p>
              </div>
            ) : null}
            {state === 'countdown' ? (
              <div className='countdown-panel' aria-label='Countdown'>
                <span>{COUNTDOWN_STEPS[countdownIndex]}</span>
                <p>Movement and shooting are locked until go.</p>
                <button type='button' onClick={advanceCountdown}>
                  Advance countdown
                </button>
              </div>
            ) : null}
            {state !== 'menu' ? (
              <div className='assignment-summary' aria-label='Round setup'>
                <span>Round setup</span>
                <strong>{roundRacers.length} racers</strong>
                <p>
                  {humansAssigned.length} hidden humans, {npcCount} NPCs.
                </p>
              </div>
            ) : null}
            {state === 'roundOver' && roundWinner ? (
              <div className='winner-panel' aria-label='Winner reveal'>
                <span>Winner</span>
                <strong>
                  Lane {roundWinner.id}: {roundWinner.controller.name}
                </strong>
                <p>
                  {roundWinner.controller.type === 'npc'
                    ? 'NPC shame moment. Human-controlled racers are revealed.'
                    : 'Human winner. All human-controlled racers are revealed.'}
                </p>
              </div>
            ) : null}
            {state === 'scoreboard' || state === 'gameOver' ? (
              <div className='scoreboard-panel' aria-label='Scoreboard'>
                <span>
                  {state === 'gameOver' ? 'Final scores' : 'Scoreboard'}
                </span>
                <div className='score-list'>
                  {rankedPlayers.map(player => (
                    <div className='score-row' key={player}>
                      <strong>{player}</strong>
                      <span>{scores[player]}</span>
                    </div>
                  ))}
                </div>
                <div className='round-history' aria-label='Round history'>
                  {roundHistory.map(round => (
                    <p key={round.round}>
                      Round {round.round}: lane {round.laneId},{' '}
                      {round.winnerName}{' '}
                      {round.winnerType === 'human' ? '+1' : '+0'}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
            {state !== 'menu' ? renderLobby() : null}
          </div>
        )}

        <div
          className='playfield'
          aria-label='20 lane race playfield'
          onMouseMove={updateAimFromPointer}
          onMouseDown={fireLocalShot}
          ref={playfieldRef}
        >
          {roundRacers.map(lane => {
            const isHuman = lane.controller.type === 'human'
            const isControlled = lane.id === controlledRacerId
            const isEliminated = shotRacerIds.includes(lane.id)
            const isRevealed = state === 'roundOver' || state === 'scoreboard'
            const isWinner = roundWinner?.id === lane.id
            const archetypeClass = lane.archetype.toLowerCase()
            const npcStep =
              lane.npc.pattern[
                (Math.floor(npcTick / 22) + lane.npc.offset) %
                  lane.npc.pattern.length
              ]
            const npcMotionClass = npcStep === 'walk' ? 'walking' : ''
            const shapeClass = lane.shapeClass
            const racerProgress =
              isWinner && roundWinner.finalProgress
                ? roundWinner.finalProgress
                : getLiveProgress(lane)
            return (
              <div
                className={[
                  'lane',
                  movementLocked ? 'locked' : '',
                  isControlled ? '' : '',
                  isEliminated ? '' : '',
                  isHuman && isRevealed ? '' : '',
                  isWinner ? '' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={lane.id}
                data-testid={`lane-${lane.id}`}
                style={{
                  '--depth': lane.depth,
                  '--racer-progress': `${racerProgress}%`
                }}
              >
                <span className='lane-number'>{lane.id}</span>
                <span className='lane-stripe' />
                <span
                  className={[
                  'racer',
                  `archetype-${archetypeClass}`,
                  shapeClass,
                  isEliminated ? 'dead' : '',
                  isControlled && !isEliminated ? movementMode : '',
                  !isHuman && state === 'playing' && !isEliminated
                      ? npcMotionClass
                      : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ '--racer-progress': `${racerProgress}%` }}
                  data-testid={`racer-${lane.id}`}
                  title={lane.archetype}
                >
                  <span className='racer-head' />
                  <span className='racer-body' />
                  <span className='racer-shadow' />
                </span>
                {isEliminated ? (
                  <span className='body-marker'>down</span>
                ) : null}
                {isWinner ? (
                  <span className='winner-marker'>winner</span>
                ) : null}
                {isHuman && isRevealed ? (
                  <span className='reveal-tag'>{lane.controller.name}</span>
                ) : null}
                {state === 'playing' &&
                localHasBullet &&
                lane.id === aim.laneId &&
                !controlledRacerEliminated ? (
                  <span
                    className={`crosshair crosshair-${HUMAN_COLORS[0]}`}
                    data-testid='local-crosshair'
                    style={{
                      left: `${aim.x}%`
                    }}
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
