import { Room } from '@colyseus/core'
import { randomBytes, randomUUID } from 'node:crypto'
import {
  CLIENT_MESSAGE_TYPES,
  SERVER_MESSAGE_TYPES,
  checkMessageOrder,
  createServerEnvelope,
  validateClientMessage,
} from '../src/multiplayer/protocol.js'
import { DeathRaceState, PlayerState } from './schema.js'

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
      hostPlayerId: '',
    })
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
    const player = new PlayerState({
      id: playerId,
      name: playerName,
      role: isHost ? 'host' : 'player',
      ready: false,
      connected: true,
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
    this.state.phase = 'countdown'
    return { ok: true }
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
  }
}
