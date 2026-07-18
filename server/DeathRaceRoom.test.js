import { describe, expect, it } from 'vitest'
import {
  MAX_MESSAGES_PER_SECOND,
  MAX_ROOM_PLAYERS,
  DeathRaceRoom,
} from './DeathRaceRoom.js'

const client = sessionId => ({ sessionId })

describe('Colyseus DeathRaceRoom scaffold', () => {
  it('creates an isolated lobby with conservative runtime limits', () => {
    const room = new DeathRaceRoom()
    room.onCreate({
      roomCode: 'DRTEST',
      privacy: 'private',
      roundCount: 7,
    })

    expect(room.state.roomCode).toBe('DRTEST')
    expect(room.state.phase).toBe('lobby')
    expect(room.state.privacy).toBe('private')
    expect(room.state.roundCount).toBe(7)
    expect(room.maxClients).toBe(MAX_ROOM_PLAYERS)
    expect(room.autoDispose).toBe(true)
    expect(room.maxMessagesPerSecond).toBe(MAX_MESSAGES_PER_SECOND)
  })

  it('makes the first connection host and later connections players', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })

    room.onJoin(client('session-host'), { playerName: ' James ' })
    room.onJoin(client('session-guest'), { playerName: 'Mia' })

    expect(room.state.hostSessionId).toBe('session-host')
    expect(room.state.players.get('session-host').name).toBe('James')
    expect(room.state.players.get('session-host').role).toBe('host')
    expect(room.state.players.get('session-guest').role).toBe('player')
  })

  it('keys players by server connection session instead of display name', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })

    room.onJoin(client('session-a'), { playerName: 'Alex' })
    room.onJoin(client('session-b'), { playerName: 'Alex' })

    expect(room.state.players.size).toBe(2)
    expect(room.state.players.get('session-a').name).toBe('Alex')
    expect(room.state.players.get('session-b').name).toBe('Alex')
  })

  it('removes disconnected players from the scaffold room state', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    const guest = client('session-guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })

    room.onLeave(guest)
    expect(room.state.players.has('session-guest')).toBe(false)
    expect(room.state.hostSessionId).toBe('session-host')

    room.onLeave(host)
    expect(room.state.players.size).toBe(0)
    expect(room.state.hostSessionId).toBe('')
  })
})
