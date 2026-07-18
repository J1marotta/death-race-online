import { Room } from '@colyseus/core'
import { DeathRaceState, PlayerState } from './schema.js'

export const DEATH_RACE_ROOM_NAME = 'death-race'
export const MAX_ROOM_PLAYERS = 20
export const MAX_MESSAGES_PER_SECOND = 30

const cleanPlayerName = value => {
  const name = typeof value === 'string' ? value.trim() : ''
  return name.slice(0, 24) || 'Player'
}

export class DeathRaceRoom extends Room {
  maxClients = MAX_ROOM_PLAYERS
  autoDispose = true
  maxMessagesPerSecond = MAX_MESSAGES_PER_SECOND

  onCreate(options = {}) {
    this.state = new DeathRaceState({
      roomCode: options.roomCode?.trim() || this.roomId || 'pending',
      phase: 'lobby',
      privacy: options.privacy === 'private' ? 'private' : 'public',
      roundCount: [3, 5, 7].includes(options.roundCount) ? options.roundCount : 5,
      round: 1,
      hostSessionId: '',
    })
  }

  onJoin(client, options = {}) {
    const isHost = this.state.players.size === 0
    const player = new PlayerState({
      id: client.sessionId,
      name: cleanPlayerName(options.playerName),
      role: isHost ? 'host' : 'player',
      ready: false,
      connected: true,
    })
    this.state.players.set(client.sessionId, player)
    if (isHost) {
      this.state.hostSessionId = client.sessionId
    }
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId)
    if (this.state.hostSessionId === client.sessionId) {
      this.state.hostSessionId = ''
    }
  }
}
