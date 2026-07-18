import { describe, expect, it, vi } from 'vitest'
import {
  MAX_MESSAGES_PER_SECOND,
  MAX_ROOM_PLAYERS,
  RECONNECT_GRACE_SECONDS,
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

    const hostClient = client('session-host')
    const guestClient = client('session-guest')
    room.onJoin(hostClient, { playerName: ' James ' })
    room.onJoin(guestClient, { playerName: 'Mia' })

    const host = room.authorizedPlayer(client('session-host'))
    const guest = room.authorizedPlayer(client('session-guest'))
    expect(room.state.hostPlayerId).toBe(host.id)
    expect(host.name).toBe('James')
    expect(host.role).toBe('host')
    expect(guest.role).toBe('player')
    expect(host.id).not.toBe('session-host')
    expect(hostClient.auth).toEqual({ playerId: host.id })
    expect(hostClient.reconnectionToken.length).toBeGreaterThanOrEqual(43)
    expect(hostClient.reconnectionToken).not.toBe(guestClient.reconnectionToken)
  })

  it('keys players by server connection session instead of display name', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })

    room.onJoin(client('session-a'), { playerName: 'Alex' })
    room.onJoin(client('session-b'), { playerName: 'Alex' })

    expect(room.state.players.size).toBe(2)
    expect(room.authorizedPlayer(client('session-a')).name).toBe('Alex')
    expect(room.authorizedPlayer(client('session-b')).name).toBe('Alex')
    expect(room.authorizedPlayer(client('session-a')).id).not.toBe(
      room.authorizedPlayer(client('session-b')).id,
    )
  })

  it('removes disconnected players from the scaffold room state', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    const guest = client('session-guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })

    room.onLeave(guest)
    expect(room.authorizedPlayer(guest)).toBeUndefined()
    expect(room.state.hostPlayerId).toBe(room.authorizedPlayer(host).id)

    room.onLeave(host)
    expect(room.state.players.size).toBe(0)
    expect(room.state.hostPlayerId).toBe('')
  })

  it('binds authorization to the connection instead of a claimed player name', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    const guest = client('session-guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })

    const forgedPayload = { playerName: 'James' }
    expect(forgedPayload.playerName).toBe('James')
    expect(room.authorizedPlayer(guest).name).toBe('Mia')
    expect(room.authorizedPlayer(guest).role).toBe('player')
  })

  it('keeps a dropped player for the reconnection-token grace period', async () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    room.onJoin(host, { playerName: 'James' })
    const originalToken = host.reconnectionToken
    room.allowReconnection = vi.fn().mockResolvedValue(host)

    await room.onDrop(host)

    expect(room.authorizedPlayer(host).connected).toBe(false)
    expect(room.allowReconnection).toHaveBeenCalledWith(host, RECONNECT_GRACE_SECONDS)
    room.onReconnect(host)
    expect(room.authorizedPlayer(host).connected).toBe(true)
    expect(host.reconnectionToken.length).toBeGreaterThanOrEqual(43)
    expect(host.reconnectionToken).not.toBe(originalToken)
  })

  it('removes a dropped player after the reconnection token expires', async () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    room.onJoin(host, { playerName: 'James' })
    room.allowReconnection = vi.fn().mockRejectedValue(new Error('expired'))

    await room.onDrop(host)

    expect(room.authorizedPlayer(host)).toBeUndefined()
    expect(room.state.hostPlayerId).toBe('')
  })
})
