import { Room } from '@colyseus/core'
import { randomBytes, randomUUID } from 'node:crypto'
import {
  CLIENT_MESSAGE_TYPES,
  SERVER_MESSAGE_TYPES,
  checkMessageOrder,
  createServerEnvelope,
  validateClientMessage,
} from '../src/multiplayer/protocol.js'
import { CrosshairState, DeathRaceState, PlayerState, RacerState, ShotState } from './schema.js'
import {
  COUNTDOWN_DURATION_MS,
  FINISH_PROGRESS,
  SERVER_TICK_MS,
  advancePlayerRuntime,
  assignSecretLanes,
  createPlayerRuntime,
  setMovementIntent,
} from './simulation.js'
import { resolveShot } from './shooting.js'
import { advanceNpcRuntime, createNpcRuntime } from './npcSimulation.js'

export const DEATH_RACE_ROOM_NAME = 'death-race'
export const MAX_ROOM_PLAYERS = 20
export const MAX_MESSAGES_PER_SECOND = 30
export const RECONNECT_GRACE_SECONDS = 45

const cleanPlayerName = value => {
  const name = typeof value === 'string' ? value.trim() : ''
  return name.slice(0, 24) || 'Player'
}

const createResumeToken = () => randomBytes(32).toString('base64url')
const activeRoomCodes = new Set()

