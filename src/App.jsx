import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  createRoom,
  createRoomSocket,
  finishRound,
  getRoom,
  joinRoom,
  leaveRoomOnUnload,
  recordShot,
  renameRoomPlayer,
  sendPlayerHeartbeat,
  showScoreboard,
  startCountdown as apiStartCountdown,
  startPlaying as apiStartPlaying,
  startNextRound as apiStartNextRound,
  setPlayerReady,
  submitPlayerInput,
  updateRoom,
} from './multiplayer/api'
import { canStartRoom } from './multiplayer/roomState'
import { createNpcProfile, getNpcStep, hashString } from './npcBehavior'

const PLAYERS = ['James', 'Mia', 'Noah', 'Ava']
const LATE_JOINERS = ['Riley']
const ARCHETYPES = ['Driver', 'Runner', 'Mask', 'Coat', 'Cap']
const HUMAN_COLORS = ['red', 'blue', 'green', 'yellow']
const CHARACTER_SHAPE_COUNT = 8
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

const laneShapeSeed = (index) =>
  `shape-${(index * 7 + Math.floor(index / 2)) % CHARACTER_SHAPE_COUNT}`

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
    body: 'Space walks, Left shift runs, mouse aims, Mouse 1 fires. Crosshairs dim after the shot is spent.',
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
    action: 'Scoreboard',
    next: 'scoreboard'
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
const COUNTDOWN_STEP_MS = 500
const WALK_SPEED = 0.162
const RUN_SPEED = WALK_SPEED * 2
const TICK_MS = 80
const FINISH_PROGRESS = 93
const HIT_WINDOW_PERCENT = 3.5
const NPC_MAX_PROGRESS = 99
const FAST_FORWARD_MULTIPLIER = 4
const HEARTBEAT_INTERVAL_MS = 20000
const FALLBACK_POLL_INTERVAL_MS = 10000
const INPUT_SYNC_INTERVAL_MS = 1000
const FRAME_FALLBACK_MS = 16
const MAX_FRAME_DT_MS = 250
const REMOTE_BLEND_MS = 150
const REMOTE_SNAP_DISTANCE = 8
const NPC_PATTERNS = [
  ['walk', 'walk', 'stop', 'walk', 'walk', 'stop', 'idle'],
  ['stop', 'walk', 'walk', 'idle', 'walk', 'stop', 'walk'],
  ['walk', 'idle', 'walk', 'walk', 'stop', 'walk', 'idle'],
  ['walk', 'walk', 'idle', 'stop', 'walk', 'walk', 'stop']
]
const NPC_SPEEDS = {
  idle: WALK_SPEED / 3,
  stop: 0,
  walk: WALK_SPEED,
  run: RUN_SPEED
}
const MOVEMENT_SPEEDS_BY_MODE = {
  stopped: 0,
  walking: WALK_SPEED,
  running: RUN_SPEED
}

const SOUND_PROFILES = {
  create: [330, 494],
  join: [294, 440],
  ready: [392, 660],
  start: [220, 440, 880],
  shot: [160, 90],
  save: [440, 554],
}
const MUSIC_SEQUENCE = [110, 146.83, 164.81, 130.81, 196, 174.61, 146.83, 123.47]
const MUSIC_INTERVAL_MS = 280

const shuffleWithSeed = (items, seed) => {
  const result = [...items]
  let state = seed || 1
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const swapIndex = state % (index + 1)
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }
  return result
}

const createHumanAssignments = (players, seedParts) => {
  const laneIds = shuffleWithSeed(
    LANES.map(lane => lane.id),
    hashString(seedParts)
  )
  return Object.fromEntries(
    players.slice(0, LANES.length).map((player, index) => [
      player,
      laneIds[index]
    ])
  )
}

const createScoreState = players =>
  Object.fromEntries(players.map(player => [player, 0]))

const createBulletState = players =>
  Object.fromEntries(players.map(player => [player, true]))

const createNpcProgressByLane = humanLaneIds =>
  Object.fromEntries(
    LANES.filter((lane) => !humanLaneIds.includes(lane.id)).map((lane) => [
      lane.id,
      lane.progress
    ])
  )

