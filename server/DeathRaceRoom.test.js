import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLIENT_MESSAGE_TYPES, PROTOCOL_VERSION } from '../src/multiplayer/protocol.js'
import {
  MAX_MESSAGES_PER_SECOND,
  MAX_ROOM_PLAYERS,
  RECONNECT_GRACE_SECONDS,
  DeathRaceRoom,
  resetActiveRoomCodesForTests,
} from './DeathRaceRoom.js'
import { FINISH_PROGRESS, WALK_PROGRESS_PER_SECOND } from './simulation.js'

const client = sessionId => ({ sessionId, send: vi.fn() })
const command = (type, payload, overrides = {}) => ({
  protocolVersion: PROTOCOL_VERSION,
  type,
  roomId: 'DRTEST',
  roundId: 1,
  sequence: 1,
  payload,
  ...overrides,
})

describe('Colyseus DeathRaceRoom scaffold', () => {
  beforeEach(() => resetActiveRoomCodesForTests())

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
    room.onJoin(client('session-b'), { playerName: 'Blake' })

    expect(room.state.players.size).toBe(2)
    expect(room.authorizedPlayer(client('session-a')).name).toBe('Alex')
    expect(room.authorizedPlayer(client('session-b')).name).toBe('Blake')
    expect(room.authorizedPlayer(client('session-a')).id).not.toBe(
      room.authorizedPlayer(client('session-b')).id,
    )
  })

  it('removes disconnected players from the scaffold room state', async () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    const guest = client('session-guest')
    room.disconnect = vi.fn().mockResolvedValue(undefined)
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })

    await room.onLeave(guest)
    expect(room.authorizedPlayer(guest)).toBeUndefined()
    expect(room.state.hostPlayerId).toBe(room.authorizedPlayer(host).id)

    await room.onLeave(host)
    expect(room.state.players.size).toBe(0)
    expect(room.state.hostPlayerId).toBe('')
    expect(room.state.phase).toBe('closed')
    expect(room.disconnect).toHaveBeenCalledOnce()
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
    room.disconnect = vi.fn().mockResolvedValue(undefined)

    await room.onDrop(host)

    expect(room.authorizedPlayer(host)).toBeUndefined()
    expect(room.state.hostPlayerId).toBe('')
    expect(room.state.phase).toBe('closed')
    expect(room.disconnect).toHaveBeenCalledOnce()
  })

  it('rejects a duplicate active room code and releases it on disposal', () => {
    const first = new DeathRaceRoom()
    first.onCreate({ roomCode: 'dr-test' })
    const second = new DeathRaceRoom()

    expect(() => second.onCreate({ roomCode: 'DRTEST' })).toThrow(
      'Room code is already in use',
    )
    first.onDispose()
    expect(() => second.onCreate({ roomCode: 'DRTEST' })).not.toThrow()
  })

  it('rejects duplicate display names without using them as identity', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    room.onJoin(client('session-a'), { playerName: 'Alex' })

    expect(() => room.onJoin(client('session-b'), { playerName: 'alex' })).toThrow(
      'Player name is not available',
    )
  })

  it('lets players rename and ready only their connection-bound player', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    const guest = client('session-guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })

    expect(
      room.handleCommand(
        guest,
        command(CLIENT_MESSAGE_TYPES.RENAME, { nextPlayerName: 'Ava' }),
      ).ok,
    ).toBe(true)
    expect(room.authorizedPlayer(guest).name).toBe('Ava')
    expect(room.authorizedPlayer(host).name).toBe('James')

    expect(
      room.handleCommand(
        guest,
        command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, { sequence: 2 }),
      ).ok,
    ).toBe(true)
    expect(room.authorizedPlayer(guest).ready).toBe(true)
    expect(room.authorizedPlayer(host).ready).toBe(false)
  })

  it('allows only the host connection to edit lobby settings', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    const guest = client('session-guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })

    const forged = command(CLIENT_MESSAGE_TYPES.SETTINGS, {
      privacy: 'private',
      roundCount: 7,
      playerName: 'James',
    })
    expect(room.handleCommand(guest, forged)).toEqual({ ok: false, error: 'host-only' })
    expect(room.state.privacy).toBe('public')
    expect(room.state.roundCount).toBe(5)

    expect(room.handleCommand(host, forged).ok).toBe(true)
    expect(room.state.privacy).toBe('private')
    expect(room.state.roundCount).toBe(7)
  })

  it('requires the host and every connected player to be ready before countdown', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    const guest = client('session-guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })

    const start = command(CLIENT_MESSAGE_TYPES.START_COUNTDOWN, {})
    expect(room.handleCommand(host, start)).toEqual({ ok: false, error: 'not-ready' })
    room.handleCommand(
      host,
      command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, { sequence: 2 }),
    )
    room.handleCommand(
      guest,
      command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, { sequence: 1 }),
    )
    expect(
      room.handleCommand(
        guest,
        command(CLIENT_MESSAGE_TYPES.START_COUNTDOWN, {}, { sequence: 2 }),
      ),
    ).toEqual({ ok: false, error: 'host-only' })
    expect(
      room.handleCommand(
        host,
        command(CLIENT_MESSAGE_TYPES.START_COUNTDOWN, {}, { sequence: 3 }),
      ).ok,
    ).toBe(true)
    expect(room.state.phase).toBe('countdown')
  })

  it('assigns secret unique lanes and exposes only anonymized racer state', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    const guest = client('session-guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })
    room.authorizedPlayer(host).ready = true
    room.authorizedPlayer(guest).ready = true

    expect(room.startCountdown(room.authorizedPlayer(host)).ok).toBe(true)
    const hostPrivate = room.privateStateFor(host)
    const guestPrivate = room.privateStateFor(guest)
    expect(hostPrivate.laneId).not.toBe(guestPrivate.laneId)
    expect(hostPrivate.playerId).toBe(room.authorizedPlayer(host).id)
    expect([...room.state.racers.values()]).toHaveLength(2)
    expect([...room.state.racers.values()].every(racer => !('playerId' in racer))).toBe(true)
    expect([...room.state.racers.values()].every(racer => !('name' in racer))).toBe(true)
  })

  it('accepts movement only after Go and derives progress on the server', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    room.onJoin(host, { playerName: 'James' })
    room.authorizedPlayer(host).ready = true

    expect(
      room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.INPUT, { movementMode: 'walking' })),
    ).toEqual({ ok: false, error: 'wrong-phase' })
    room.startCountdown(room.authorizedPlayer(host))
    room.advanceSimulation(0, room.state.countdownEndsAt)
    expect(room.state.phase).toBe('playing')

    const result = room.handleCommand(
      host,
      command(
        CLIENT_MESSAGE_TYPES.INPUT,
        { movementMode: 'walking', progress: 100 },
        { sequence: 2 },
      ),
    )
    expect(result.ok).toBe(true)
    room.advanceSimulation(1000, room.state.countdownEndsAt + 1000)
    const laneId = room.privateStateFor(host).laneId
    expect(room.state.racers.get(String(laneId)).progress).toBe(WALK_PROGRESS_PER_SECOND)
  })

  it('declares a winner only when server simulation crosses the finish', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    room.onJoin(host, { playerName: 'James' })
    room.authorizedPlayer(host).ready = true
    room.startCountdown(room.authorizedPlayer(host))
    room.advanceSimulation(0, room.state.countdownEndsAt)
    const runtime = room.runtimeByPlayerId.get(room.authorizedPlayer(host).id)
    runtime.progress = FINISH_PROGRESS - 1
    room.updateMovementIntent(room.authorizedPlayer(host), 'walking')

    room.advanceSimulation(1000, room.state.countdownEndsAt + 1000)

    expect(room.state.phase).toBe('roundOver')
    expect(room.state.winnerLaneId).toBe(runtime.laneId)
  })

  it('resolves shots from aim instead of a client-claimed victim', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    const guest = client('session-guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })
    room.authorizedPlayer(host).ready = true
    room.authorizedPlayer(guest).ready = true
    room.startCountdown(room.authorizedPlayer(host))
    room.advanceSimulation(0, room.state.countdownEndsAt)
    const guestRuntime = room.runtimeByPlayerId.get(room.authorizedPlayer(guest).id)
    guestRuntime.progress = 40
    const aimY = ((guestRuntime.laneId - 0.5) / 20) * 100

    const result = room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.SHOT, {
      aimX: 40,
      aimY,
      victimPlayerId: room.authorizedPlayer(host).id,
      score: 999,
    }))

    expect(result.ok).toBe(true)
    expect(result.event.victimName).toBe('Mia')
    expect(room.authorizedPlayer(host).score).toBe(1)
    expect(room.authorizedPlayer(host).kills).toBe(1)
    expect(guestRuntime.eliminated).toBe(true)
  })

  it('spends one bullet on a miss and rejects a duplicate shot', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    room.onJoin(host, { playerName: 'James' })
    room.authorizedPlayer(host).ready = true
    room.startCountdown(room.authorizedPlayer(host))
    room.advanceSimulation(0, room.state.countdownEndsAt)

    expect(room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.SHOT, { aimX: 100, aimY: 100 })).ok).toBe(true)
    expect(room.authorizedPlayer(host).hasBullet).toBe(false)
    expect(
      room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.SHOT, { aimX: 0, aimY: 0 }, { sequence: 2 })),
    ).toEqual({ ok: false, error: 'shot-unavailable' })
  })

  it('allows a self-shot but awards no score', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    room.onJoin(host, { playerName: 'James' })
    room.authorizedPlayer(host).ready = true
    room.startCountdown(room.authorizedPlayer(host))
    room.advanceSimulation(0, room.state.countdownEndsAt)
    const runtime = room.runtimeByPlayerId.get(room.authorizedPlayer(host).id)
    runtime.progress = 25
    const aimY = ((runtime.laneId - 0.5) / 20) * 100

    const result = room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.SHOT, { aimX: 25, aimY }))
    expect(result.event.hit).toBe(true)
    expect(result.event.scored).toBe(false)
    expect(room.authorizedPlayer(host).score).toBe(0)
    expect(runtime.eliminated).toBe(true)
  })

  it('does not start while a player is inside the reconnection grace window', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    const guest = client('session-guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })
    room.authorizedPlayer(host).ready = true
    room.authorizedPlayer(guest).ready = true
    room.markDisconnected(guest)

    expect(
      room.handleCommand(
        host,
        command(CLIENT_MESSAGE_TYPES.START_COUNTDOWN, {}),
      ),
    ).toEqual({ ok: false, error: 'not-ready' })
    expect(room.state.phase).toBe('lobby')
  })

  it('closes the room when the authenticated host sends leave', async () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    room.onJoin(host, { playerName: 'James' })
    room.disconnect = vi.fn().mockResolvedValue(undefined)

    expect(
      room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.LEAVE, {})).ok,
    ).toBe(true)
    await Promise.resolve()
    expect(room.state.phase).toBe('closed')
    expect(room.disconnect).toHaveBeenCalledOnce()
  })

  it('rejects wrong-room, stale, duplicate, and wrong-phase commands', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'DRTEST' })
    const host = client('session-host')
    room.onJoin(host, { playerName: 'James' })

    expect(
      room.handleCommand(
        host,
        command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, { roomId: 'OTHER' }),
      ).error,
    ).toBe('wrong-room')
    expect(
      room.handleCommand(
        host,
        command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, { roundId: 0 }),
      ).error,
    ).toBe('invalid-order')
    expect(
      room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.READY, { ready: true })).ok,
    ).toBe(true)
    expect(
      room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.READY, { ready: false })).error,
    ).toBe('invalid-order')
    expect(
      room.handleCommand(
        host,
        command(CLIENT_MESSAGE_TYPES.INPUT, { movementMode: 'walking' }, { sequence: 2 }),
      ).error,
    ).toBe('wrong-phase')
  })
})