const normalizeRoomCode = value => {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return code.replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export function resetActiveRoomCodesForTests() {
  activeRoomCodes.clear()
}

export class DeathRaceRoom extends Room {
  maxClients = MAX_ROOM_PLAYERS
  autoDispose = true
  maxMessagesPerSecond = MAX_MESSAGES_PER_SECOND
  playerIdBySession = new Map()
  lastSequenceByPlayerId = new Map()
  runtimeByPlayerId = new Map()
  crosshairIdByPlayerId = new Map()
  lastPrivateStateSentAt = new Map()
  eventSequence = 0
  messages = {
    command: (client, message) => this.handleCommand(client, message),
  }

  onCreate(options = {}) {
    const roomCode = normalizeRoomCode(options.roomCode) || normalizeRoomCode(this.roomId)
    if (activeRoomCodes.has(roomCode)) {
      throw new Error('Room code is already in use')
    }
    activeRoomCodes.add(roomCode)
    this.roomId = roomCode
    this.state = new DeathRaceState({
      roomCode,
      phase: 'lobby',
      privacy: options.privacy === 'private' ? 'private' : 'public',
      roundCount: [3, 5, 7].includes(options.roundCount) ? options.roundCount : 5,
      round: 1,
      countdownEndsAt: 0,
      winnerLaneId: 0,
      winnerName: '',
      winnerType: '',
      speedMultiplier: 1,
      hostPlayerId: '',
    })
    this.setSimulationInterval?.(deltaMs => this.advanceSimulation(deltaMs), SERVER_TICK_MS)
  }

  onJoin(client, options = {}) {
    const isHost = this.state.players.size === 0
    const playerId = randomUUID()
    const playerName = cleanPlayerName(options.playerName)
    const nameTaken = [...this.state.players.values()].some(
      player => player.name.toLocaleLowerCase() === playerName.toLocaleLowerCase(),
    )
    if (nameTaken) {
      throw new Error('Player name is not available')
    }
    const joinsActiveRound = this.state.phase !== 'lobby'
    const player = new PlayerState({
      id: playerId,
      connectionId: client.sessionId,
      name: playerName,
      role: isHost ? 'host' : joinsActiveRound ? 'spectator' : 'player',
      ready: joinsActiveRound,
      connected: true,
      score: 0,
      kills: 0,
      hasBullet: true,
    })
    this.playerIdBySession.set(client.sessionId, playerId)
    client.auth = { playerId }
    client.reconnectionToken = createResumeToken()
    this.state.players.set(playerId, player)
    if (isHost) {
      this.state.hostPlayerId = playerId
    }
  }

  authorizedPlayer(client) {
    const playerId = this.playerIdBySession.get(client.sessionId)
    return playerId ? this.state.players.get(playerId) : undefined
  }

  isHost(player) {
    return Boolean(player) && player.id === this.state.hostPlayerId
  }

  createEventId() {
    this.eventSequence += 1
    return `${this.state.roomCode}:${this.state.round}:${this.eventSequence}`
  }

  sendError(client, code, message) {
    const payload = createServerEnvelope(
      SERVER_MESSAGE_TYPES.ERROR,
      { code, message },
      {
        roomId: this.state.roomCode,
        roundId: this.state.round,
        eventId: this.createEventId(),
      },
    )
    client.send?.(SERVER_MESSAGE_TYPES.ERROR, payload)
    return { ok: false, error: code }
  }

  sendSnapshot(client) {
    const payload = createServerEnvelope(
      SERVER_MESSAGE_TYPES.SNAPSHOT,
      this.state.toJSON(),
      {
        roomId: this.state.roomCode,
        roundId: this.state.round,
        eventId: this.createEventId(),
      },
    )
    client.send?.(SERVER_MESSAGE_TYPES.SNAPSHOT, payload)
    return payload
  }

  handleCommand(client, rawMessage) {
    const player = this.authorizedPlayer(client)
    if (!player) {
      return this.sendError(client, 'unauthorized', 'Connection is not bound to a player')
    }
    const validation = validateClientMessage(rawMessage)
    if (!validation.ok) {
      return this.sendError(client, 'invalid-message', validation.error)
    }
    const message = validation.value
    if (message.roomId !== this.state.roomCode) {
      return this.sendError(client, 'wrong-room', 'Message belongs to another room')
    }
    const ordering = checkMessageOrder(message, {
      roundId: this.state.round,
      lastSequence: this.lastSequenceByPlayerId.get(player.id) ?? 0,
    })
    if (!ordering.ok) {
      return this.sendError(client, 'invalid-order', ordering.error)
    }

    let result
    if (message.type === CLIENT_MESSAGE_TYPES.RENAME) {
      result = this.renamePlayer(player, message.payload.nextPlayerName)
    } else if (message.type === CLIENT_MESSAGE_TYPES.SETTINGS) {
      result = this.updateLobbySettings(player, message.payload)
    } else if (message.type === CLIENT_MESSAGE_TYPES.READY) {
      result = this.setPlayerReady(player, message.payload.ready)
    } else if (message.type === CLIENT_MESSAGE_TYPES.START_COUNTDOWN) {
      result = this.startCountdown(player)
    } else if (message.type === CLIENT_MESSAGE_TYPES.INPUT) {
      result = this.updateMovementIntent(player, message.payload.movementMode)
    } else if (message.type === CLIENT_MESSAGE_TYPES.AIM) {
      result = this.updateAim(player, message.payload)
    } else if (message.type === CLIENT_MESSAGE_TYPES.SHOT) {
      result = this.fireShot(player, message.payload)
    } else if (message.type === CLIENT_MESSAGE_TYPES.NEXT_ROUND) {
      result = this.startNextRound(player)
    } else if (message.type === CLIENT_MESSAGE_TYPES.LEAVE) {
      const hostLeft = this.removePlayer(client)
      if (hostLeft) {
        void this.closeAfterHostDeparture()
      }
      result = { ok: true }
    } else {
      return this.sendError(client, 'unsupported-command', 'Command is not available yet')
    }

    if (!result.ok) {
      return this.sendError(client, result.error, result.message)
    }
    this.lastSequenceByPlayerId.set(player.id, message.sequence)
    return result
  }

  requireLobby() {
    return this.state.phase === 'lobby'
      ? { ok: true }
      : { ok: false, error: 'wrong-phase', message: 'Lobby command is not available now' }
  }

  renamePlayer(player, requestedName) {
    const phase = this.requireLobby()
    if (!phase.ok) {
      return phase
    }
    const nextName = cleanPlayerName(requestedName)
    const nameTaken = [...this.state.players.values()].some(
      other =>
        other.id !== player.id &&
        other.name.toLocaleLowerCase() === nextName.toLocaleLowerCase(),
    )
    if (nameTaken) {
      return { ok: false, error: 'name-taken', message: 'Player name is not available' }
    }
    player.name = nextName
    return { ok: true }
  }

  updateLobbySettings(player, settings) {
    const phase = this.requireLobby()
    if (!phase.ok) {
      return phase
    }
    if (!this.isHost(player)) {
      return { ok: false, error: 'host-only', message: 'Only the host can edit settings' }
    }
    if (settings.privacy) {
      this.state.privacy = settings.privacy
    }
    if (settings.roundCount) {
      this.state.roundCount = settings.roundCount
    }
    return { ok: true }
  }

  setPlayerReady(player, ready) {
    const phase = this.requireLobby()
    if (!phase.ok) {
      return phase
    }
    player.ready = ready
    return { ok: true }
  }

  startCountdown(player) {
    const phase = this.requireLobby()
    if (!phase.ok) {
      return phase
    }
    if (!this.isHost(player)) {
      return { ok: false, error: 'host-only', message: 'Only the host can start' }
    }
    const players = [...this.state.players.values()]
    if (
      !players.length ||
      players.some(current => !current.connected || !current.ready)
    ) {
      return { ok: false, error: 'not-ready', message: 'Every player must be ready' }
    }
    this.runtimeByPlayerId.clear()
    this.crosshairIdByPlayerId.clear()
    this.lastPrivateStateSentAt.clear()
    this.state.racers.clear()
    this.state.crosshairs.clear()
    this.state.shots.clear()
    const lanes = assignSecretLanes(players.map(current => current.id), MAX_ROOM_PLAYERS)
    const countdownEndsAt = Date.now() + COUNTDOWN_DURATION_MS
    players.forEach((current, index) => {
      const runtime = createPlayerRuntime({ playerId: current.id, laneId: lanes.get(current.id) })
      this.runtimeByPlayerId.set(current.id, runtime)
      const crosshairId = randomUUID()
      this.crosshairIdByPlayerId.set(current.id, crosshairId)
      current.hasBullet = true
      this.state.racers.set(String(runtime.laneId), new RacerState({
        laneId: runtime.laneId,
        progress: 0,
        movementMode: 'stopped',
        eliminated: false,
      }))
      this.state.crosshairs.set(crosshairId, new CrosshairState({
        id: crosshairId,
        aimX: 0,
        aimY: 50,
        colorIndex: index % 8,
        hasBullet: true,
      }))
      this.sendPrivateStateForPlayer(current.id)
    })
    const humanLanes = new Set(lanes.values())
    for (let laneId = 1; laneId <= MAX_ROOM_PLAYERS; laneId += 1) {
      if (humanLanes.has(laneId)) continue
      const runtime = createNpcRuntime({
        laneId,
        seed: `${this.state.roomCode}:${this.state.round}`,
        nowMs: countdownEndsAt,
      })
      this.runtimeByPlayerId.set(runtime.playerId, runtime)
      this.state.racers.set(String(laneId), new RacerState({
        laneId,
        progress: 0,
        movementMode: 'idle',
        eliminated: false,
      }))
    }
    this.state.countdownEndsAt = countdownEndsAt
    this.state.winnerLaneId = 0
    this.state.winnerName = ''
    this.state.winnerType = ''
    this.state.speedMultiplier = 1
    this.state.phase = 'countdown'
    return { ok: true }
  }

  privateStateFor(client) {
    const player = this.authorizedPlayer(client)
    const runtime = player && this.runtimeByPlayerId.get(player.id)
    return runtime ? {
      playerId: player.id,
      laneId: runtime.laneId,
      crosshairId: this.crosshairIdByPlayerId.get(player.id) ?? '',
      stamina: runtime.staminaMs / 2000,
      exhausted: runtime.exhausted,
      eliminated: runtime.eliminated,
    } : undefined
  }

  sendPrivateStateForPlayer(playerId) {
    const client = this.clients?.find(candidate => this.playerIdBySession.get(candidate.sessionId) === playerId)
    if (!client) return
    const privateState = this.privateStateFor(client)
    if (privateState) client.send?.(SERVER_MESSAGE_TYPES.PRIVATE_STATE, privateState)
  }

  updateMovementIntent(player, movementMode) {
    if (this.state.phase !== 'playing') {
      return { ok: false, error: 'wrong-phase', message: 'Movement is available after Go' }
    }
    const runtime = this.runtimeByPlayerId.get(player.id)
    if (!runtime || !setMovementIntent(runtime, movementMode)) {
      return { ok: false, error: 'invalid-input', message: 'Movement input is not available' }
    }
    return { ok: true }
  }

  updateAim(player, { aimX, aimY }) {
    if (!['countdown', 'playing'].includes(this.state.phase)) {
      return { ok: false, error: 'wrong-phase', message: 'Aiming is available during the race' }
    }
    const crosshairId = this.crosshairIdByPlayerId.get(player.id)
    const crosshair = crosshairId && this.state.crosshairs.get(crosshairId)
    if (!crosshair) {
      return { ok: false, error: 'invalid-input', message: 'Crosshair is not available' }
    }
    crosshair.aimX = aimX
    crosshair.aimY = aimY
    return { ok: true }
  }

  startNextRound(player) {
    if (this.state.phase !== 'roundOver') {
      return { ok: false, error: 'wrong-phase', message: 'The round is not over' }
    }
    if (!this.isHost(player)) {
      return { ok: false, error: 'host-only', message: 'Only the host can continue' }
    }
    if (this.state.round >= this.state.roundCount) {
      this.state.phase = 'gameOver'
      return { ok: true, complete: true }
    }
    for (const current of this.state.players.values()) {
      if (current.connected) {
        current.ready = true
        if (current.role === 'spectator') current.role = 'player'
      }
    }
    this.state.round += 1
    this.state.phase = 'lobby'
    return this.startCountdown(player)
  }

  fireShot(player, { aimX, aimY }) {
    if (this.state.phase !== 'playing') {
      return { ok: false, error: 'wrong-phase', message: 'Shooting is available after Go' }
    }
    const shooter = this.runtimeByPlayerId.get(player.id)
    if (shooter) shooter.hasBullet = player.hasBullet
    const result = resolveShot({ shooter, runtimes: this.runtimeByPlayerId, aimX, aimY })
    if (!result.ok) {
      return { ok: false, error: result.error, message: 'This player cannot shoot now' }
    }
    player.hasBullet = false
    const crosshair = this.state.crosshairs.get(this.crosshairIdByPlayerId.get(player.id))
    if (crosshair) {
      crosshair.aimX = aimX
      crosshair.aimY = aimY
      crosshair.hasBullet = false
    }
    const victimPlayer = result.victim?.controllerType === 'human'
      ? this.state.players.get(result.victim.playerId)
      : undefined
    if (result.scored) {
      player.score += 1
      player.kills += 1
    }
    if (result.victim) {
      const racer = this.state.racers.get(String(result.victim.laneId))
      if (racer) {
        racer.eliminated = true
        racer.movementMode = 'stopped'
      }
    }
    const eventId = this.createEventId()
    const event = new ShotState({
      eventId,
      shooterName: player.name,
      laneId: result.laneId,
      victimName: victimPlayer?.name ?? '',
      victimType: result.hit ? (victimPlayer ? 'human' : 'npc') : 'none',
      impactX: result.impactX,
      hit: result.hit,
      scored: result.scored,
    })
    this.state.shots.set(eventId, event)
    const envelope = createServerEnvelope(SERVER_MESSAGE_TYPES.EVENT, event.toJSON(), {
      roomId: this.state.roomCode,
      roundId: this.state.round,
      eventId,
    })
    this.broadcast?.(SERVER_MESSAGE_TYPES.EVENT, envelope)
    return { ok: true, event }
  }

  advanceSimulation(deltaMs, nowMs = Date.now()) {
    if (this.state.phase === 'countdown') {
      if (nowMs < this.state.countdownEndsAt) return
      this.state.phase = 'playing'
    }
    if (this.state.phase !== 'playing') return

    const humansAlive = [...this.runtimeByPlayerId.values()].some(
      runtime => runtime.controllerType === 'human' && !runtime.eliminated,
    )
    this.state.speedMultiplier = !humansAlive && this.state.round < this.state.roundCount ? 4 : 1

    for (const runtime of this.runtimeByPlayerId.values()) {
      if (runtime.controllerType === 'npc') {
        const npcNow = runtime.lastUpdatedAt + (nowMs - runtime.lastUpdatedAt) * this.state.speedMultiplier
        advanceNpcRuntime(runtime, npcNow)
      } else {
        advancePlayerRuntime(runtime, deltaMs, nowMs)
        if (nowMs - (this.lastPrivateStateSentAt.get(runtime.playerId) ?? 0) >= 100) {
          this.sendPrivateStateForPlayer(runtime.playerId)
          this.lastPrivateStateSentAt.set(runtime.playerId, nowMs)
        }
      }
      const racer = this.state.racers.get(String(runtime.laneId))
      if (racer) {
        racer.progress = runtime.progress
        racer.movementMode = runtime.movementMode
        racer.eliminated = runtime.eliminated
      }
      if (!runtime.eliminated && runtime.progress >= FINISH_PROGRESS) {
        this.state.winnerLaneId = runtime.laneId
        this.state.winnerType = runtime.controllerType
        if (runtime.controllerType === 'human') {
          const winner = this.state.players.get(runtime.playerId)
          this.state.winnerName = winner?.name ?? ''
          if (winner) winner.score += 3
        } else {
          this.state.winnerName = `NPC ${runtime.laneId}`
        }
        this.state.phase = 'roundOver'
        break
      }
    }
  }

  markDisconnected(client) {
    const player = this.authorizedPlayer(client)
    if (player) {
      player.connected = false
      player.ready = false
    }
    return player
  }

  onReconnect(client) {
    const player = this.authorizedPlayer(client)
    if (player) {
      client.auth = { playerId: player.id }
      client.reconnectionToken = createResumeToken()
      player.connected = true
      this.sendSnapshot(client)
      const privateState = this.privateStateFor(client)
      if (privateState) client.send?.(SERVER_MESSAGE_TYPES.PRIVATE_STATE, privateState)
    }
  }

  async onDrop(client) {
    const player = this.markDisconnected(client)
    if (!player) {
      return
    }
    try {
      await this.allowReconnection(client, RECONNECT_GRACE_SECONDS)
    } catch {
      const hostLeft = this.removePlayer(client)
      if (hostLeft) {
        await this.closeAfterHostDeparture()
      }
    }
  }

  removePlayer(client) {
    const playerId = this.playerIdBySession.get(client.sessionId)
    if (!playerId) {
      return false
    }
    const hostLeft = this.state.hostPlayerId === playerId
    this.playerIdBySession.delete(client.sessionId)
    this.lastSequenceByPlayerId.delete(playerId)
    this.lastPrivateStateSentAt.delete(playerId)
    const crosshairId = this.crosshairIdByPlayerId.get(playerId)
    if (crosshairId) this.state.crosshairs.delete(crosshairId)
    this.crosshairIdByPlayerId.delete(playerId)
    const runtime = this.runtimeByPlayerId.get(playerId)
    this.runtimeByPlayerId.delete(playerId)
    if (!hostLeft && runtime && ['countdown', 'playing'].includes(this.state.phase)) {
      const npc = createNpcRuntime({
        laneId: runtime.laneId,
        seed: `${this.state.roomCode}:${this.state.round}:replacement`,
        nowMs: Date.now(),
      })
      npc.progress = runtime.progress
      npc.eliminated = runtime.eliminated
      this.runtimeByPlayerId.set(npc.playerId, npc)
    }
    this.state.players.delete(playerId)
    if (hostLeft) {
      this.state.hostPlayerId = ''
    }
    return hostLeft
  }

  async closeAfterHostDeparture() {
    this.state.phase = 'closed'
    await this.disconnect()
  }

  async onLeave(client) {
    const hostLeft = this.removePlayer(client)
    if (hostLeft) {
      await this.closeAfterHostDeparture()
    }
  }

  onDispose() {
    activeRoomCodes.delete(this.state?.roomCode)
    this.playerIdBySession.clear()
    this.lastSequenceByPlayerId.clear()
    this.runtimeByPlayerId.clear()
    this.crosshairIdByPlayerId.clear()
    this.lastPrivateStateSentAt.clear()
  }
}