const generateRoomCode = () =>
  `DR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

// Runs onFrame(dtMs, nowMs) every animation frame; falls back to a 16ms
// timeout where requestAnimationFrame is unavailable (jsdom). Returns a stop
// function.
const createFrameLoop = (onFrame) => {
  const usingRaf = typeof window.requestAnimationFrame === 'function'
  let handle = null
  let stopped = false
  let last = null
  const frame = (now) => {
    if (stopped) {
      return
    }
    const dt = last === null ? 0 : Math.min(Math.max(now - last, 0), MAX_FRAME_DT_MS)
    last = now
    onFrame(dt, now)
    schedule()
  }
  const schedule = () => {
    handle = usingRaf
      ? window.requestAnimationFrame(frame)
      : window.setTimeout(() => frame(performance.now()), FRAME_FALLBACK_MS)
  }
  schedule()
  return () => {
    stopped = true
    if (usingRaf) {
      window.cancelAnimationFrame(handle)
    } else {
      window.clearTimeout(handle)
    }
  }
}

function App() {
  const initialRoomCode = (() => {
    const match = window.location.pathname.match(/\/join\/([^/]+)/)
    return match?.[1]?.toUpperCase() ?? ROOM_CODE
  })()
  const initialAssignments = createHumanAssignments(
    PLAYERS,
    `${initialRoomCode}:1:${PLAYERS.join('|')}`
  )
  const initialHumanLaneIds = Object.values(initialAssignments)
  const initialControlledRacerId = initialAssignments[PLAYERS[0]]
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
  const [npcProgressByLane, setNpcProgressByLane] = useState(() =>
    createNpcProgressByLane(initialHumanLaneIds)
  )
  const [aim, setAim] = useState({ x: 68, laneId: initialControlledRacerId })
  const [bullets, setBullets] = useState(() => createBulletState(PLAYERS))
  const [shotRacerIds, setShotRacerIds] = useState([])
  const [roundWinner, setRoundWinner] = useState(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [scores, setScores] = useState(() => createScoreState(PLAYERS))
  const [roundHistory, setRoundHistory] = useState([])
  const [remoteProgressByPlayer, setRemoteProgressByPlayer] = useState({})
  const [roomSnapshot, setRoomSnapshot] = useState(null)
  const [roomSyncState, setRoomSyncState] = useState('local')
  const [roomError, setRoomError] = useState('')
  const [currentPlayerName, setCurrentPlayerName] = useState('')
  const [playerNameDraft, setPlayerNameDraft] = useState(PLAYERS[0])
  const [createLobbyPending, setCreateLobbyPending] = useState(false)
  const [renamePending, setRenamePending] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)
  const playfieldRef = useRef(null)
  const pressedKeys = useRef({ run: false, walk: false })
  const playingRequested = useRef(false)
  const audioContextRef = useRef(null)
  const musicNodesRef = useRef(null)
  const soundMutedRef = useRef(false)
  const latestInputSnapshotRef = useRef(null)
  const remoteSnapshotsRef = useRef({})
  const activeState = STATE_COPY[state]
  const lobbyInProgress = !['menu', 'lobby'].includes(state)
  const movementLocked = state === 'countdown'
  const pendingPlayerName = joinName.trim() || PLAYERS[0]
  const activePlayerName = currentPlayerName || pendingPlayerName
  const activeRoomCode = roomSnapshot?.roomCode ?? roomCode
  const humanPlayers = useMemo(() => {
    const roomPlayers =
      roomSnapshot?.players
        ?.map(player => player.name)
        .filter(Boolean)
        .slice(0, LANES.length) ?? []
    return roomPlayers.length ? roomPlayers : PLAYERS
  }, [roomSnapshot?.players])
  const humanAssignmentByPlayer = useMemo(
    () =>
      createHumanAssignments(
        humanPlayers,
        `${activeRoomCode}:${currentRound}:${humanPlayers.join('|')}`
      ),
    [activeRoomCode, currentRound, humanPlayers]
  )
  const humanLaneIds = useMemo(
    () => Object.values(humanAssignmentByPlayer),
    [humanAssignmentByPlayer]
  )
  const controlledRacerId =
    humanAssignmentByPlayer[activePlayerName] ?? humanLaneIds[0] ?? 1
  const localPlayerName = activePlayerName
  const localPlayerIndex = Math.max(0, humanPlayers.indexOf(localPlayerName))
  const localPlayerColor = HUMAN_COLORS[localPlayerIndex % HUMAN_COLORS.length]
  const roomInputs = useMemo(() => roomSnapshot?.inputs ?? {}, [roomSnapshot?.inputs])
  const npcSeedParts = `${activeRoomCode}:${currentRound}`
  const roundRacers = useMemo(
    () => {
      const humanByLane = Object.fromEntries(
        Object.entries(humanAssignmentByPlayer).map(([player, laneId], index) => [
          laneId,
          {
            name: player,
            color: HUMAN_COLORS[index % HUMAN_COLORS.length]
          }
        ])
      )
      return LANES.map(lane => {
        const humanController = humanByLane[lane.id]
        const npcPattern =
          NPC_PATTERNS[(lane.id + lane.depth) % NPC_PATTERNS.length]
        const npcProfile = createNpcProfile(lane, npcPattern)
        return {
          ...lane,
          controller:
            humanController
              ? {
                  type: 'human',
                  name: humanController.name,
                  color: humanController.color
                }
              : {
                  type: 'npc',
                  name: `NPC ${lane.id}`,
                  color: 'npc'
                },
          npc: {
            ...npcProfile
          }
        }
      })
    },
    [humanAssignmentByPlayer]
  )
  const humansAssigned = roundRacers.filter(
    racer => racer.controller.type === 'human'
  )
  const localHasBullet = bullets[localPlayerName] ?? true
  const eliminatedHumans = humansAssigned.filter(racer =>
    shotRacerIds.includes(racer.id)
  )
  const spectators = lobbyInProgress
    ? [...LATE_JOINERS, ...eliminatedHumans.map(racer => racer.controller.name)]
    : []
  const controlledRacerEliminated = shotRacerIds.includes(controlledRacerId)
  const matchComplete = currentRound >= roundCount
  const allHumanRacersEliminated =
    humansAssigned.length > 0 &&
    humansAssigned.every((racer) => shotRacerIds.includes(racer.id))
  const raceSpeedMultiplier =
    allHumanRacersEliminated && !matchComplete ? FAST_FORWARD_MULTIPLIER : 1
  const getLiveProgress = useCallback(
    racer => {
      if (shotRacerIds.includes(racer.id)) {
        return racer.progress
      }
      if (racer.id === controlledRacerId) {
        return Math.min(racer.progress + controlledProgress, 99)
      }
      if (racer.controller.type === 'human') {
        const reckonedProgress = remoteProgressByPlayer[racer.controller.name]
        if (Number.isFinite(reckonedProgress)) {
          return reckonedProgress
        }
        const syncedProgress = roomInputs[racer.controller.name]?.progress
        if (Number.isFinite(syncedProgress)) {
          return syncedProgress
        }
      }
      if (racer.controller.type === 'npc') {
        return npcProgressByLane[racer.id] ?? racer.progress
      }
      return racer.progress
    },
    [
      controlledProgress,
      controlledRacerId,
      npcProgressByLane,
      remoteProgressByPlayer,
      roomInputs,
      shotRacerIds,
    ]
  )
  const rankedPlayers = [...humanPlayers].sort(
    (a, b) => scores[b] - scores[a] || humanPlayers.indexOf(a) - humanPlayers.indexOf(b)
  )
  const lobbySpectators = roomSnapshot?.spectators ?? spectators
  const currentRoomPlayer = roomSnapshot?.players.find(
    (player) => player.name === activePlayerName,
  )
  const connectedPlayerCount =
    roomSnapshot?.players.filter((player) => player.connected).length ?? humanPlayers.length
  const readyPlayerCount =
    roomSnapshot?.players.filter((player) => player.connected && player.ready).length ?? 0
  const roomReady = roomSnapshot ? canStartRoom(roomSnapshot) : false
  const isCurrentHost =
    Boolean(currentRoomPlayer?.connected) && currentRoomPlayer?.id === roomSnapshot?.hostId
  const hostCanStart = state === 'lobby' ? isCurrentHost && roomReady : true
  const roomClosed = roomSyncState === 'closed'
  const gameplayFocused = ['countdown', 'playing'].includes(state)
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
            action: matchComplete ? 'Show final scores' : 'Next round',
            next: matchComplete ? 'gameOver' : 'countdown'
          }
        : state === 'gameOver'
          ? {
              ...activeState,
              title: `${rankedPlayers[0]} wins the match.`,
              body: `Final scores are locked after ${roundCount} rounds.`
            }
          : activeState

  const getAudioContext = useCallback(() => {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext
    if (!AudioContext) {
      return null
    }
    const audioContext = audioContextRef.current
    if (!audioContext || audioContext.state === 'closed') {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  const resumeAudio = useCallback(() => {
    const audioContext = getAudioContext()
    if (!audioContext) {
      return Promise.resolve(null)
    }
    if (audioContext.state === 'running') {
      return Promise.resolve(audioContext)
    }
    if (typeof audioContext.resume !== 'function') {
      return Promise.resolve(audioContext)
    }
    return Promise.resolve(audioContext.resume())
      .then(() => audioContext)
      .catch(() => {
        if (audioContextRef.current === audioContext) {
          audioContextRef.current = null
        }
        return null
      })
  }, [getAudioContext])

  const stopBackgroundMusic = useCallback(() => {
    const nodes = musicNodesRef.current
    if (!nodes) {
      return
    }
    musicNodesRef.current = null
    window.clearInterval(nodes.intervalId)
    const stopAt = nodes.audioContext.currentTime + 0.08
    try {
      nodes.masterGain.gain.exponentialRampToValueAtTime(0.0001, stopAt)
    } catch {
      // Ignore browsers that reject ramps on a closing context.
    }
    nodes.oscillators.forEach((oscillator) => {
      try {
        oscillator.stop(stopAt + 0.04)
      } catch {
        // Oscillators may already be stopped when the tab is closing.
      }
    })
  }, [])

  const startBackgroundMusic = useCallback(() => {
    if (soundMutedRef.current || musicNodesRef.current) {
      return
    }
    void resumeAudio().then((audioContext) => {
      if (!audioContext || soundMutedRef.current || musicNodesRef.current) {
        return
      }
      const now = audioContext.currentTime + 0.02
      const masterGain = audioContext.createGain()
      masterGain.gain.setValueAtTime(0.0001, now)
      masterGain.gain.exponentialRampToValueAtTime(0.026, now + 0.5)
      masterGain.connect(audioContext.destination)

      const bass = audioContext.createOscillator()
      bass.type = 'square'
      bass.frequency.setValueAtTime(55, now)
      bass.connect(masterGain)
      bass.start(now)

      const drone = audioContext.createOscillator()
      drone.type = 'sawtooth'
      drone.frequency.setValueAtTime(82.41, now)
      drone.connect(masterGain)
      drone.start(now)

      const nodes = {
        audioContext,
        intervalId: 0,
        masterGain,
        noteIndex: 0,
        oscillators: [bass, drone],
      }

      const playMusicNote = () => {
        if (musicNodesRef.current !== nodes || soundMutedRef.current) {
          return
        }
        const noteNow = audioContext.currentTime + 0.01
        const noteOscillator = audioContext.createOscillator()
        const noteGain = audioContext.createGain()
        noteOscillator.type = 'triangle'
        noteOscillator.frequency.setValueAtTime(
          MUSIC_SEQUENCE[nodes.noteIndex % MUSIC_SEQUENCE.length],
          noteNow,
        )
        noteGain.gain.setValueAtTime(0.0001, noteNow)
        noteGain.gain.exponentialRampToValueAtTime(0.018, noteNow + 0.02)
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteNow + 0.2)
        noteOscillator.connect(noteGain)
        noteGain.connect(masterGain)
        noteOscillator.start(noteNow)
        noteOscillator.stop(noteNow + 0.22)
        nodes.noteIndex += 1
      }

      musicNodesRef.current = nodes
      playMusicNote()
      nodes.intervalId = window.setInterval(playMusicNote, MUSIC_INTERVAL_MS)
    })
  }, [resumeAudio])

  const playSound = useCallback((soundName) => {
    if (soundMutedRef.current) {
      return
    }
    const notes = SOUND_PROFILES[soundName]
    if (!notes) {
      return
    }
    const audioContext = getAudioContext()
    if (!audioContext) {
      return
    }
    audioContextRef.current = audioContext
    const scheduleSound = (readyContext) => {
      if (!readyContext || readyContext.state === 'closed') {
        return
      }
      try {
        const now = readyContext.currentTime + 0.01
        notes.forEach((frequency, index) => {
          const oscillator = readyContext.createOscillator()
          const gain = readyContext.createGain()
          const startAt = now + index * 0.055
          oscillator.type = soundName === 'shot' ? 'sawtooth' : 'square'
          oscillator.frequency.setValueAtTime(frequency, startAt)
          gain.gain.setValueAtTime(0.0001, startAt)
          gain.gain.exponentialRampToValueAtTime(soundName === 'shot' ? 0.06 : 0.035, startAt + 0.01)
          gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.13)
          oscillator.connect(gain).connect(readyContext.destination)
          oscillator.start(startAt)
          oscillator.stop(startAt + 0.14)
        })
      } catch {
        if (audioContextRef.current === readyContext) {
          audioContextRef.current = null
        }
      }
    }
    if (audioContext.state !== 'running' && typeof audioContext.resume === 'function') {
      void resumeAudio().then(scheduleSound)
      return
    }
    scheduleSound(audioContext)
  }, [getAudioContext, resumeAudio])

  useEffect(() => {
    soundMutedRef.current = soundMuted
    if (soundMuted) {
      stopBackgroundMusic()
    }
  }, [soundMuted, stopBackgroundMusic])

  useEffect(() => {
    if (state === 'playing' && !soundMuted) {
      startBackgroundMusic()
      return undefined
    }
    stopBackgroundMusic()
    return undefined
  }, [soundMuted, startBackgroundMusic, state, stopBackgroundMusic])

  useEffect(() => () => stopBackgroundMusic(), [stopBackgroundMusic])

  const toggleSound = () => {
    setSoundMuted((current) => {
      const nextMuted = !current
      soundMutedRef.current = nextMuted
      if (nextMuted) {
        stopBackgroundMusic()
      } else {
        void resumeAudio()
      }
      return nextMuted
    })
  }

  useEffect(() => {
    const unlockAudio = () => {
      void resumeAudio()
    }
    window.addEventListener('pointerdown', unlockAudio, true)
    window.addEventListener('keydown', unlockAudio, true)
    return () => {
      window.removeEventListener('pointerdown', unlockAudio, true)
      window.removeEventListener('keydown', unlockAudio, true)
    }
  }, [resumeAudio])

  const handleRoomClosed = useCallback((message = 'Room closed') => {
    setRoomSnapshot(null)
    setRoomSyncState('closed')
    setRoomError(message)
    setMovementMode('stopped')
  }, [])

  const resolveWinnerSnapshot = useCallback(
    winnerSnapshot => {
      if (!winnerSnapshot?.laneId) {
        return null
      }
      const lane = roundRacers.find(racer => racer.id === Number(winnerSnapshot.laneId))
      if (!lane) {
        return null
      }
      return {
        ...lane,
        finalProgress: winnerSnapshot.finalProgress ?? getLiveProgress(lane),
        controller: {
          ...lane.controller,
          name: winnerSnapshot.winnerName ?? lane.controller.name,
          type: winnerSnapshot.winnerType ?? lane.controller.type,
        },
      }
    },
    [getLiveProgress, roundRacers]
  )

  useEffect(() => {
    if (state !== 'playing' || controlledRacerEliminated) {
      pressedKeys.current = { run: false, walk: false }
      setMovementMode('stopped')
    }
  }, [controlledRacerEliminated, state])

  useEffect(() => {
    if (currentPlayerName) {
      setPlayerNameDraft(currentPlayerName)
    }
  }, [currentPlayerName])

  useEffect(() => {
    setScores(current => {
      const nextScores = Object.fromEntries(
        humanPlayers.map(player => [player, current[player] ?? 0])
      )
      const currentPlayers = Object.keys(current)
      const unchanged =
        currentPlayers.length === humanPlayers.length &&
        humanPlayers.every(player => current[player] === nextScores[player])
      return unchanged ? current : nextScores
    })
  }, [humanPlayers])

  useEffect(() => {
    setAim(current =>
      current.laneId === controlledRacerId
        ? current
        : { ...current, laneId: controlledRacerId }
    )
  }, [controlledRacerId])

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
    const speedPerMs = (MOVEMENT_SPEEDS_BY_MODE[movementMode] ?? 0) / TICK_MS
    return createFrameLoop((dt) => {
      if (dt <= 0) {
        return
      }
      setControlledProgress(current =>
        Math.min(current + speedPerMs * dt, NPC_MAX_PROGRESS)
      )
    })
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
                const step = getNpcStep(racer, nextTick, npcSeedParts)
                const cadence = racer.npc.moveCadenceTicks ?? 1
                const shouldAdvance =
                  ((nextTick + (racer.npc.movePhaseTicks ?? 0)) % cadence) === 0
                if (!shouldAdvance) {
                  return [racer.id, progressByLane[racer.id] ?? racer.progress]
                }
                const laneDrag = 0.78 + racer.depth * 0.05
                const nextProgress =
                  (progressByLane[racer.id] ?? racer.progress) +
                  NPC_SPEEDS[step] *
                    laneDrag *
                    raceSpeedMultiplier *
                    cadence *
                    (racer.npc.speedJitter ?? 1)
                return [racer.id, Math.min(nextProgress, NPC_MAX_PROGRESS)]
              })
          )
        )
        return nextTick
      })
    }, TICK_MS)
    return () => window.clearInterval(intervalId)
  }, [npcSeedParts, raceSpeedMultiplier, roundRacers, shotRacerIds, state])

  // Track when each remote input snapshot arrived so dead reckoning can
  // extrapolate from it between syncs.
  useEffect(() => {
    const now = performance.now()
    const snapshots = remoteSnapshotsRef.current
    const next = {}
    for (const [playerName, input] of Object.entries(roomInputs)) {
      if (!input || !Number.isFinite(input.progress)) {
        continue
      }
      const previous = snapshots[playerName]
      const unchanged =
        previous &&
        previous.progress === input.progress &&
        previous.movementMode === input.movementMode &&
        previous.updatedAt === input.updatedAt
      next[playerName] = unchanged
        ? previous
        : {
            progress: input.progress,
            movementMode: input.movementMode ?? 'stopped',
            updatedAt: input.updatedAt,
            receivedAt: now,
          }
    }
    remoteSnapshotsRef.current = next
  }, [roomInputs])

  // Dead reckoning: advance remote racers every frame from their last synced
  // progress and movement mode, easing toward the extrapolated target instead
  // of snapping once per sync.
  useEffect(() => {
    if (state !== 'playing') {
      return undefined
    }
    return createFrameLoop((dt, now) => {
      setRemoteProgressByPlayer(current => {
        const snapshots = remoteSnapshotsRef.current
        const names = Object.keys(snapshots)
        if (!names.length) {
          return Object.keys(current).length ? {} : current
        }
        let changed = Object.keys(current).length !== names.length
        const next = {}
        for (const name of names) {
          const snapshot = snapshots[name]
          const speedPerMs =
            (MOVEMENT_SPEEDS_BY_MODE[snapshot.movementMode] ?? 0) / TICK_MS
          const target = Math.min(
            snapshot.progress + speedPerMs * Math.max(now - snapshot.receivedAt, 0),
            NPC_MAX_PROGRESS,
          )
          const displayed = current[name]
          let value = target
          if (
            Number.isFinite(displayed) &&
            Math.abs(target - displayed) <= REMOTE_SNAP_DISTANCE
          ) {
            value = displayed + (target - displayed) * Math.min(1, dt / REMOTE_BLEND_MS)
          }
          if (value !== displayed) {
            changed = true
          }
          next[name] = value
        }
        return changed ? next : current
      })
    })
  }, [state])

  const statusItems = useMemo(
    () => {
      const items = [
        ['Room', activeRoomCode],
        ['State', STATE_LABELS[state]],
        ['Rounds', `${currentRound} / ${roundCount}`],
        ['Racers', roundRacers.length],
      ]
      if (roomSnapshot) {
        items.splice(2, 0, ['Connected', connectedPlayerCount])
      }
      if (state === 'lobby' && roomSnapshot) {
        items.splice(3, 0, ['Ready', `${readyPlayerCount} / ${connectedPlayerCount}`])
      }
      return items
    },
    [
      activeRoomCode,
      connectedPlayerCount,
      currentRound,
      readyPlayerCount,
      roomSnapshot,
      roundCount,
      roundRacers.length,
      state,
    ]
  )

  const syncRoom = useCallback(async (action, payload = {}, targetRoomCode = roomCode) => {
    try {
      let result
      if (action === 'create') {
        result = await createRoom(targetRoomCode, payload)
      } else if (action === 'settings') {
        result = await updateRoom(targetRoomCode, payload)
      } else if (action === 'countdown') {
        result = await apiStartCountdown(targetRoomCode, payload)
      } else if (action === 'playing') {
        result = await apiStartPlaying(targetRoomCode, payload)
      } else if (action === 'next-round') {
        result = await apiStartNextRound(targetRoomCode, payload)
      } else if (action === 'shot') {
        result = await recordShot(targetRoomCode, payload)
      } else if (action === 'round-over') {
        result = await finishRound(targetRoomCode, payload)
      } else if (action === 'scoreboard') {
        result = await showScoreboard(targetRoomCode, payload)
      } else if (action === 'join') {
        result = await joinRoom(targetRoomCode, payload)
      } else if (action === 'rename') {
        result = await renameRoomPlayer(targetRoomCode, payload)
      } else if (action === 'ready') {
        result = await setPlayerReady(targetRoomCode, payload)
      } else if (action === 'heartbeat') {
        result = await sendPlayerHeartbeat(targetRoomCode, payload)
      } else if (action === 'input') {
        result = await submitPlayerInput(targetRoomCode, payload)
      } else {
        result = await getRoom(targetRoomCode)
      }
      if (result.destroyed || !result.room) {
        handleRoomClosed(result.error || 'Room closed')
        return null
      }
      setRoomSnapshot(result.room)
      setRoomSyncState('connected')
      setRoomError('')
      return result.room
    } catch (error) {
      const message = error.message || 'Room request failed'
      if (message === 'Room closed') {
        handleRoomClosed(message)
        return null
      }
      setRoomError(message)
      setRoomSyncState('offline')
      return null
    }
  }, [handleRoomClosed, roomCode])

  useEffect(() => {
    if (
      import.meta.env.MODE === 'test' ||
      state === 'menu' ||
      roomClosed ||
      !activeRoomCode ||
      typeof WebSocket !== 'function'
    ) {
      return undefined
    }

    let closed = false
    const socket = createRoomSocket(activeRoomCode, activePlayerName)

    socket.addEventListener('open', () => {
      if (!closed) {
        setRoomSyncState('live')
        setRoomError('')
      }
    })
    socket.addEventListener('message', (event) => {
      if (closed) {
        return
      }
      let message
      try {
        message = JSON.parse(event.data)
      } catch {
        return
      }
      if (message.type === 'room') {
        setRoomSnapshot(message.room)
        setRoomSyncState('live')
        setRoomError('')
      }
      if (message.type === 'closed') {
        handleRoomClosed(message.error ?? 'Room closed')
      }
    })
    socket.addEventListener('error', () => {
      if (!closed) {
        setRoomSyncState('polling')
      }
    })
    socket.addEventListener('close', () => {
      if (!closed) {
        setRoomSyncState('polling')
      }
    })

    return () => {
      closed = true
      socket.close()
    }
  }, [activePlayerName, activeRoomCode, handleRoomClosed, roomClosed, state])

  useEffect(() => {
    if (roomClosed || state !== 'playing' || roundWinner || !isCurrentHost) {
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
      void syncRoom('round-over', {
        playerName: activePlayerName,
        laneId: resolvedWinner.id,
        winnerName: resolvedWinner.controller.name,
        winnerType: resolvedWinner.controller.type,
        finalProgress: resolvedWinner.finalProgress,
      })
      setState('roundOver')
    }
  }, [
    activePlayerName,
    controlledProgress,
    currentRound,
    getLiveProgress,
    isCurrentHost,
    npcTick,
    roundRacers,
    roundWinner,
    roomClosed,
    shotRacerIds,
    state,
    syncRoom,
  ])

  useEffect(() => {
    if (state === 'menu' || roomClosed) {
      return undefined
    }

    const heartbeat = () => {
      void syncRoom('heartbeat', { playerName: activePlayerName })
    }

    heartbeat()
    const intervalId = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [activePlayerName, roomClosed, state, syncRoom])

  useEffect(() => {
    const controlledLane = LANES.find((lane) => lane.id === controlledRacerId)
    latestInputSnapshotRef.current = {
      playerName: activePlayerName,
      movementMode,
      aim,
      progress: Math.min((controlledLane?.progress ?? 0) + controlledProgress, NPC_MAX_PROGRESS),
      firing: !localHasBullet,
    }
  }, [
    activePlayerName,
    aim,
    controlledRacerId,
    controlledProgress,
    localHasBullet,
    movementMode,
  ])

  useEffect(() => {
    if (roomClosed || !['countdown', 'playing'].includes(state)) {
      return undefined
    }

    const sendLatestInput = () => {
      if (latestInputSnapshotRef.current) {
        void syncRoom('input', latestInputSnapshotRef.current)
      }
    }

    sendLatestInput()
    const intervalId = window.setInterval(sendLatestInput, INPUT_SYNC_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [roomClosed, state, syncRoom])

  useEffect(() => {
    if (state !== 'lobby') {
      return undefined
    }

    let active = true
    const hydrateRoom = async () => {
      const room = await syncRoom('join', { playerName: activePlayerName })
      if (!active || !room) {
        return
      }
      setRoomSnapshot(room)
      setRoomCode(room.roomCode || roomCode)
    }

    void hydrateRoom()
    return () => {
      active = false
    }
  }, [activePlayerName, roomCode, state, syncRoom])

  useEffect(() => {
    if (
      roomSyncState === 'live' ||
      roomClosed ||
      !['lobby', 'countdown', 'playing', 'roundOver', 'scoreboard'].includes(state)
    ) {
      return undefined
    }

    const refreshRoom = () => {
      void syncRoom('get')
    }

    refreshRoom()
    const intervalId = window.setInterval(refreshRoom, FALLBACK_POLL_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [roomClosed, roomSyncState, state, syncRoom])

  const resetRoundState = useCallback((nextHumanLaneIds = humanLaneIds, nextControlledRacerId = controlledRacerId) => {
    setCountdownIndex(0)
    setControlledProgress(0)
    setNpcTick(0)
    remoteSnapshotsRef.current = {}
    setRemoteProgressByPlayer({})
    setNpcProgressByLane(createNpcProgressByLane(nextHumanLaneIds))
    setBullets(createBulletState(humanPlayers))
    setShotRacerIds([])
    setRoundWinner(null)
    playingRequested.current = false
    setAim({ x: 68, laneId: nextControlledRacerId })
  }, [controlledRacerId, humanLaneIds, humanPlayers])

  useEffect(() => {
    const roomRoundState = roomSnapshot?.roundState
    if (!roomRoundState) {
      return
    }

    if (roomSnapshot.round && roomSnapshot.round !== currentRound) {
      setCurrentRound(roomSnapshot.round)
    }
    if (roomRoundState.scores) {
      setScores(current => {
        const nextScores = roomRoundState.scores
        const currentKeys = Object.keys(current)
        const nextKeys = Object.keys(nextScores)
        const unchanged =
          currentKeys.length === nextKeys.length &&
          nextKeys.every(key => current[key] === nextScores[key])
        return unchanged ? current : nextScores
      })
    }
    if (roomRoundState.history) {
      setRoundHistory(current =>
        JSON.stringify(current) === JSON.stringify(roomRoundState.history)
          ? current
          : roomRoundState.history
      )
    }
    if (roomRoundState.shotRacerIds) {
      setShotRacerIds(current =>
        JSON.stringify(current) === JSON.stringify(roomRoundState.shotRacerIds)
          ? current
          : roomRoundState.shotRacerIds
      )
    }
    const syncedWinner = resolveWinnerSnapshot(roomRoundState.winner)
    setRoundWinner(current => {
      if (!syncedWinner && !current) {
        return current
      }
      if (syncedWinner?.id === current?.id && syncedWinner?.finalProgress === current?.finalProgress) {
        return current
      }
      return syncedWinner
    })

    if (
      roomSnapshot.phase === 'countdown' &&
      state !== 'countdown' &&
      state !== 'playing'
    ) {
      resetRoundState()
      setState('countdown')
      return
    }
    if (['playing', 'roundOver', 'scoreboard'].includes(roomSnapshot.phase)) {
      setState(current => (current === roomSnapshot.phase ? current : roomSnapshot.phase))
    }
  }, [
    currentRound,
    resetRoundState,
    resolveWinnerSnapshot,
    roomSnapshot?.phase,
    roomSnapshot?.round,
    roomSnapshot?.roundState,
    state,
  ])

  const startNextRound = () => {
    if (matchComplete) {
      setState('gameOver')
      return
    }
    playSound('start')
    const nextRound = currentRound + 1
    const nextAssignments = createHumanAssignments(
      humanPlayers,
      `${activeRoomCode}:${nextRound}:${humanPlayers.join('|')}`
    )
    const nextHumanLaneIds = Object.values(nextAssignments)
    const nextControlledRacerId =
      nextAssignments[activePlayerName] ?? nextHumanLaneIds[0] ?? 1
    void syncRoom('next-round', { playerName: activePlayerName })
    setCurrentRound(nextRound)
    resetRoundState(nextHumanLaneIds, nextControlledRacerId)
    setState('countdown')
  }

  const startGameFromLobby = async () => {
    if (lobbyInProgress || !isCurrentHost || !roomReady) {
      return
    }
    playSound('start')
    const room = await syncRoom('countdown', { playerName: activePlayerName })
    if (!room) {
      return
    }
    resetRoundState()
    setState('countdown')
  }

  const createLobby = async () => {
    if (createLobbyPending) {
      return
    }
    setCreateLobbyPending(true)
    playSound('create')
    setCurrentRound(1)
    setScores(createScoreState([pendingPlayerName]))
    setRoundHistory([])
    resetRoundState()
    const nextRoomCode = generateRoomCode()
    try {
      const room = await syncRoom('create', {
        hostName: pendingPlayerName,
        privacy,
        roundCount,
      }, nextRoomCode)
      if (room) {
        setCurrentPlayerName(pendingPlayerName)
        setPlayerNameDraft(pendingPlayerName)
        setRoomCode(nextRoomCode)
        setRoomCodeInput(nextRoomCode)
        setState('lobby')
      }
    } finally {
      setCreateLobbyPending(false)
    }
  }

  const renameCurrentPlayer = async () => {
    const nextPlayerName = playerNameDraft.trim()
    if (!nextPlayerName || nextPlayerName === activePlayerName || renamePending) {
      return
    }
    setRenamePending(true)
    playSound('save')
    try {
      const room = await syncRoom('rename', {
        playerName: activePlayerName,
        nextPlayerName,
      })
      if (room) {
        setCurrentPlayerName(nextPlayerName)
        setJoinName(nextPlayerName)
        setPlayerNameDraft(nextPlayerName)
      }
    } finally {
      setRenamePending(false)
    }
  }

  const moveToState = nextState => {
    if (nextState === 'scoreboard') {
      if (isCurrentHost) {
        void syncRoom('scoreboard', { playerName: activePlayerName })
      }
      setState('scoreboard')
      return
    }
    if (nextState === 'countdown') {
      if (state === 'roundOver' || state === 'scoreboard') {
        startNextRound()
        return
      }
      if (state === 'lobby') {
        void startGameFromLobby()
        return
      }
      if (state === 'menu') {
        setCurrentRound(1)
        setScores(createScoreState(humanPlayers))
        setRoundHistory([])
        const nextRoomCode = generateRoomCode()
        setCurrentPlayerName(pendingPlayerName)
        setRoomCode(nextRoomCode)
        setRoomCodeInput(nextRoomCode)
        void syncRoom('create', {
          hostName: pendingPlayerName,
          privacy,
          roundCount,
        }, nextRoomCode)
      }
      resetRoundState()
    }
    if (nextState === 'lobby') {
      void createLobby()
      return
    }
    setState(nextState)
  }

  useEffect(() => {
    if (!roomSnapshot) {
      return undefined
    }
    let sessionEnded = false
    const handleSessionEnd = () => {
      if (sessionEnded) {
        return
      }
      sessionEnded = true
      setScores(createScoreState(PLAYERS))
      setRoundHistory([])
      setCurrentRound(1)
      leaveRoomOnUnload(roomCode, { playerName: activePlayerName })
    }

    window.addEventListener('pagehide', handleSessionEnd)
    window.addEventListener('beforeunload', handleSessionEnd)
    return () => {
      window.removeEventListener('pagehide', handleSessionEnd)
      window.removeEventListener('beforeunload', handleSessionEnd)
    }
  }, [activePlayerName, roomCode, roomSnapshot])
  useEffect(() => {
    if (roomClosed || state !== 'countdown') {
      return undefined
    }
    const startedAt =
      Date.parse(roomSnapshot?.roundState?.countdownStartedAt ?? '') || Date.now()
    const updateCountdown = () => {
      const elapsedSteps = Math.floor((Date.now() - startedAt) / COUNTDOWN_STEP_MS)
      const nextIndex = Math.min(elapsedSteps, COUNTDOWN_STEPS.length - 1)
      setCountdownIndex(nextIndex)
      if (elapsedSteps >= COUNTDOWN_STEPS.length && isCurrentHost && !playingRequested.current) {
        playingRequested.current = true
        void syncRoom('playing', { playerName: activePlayerName })
      }
    }

    updateCountdown()
    const intervalId = window.setInterval(updateCountdown, 100)
    return () => window.clearInterval(intervalId)
  }, [
    activePlayerName,
    isCurrentHost,
    roomSnapshot?.roundState?.countdownStartedAt,
    roomClosed,
    state,
    syncRoom,
  ])

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
      x: Math.min(100, Math.max(0, x)),
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
    playSound('shot')
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
      playerName: activePlayerName,
      movementMode,
      aim: nextAim,
      firing: true,
    })
    if (shotHits) {
      void syncRoom('shot', {
        playerName: activePlayerName,
        laneId: nextAim.laneId,
      })
      setShotRacerIds(current =>
        current.includes(nextAim.laneId)
          ? current
          : [...current, nextAim.laneId]
      )
    }
  }

  const getPlayerStatusLabel = player => {
    if (player.connected === false) {
      return player.role === 'host' ? 'Host left' : 'Left'
    }
    if (player.role === 'host') {
      return player.ready ? 'Host ready' : 'Host not ready'
    }
    return player.ready ? 'Ready' : 'Not ready'
  }

  const renderLobby = () => (
    <div className='lobby-panel' aria-label='Lobby controls'>
      {roomSnapshot ? (
        <div className='player-list' aria-label='Real players'>
          <div className='list-heading'>
            <span>Real players</span>
            <strong>{roomSnapshot.players.filter((player) => player.connected).length}</strong>
          </div>
          {roomSnapshot.players
            .filter((player) => player.connected)
            .map((player) => (
              <div className='player-row' key={player.id}>
                {state === 'lobby' && player.name === activePlayerName ? (
                  <div className='player-name-edit'>
                    <input
                      aria-label='Your player name'
                      value={playerNameDraft}
                      onChange={(event) => setPlayerNameDraft(event.target.value)}
                    />
                    <button
                      type='button'
                      onClick={() => void renameCurrentPlayer()}
                      disabled={
                        renamePending ||
                        !playerNameDraft.trim() ||
                        playerNameDraft.trim() === activePlayerName
                      }
                    >
                      {renamePending ? 'Saving' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <span>{player.name}</span>
                )}
                <small>{getPlayerStatusLabel(player)}</small>
              </div>
            ))}
        </div>
      ) : null}

      {state === 'lobby' ? (
        <div className='lobby-action-grid'>
          {isCurrentHost ? (
            <button
              type='button'
              className='host-start'
              onClick={() => void startGameFromLobby()}
              disabled={!hostCanStart}
            >
              {hostCanStart ? 'Start game' : 'Waiting for ready'}
            </button>
          ) : (
            <div className='assignment-summary' aria-label='Host start status'>
              <span>Host start</span>
              <strong>Waiting for host</strong>
              <p>{roomReady ? 'The room is ready.' : 'Everyone needs to ready up.'}</p>
            </div>
          )}
          <button
            type='button'
            className='host-start'
            disabled={Boolean(currentRoomPlayer?.ready)}
            onClick={() => {
              playSound('ready')
              void syncRoom('ready', {
                playerName: activePlayerName,
                ready: true,
              })
            }}
          >
            {currentRoomPlayer?.ready ? 'Ready' : 'Ready up'}
          </button>
        </div>
      ) : null}

      {state === 'lobby' && isCurrentHost ? (
        <div className='lobby-settings-grid'>
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
        </div>
      ) : null}

      {lobbySpectators.length > 0 ? (
        <div className='player-list spectator-list' aria-label='Spectators'>
          <div className='list-heading'>
            <span>Spectators</span>
            <strong>{lobbySpectators.length}</strong>
          </div>
          {lobbySpectators.map(player => (
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
          ))}
        </div>
      ) : null}
    </div>
  )

  const renderMenuActions = () => (
    <div className='menu-actions'>
      <div className='control-group player-name-group'>
        <span>Your name</span>
        <input
          aria-label='Player name'
          value={joinName}
          onChange={(event) => setJoinName(event.target.value)}
          placeholder='Player name'
        />
      </div>
      <div className='actions'>
        <button
          type='button'
          aria-busy={createLobbyPending}
          disabled={createLobbyPending}
          onClick={() => void createLobby()}
        >
          {createLobbyPending ? 'Creating lobby' : 'Create lobby'}
        </button>
      </div>
      <div className='control-group'>
        <span>Join lobby</span>
        <div className='join-row'>
          <input
            aria-label='Room code'
            value={roomCodeInput}
            onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
            placeholder='Room code'
          />
          <button
            type='button'
            onClick={async () => {
              playSound('join')
              const targetRoomCode = roomCodeInput.trim().toUpperCase() || roomCode
              const targetPlayerName = pendingPlayerName
              const room = await syncRoom(
                'join',
                { playerName: targetPlayerName },
                targetRoomCode,
              )
              if (room) {
                setCurrentPlayerName(targetPlayerName)
                setPlayerNameDraft(targetPlayerName)
                setRoomCode(targetRoomCode)
                setRoomCodeInput(targetRoomCode)
                setState('lobby')
              }
            }}
          >
            Join lobby
          </button>
        </div>
      </div>
    </div>
  )

  const resetToMenu = () => {
    setState('menu')
    setRoomSnapshot(null)
    setRoomSyncState('local')
    setRoomError('')
    setCurrentPlayerName('')
    setMovementMode('stopped')
  }

  return (
    <main className='app-shell'>
      <header className='top-bar'>
        <div>
          <p className='eyebrow'>Death race</p>
          <h1>Read the racer, hide the tell.</h1>
        </div>
        <div className='top-actions'>
          {state !== 'menu' ? (
            <div className='top-room-summary' aria-label='Room overview'>
              {statusItems.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          ) : null}
          <button
            type='button'
            className={`sound-toggle ${soundMuted ? 'muted' : ''}`}
            aria-label={soundMuted ? 'Unmute sound' : 'Mute sound'}
            onClick={toggleSound}
          >
            {soundMuted ? 'Unmute sound' : 'Mute sound'}
          </button>
        </div>
      </header>

      {state === 'menu' ? (
        <section className='status-strip' aria-label='Round status'>
          {statusItems.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      ) : null}

      <section
        className={`hero-panel ${gameplayFocused ? 'game-focused' : ''}`}
        aria-label='Game area'
      >
        {!gameplayFocused ? (
          <div className='state-card'>
            {state !== 'lobby' ? (
              <>
                <p className='eyebrow'>
                  {state === 'lobby' ? `Lobby ${activeRoomCode}` : activeStateCopy.eyebrow}
                </p>
                <h2 id='state-title'>{activeStateCopy.title}</h2>
                <p>{activeStateCopy.body}</p>
              </>
            ) : null}
            {roomError ? (
              <div className='assignment-summary' aria-label='Room error'>
                <span>{roomClosed ? 'Room closed' : 'Room error'}</span>
                <strong>{roomError}</strong>
                {roomClosed ? (
                  <>
                    <p>The host left or the room expired. Start or join a new lobby.</p>
                    <button type='button' onClick={resetToMenu}>
                      Back to menu
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
            {['roundOver', 'scoreboard', 'gameOver'].includes(state) ? (
              <div className='actions'>
                {state === 'gameOver' || isCurrentHost ? (
                  <button
                    type='button'
                    onClick={() => moveToState(activeStateCopy.next)}
                  >
                    {activeStateCopy.action}
                  </button>
                ) : (
                  <div className='assignment-summary' aria-label='Round host action'>
                    <span>Host action</span>
                    <strong>Waiting for host</strong>
                    <p>The host advances the room from here.</p>
                  </div>
                )}
              </div>
            ) : null}
            {state === 'countdown' ? (
              <div className='countdown-panel' aria-label='Countdown'>
                <span>{COUNTDOWN_STEPS[countdownIndex]}</span>
                <p>Movement and shooting unlock when the room reaches go.</p>
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
            {state === 'menu'
              ? renderMenuActions()
              : ['lobby', 'countdown', 'playing'].includes(state)
                ? renderLobby()
                : null}
          </div>
        ) : null}

        <div className='playfield-stack'>
          <div
            className='playfield'
            aria-label='20 lane race playfield'
            onMouseMove={updateAimFromPointer}
            onMouseDown={fireLocalShot}
            ref={playfieldRef}
          >
            <span className='finish-line' data-testid='finish-line' aria-hidden='true' />
            {state === 'countdown' ? (
              <div className='playfield-countdown' aria-label='Countdown'>
                <strong>{COUNTDOWN_STEPS[countdownIndex]}</strong>
              </div>
            ) : null}
            {roundRacers.map(lane => {
              const isHuman = lane.controller.type === 'human'
              const isControlled = lane.id === controlledRacerId
              const isEliminated = shotRacerIds.includes(lane.id)
              const isRevealed = state === 'roundOver' || state === 'scoreboard'
              const isWinner = roundWinner?.id === lane.id
              const archetypeClass = lane.archetype.toLowerCase()
              const npcStep = getNpcStep(lane, npcTick, npcSeedParts)
              const npcMotionClass =
                npcStep === 'run' ? 'running' : npcStep === 'walk' ? 'walking' : ''
              const npcBobDuration =
                npcStep === 'run'
                  ? lane.npc.runBobMs
                  : npcStep === 'walk'
                    ? lane.npc.walkBobMs
                    : lane.npc.idleBobMs
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
                        ? `npc-bobbing ${npcMotionClass}`
                        : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      '--racer-progress': `${racerProgress}%`,
                      ...(!isHuman
                        ? {
                            '--bob-delay': `-${lane.npc.bobDelayMs}ms`,
                            '--bob-duration': `${npcBobDuration}ms`,
                          }
                        : {})
                    }}
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
                  lane.id === aim.laneId &&
                  !controlledRacerEliminated ? (
                    <span
                      className={`crosshair crosshair-${localPlayerColor} ${localHasBullet ? '' : 'crosshair-spent'}`}
                      data-testid='local-crosshair'
                      style={{
                        left: `${aim.x}%`
                      }}
                    >
                      {localHasBullet ? (
                        <span className='crosshair-bullet' aria-hidden='true' />
                      ) : null}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
          <div className='playfield-controls' aria-label='Controls'>
            <span>Space to walk.</span>
            <span>Left shift to run.</span>
            <span>Mouse to aim and shoot.</span>
            <span>You only get one bullet.</span>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
