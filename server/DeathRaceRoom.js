import { Room } from '@colyseus/core'
import { randomBytes, randomUUID } from 'node:crypto'
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

export class DeathRaceRoom extends Room {
  maxClients = MAX_ROOM_PLAYERS
  autoDispose = true
  maxMessagesPerSecond = MAX_MESSAGES_PER_SECOND
  playerIdBySession = new Map()

  onCreate(options = {}) {
    this.state = new DeathRaceState({
      roomCode: options.roomCode?.trim() || this.roomId || 'pending',
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
    const player = new PlayerState({
      id: playerId,
      name: cleanPlayerName(options.playerName),
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
      this.removePlayer(client)
    }
  }

  removePlayer(client) {
    const playerId = this.playerIdBySession.get(client.sessionId)
    if (!playerId) {
      return
    }
    this.playerIdBySession.delete(client.sessionId)
    this.state.players.delete(playerId)
    if (this.state.hostPlayerId === playerId) {
      this.state.hostPlayerId = ''
    }
  }

  onLeave(client) {
    this.removePlayer(client)
  }
}
