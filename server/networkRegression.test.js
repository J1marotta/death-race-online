// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLIENT_MESSAGE_TYPES, PROTOCOL_VERSION } from '../src/multiplayer/protocol.js'
import { DeathRaceRoom, resetActiveRoomCodesForTests } from './DeathRaceRoom.js'
import { FINISH_PROGRESS } from './simulation.js'

const client = sessionId => ({ sessionId, send: vi.fn() })
const command = (type, payload, sequence, roomId = 'LOADTEST', roundId = 1) => ({
  protocolVersion: PROTOCOL_VERSION, type, roomId, roundId, sequence, payload,
})

describe('multiplayer network regression', () => {
  beforeEach(() => resetActiveRoomCodesForTests())

  it('fills a maximum 20-human room with unique private lanes and no NPCs', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'LOADTEST' })
    const clients = Array.from({ length: 20 }, (_, index) => client(`session-${index}`))
    clients.forEach((connection, index) => {
      room.onJoin(connection, { playerName: `Player ${index + 1}` })
      room.authorizedPlayer(connection).ready = true
    })
    expect(room.startCountdown(room.authorizedPlayer(clients[0])).ok).toBe(true)
    const privateLanes = clients.map(connection => room.privateStateFor(connection).laneId)
    expect(new Set(privateLanes).size).toBe(20)
    expect([...room.runtimeByPlayerId.values()].every(runtime => runtime.controllerType === 'human')).toBe(true)
    expect(room.state.racers.size).toBe(20)
  })

  it('rejects duplicated, reordered, stale, future, and wrong-room packets', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'LOADTEST' })
    const host = client('host')
    room.onJoin(host, { playerName: 'James' })
    expect(room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, 2)).ok).toBe(true)
    expect(room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.READY, { ready: false }, 2)).error).toBe('invalid-order')
    expect(room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.READY, { ready: false }, 1)).error).toBe('invalid-order')
    expect(room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.READY, { ready: false }, 3, 'OTHER')).error).toBe('wrong-room')
    expect(room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.READY, { ready: false }, 3, 'LOADTEST', 0)).error).toBe('invalid-order')
    expect(room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.READY, { ready: false }, 3, 'LOADTEST', 2)).error).toBe('invalid-order')
  })

  it('stays authoritative through latency, jitter, packet loss, duplication, and reordering', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'LOADTEST' })
    const host = client('host')
    room.onJoin(host, { playerName: 'James' })

    const network = [
      { arrivesAt: 190, packet: command(CLIENT_MESSAGE_TYPES.READY, { ready: false }, 2) },
      { arrivesAt: 40, packet: command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, 1) },
      { arrivesAt: 120, packet: command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, 1) },
      { arrivesAt: 160, packet: command(CLIENT_MESSAGE_TYPES.READY, { ready: false }, 3) },
      // Sequence 4 is intentionally lost before it reaches the server.
      { arrivesAt: 310, packet: command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, 5) },
      { arrivesAt: 280, packet: command(CLIENT_MESSAGE_TYPES.READY, { ready: false }, 3) },
    ].sort((left, right) => left.arrivesAt - right.arrivesAt)

    const results = network.map(({ packet }) => room.handleCommand(host, packet))
    expect(results).toEqual([
      { ok: true },
      { ok: false, error: 'invalid-order' },
      { ok: true },
      { ok: false, error: 'invalid-order' },
      { ok: false, error: 'invalid-order' },
      { ok: true },
    ])
    expect(room.authorizedPlayer(host).ready).toBe(true)
    expect(room.lastSequenceByPlayerId.get(room.authorizedPlayer(host).id)).toBe(5)
  })

  it('never exposes the private player-to-lane map through public snapshots or errors', () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'LOADTEST' })
    const host = client('host')
    const guest = client('guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })
    room.authorizedPlayer(host).ready = true
    room.authorizedPlayer(guest).ready = true
    room.startCountdown(room.authorizedPlayer(host))
    const guestId = room.authorizedPlayer(guest).id
    const guestLane = room.privateStateFor(guest).laneId
    const publicSnapshot = JSON.stringify(room.sendSnapshot(host))
    const forgedError = JSON.stringify(room.handleCommand(
      guest,
      command(CLIENT_MESSAGE_TYPES.INPUT, { movementMode: 'walking', laneId: guestLane }, 1),
    ))
    expect(publicSnapshot).toContain(guestId)
    expect(publicSnapshot).not.toContain(`"playerId":"${guestId}","laneId":${guestLane}`)
    expect(forgedError).not.toContain(String(guestLane))
  })

  it('disposes many rooms without retaining private runtime or session maps', () => {
    const rooms = Array.from({ length: 30 }, (_, index) => {
      const room = new DeathRaceRoom()
      room.onCreate({ roomCode: `LOAD${index}` })
      const connection = client(`session-${index}`)
      room.onJoin(connection, { playerName: `Player ${index}` })
      room.onDispose()
      return room
    })
    for (const room of rooms) {
      expect(room.playerIdBySession.size).toBe(0)
      expect(room.lastSequenceByPlayerId.size).toBe(0)
      expect(room.runtimeByPlayerId.size).toBe(0)
    }
    const reused = new DeathRaceRoom()
    expect(() => reused.onCreate({ roomCode: 'LOAD0' })).not.toThrow()
  })

  it('keeps simultaneous full-room simulation inside a conservative local budget', () => {
    const heapBefore = process.memoryUsage().heapUsed
    const startedAt = performance.now()
    const rooms = Array.from({ length: 10 }, (_, roomIndex) => {
      const room = new DeathRaceRoom()
      room.onCreate({ roomCode: `CAP${roomIndex}` })
      for (let playerIndex = 0; playerIndex < 20; playerIndex += 1) {
        const connection = client(`room-${roomIndex}-player-${playerIndex}`)
        room.onJoin(connection, { playerName: `R${roomIndex} Player ${playerIndex}` })
        room.authorizedPlayer(connection).ready = true
      }
      room.startCountdown([...room.state.players.values()][0])
      room.advanceSimulation(0, room.state.countdownEndsAt)
      return room
    })
    for (let tick = 1; tick <= 200; tick += 1) {
      for (const room of rooms) room.advanceSimulation(50, room.state.countdownEndsAt + tick * 50)
    }
    const elapsedMs = performance.now() - startedAt
    const heapGrowth = process.memoryUsage().heapUsed - heapBefore
    expect(elapsedMs).toBeLessThan(5000)
    expect(heapGrowth).toBeLessThan(128 * 1024 * 1024)
    rooms.forEach(room => room.onDispose())
  })

  it('completes shoot, finish, score, next-round, and disconnect through commands', async () => {
    const room = new DeathRaceRoom()
    room.onCreate({ roomCode: 'LOADTEST', roundCount: 3 })
    const host = client('host')
    const guest = client('guest')
    room.onJoin(host, { playerName: 'James' })
    room.onJoin(guest, { playerName: 'Mia' })
    room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, 1))
    room.handleCommand(guest, command(CLIENT_MESSAGE_TYPES.READY, { ready: true }, 1))
    room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.START_COUNTDOWN, {}, 2))
    room.advanceSimulation(0, room.state.countdownEndsAt)
    const guestRuntime = room.runtimeByPlayerId.get(room.authorizedPlayer(guest).id)
    const aimY = ((guestRuntime.laneId - 0.5) / 20) * 100
    room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.SHOT, { aimX: 0, aimY }, 3))
    expect(guestRuntime.eliminated).toBe(true)
    expect(room.authorizedPlayer(host).score).toBe(1)
    const hostRuntime = room.runtimeByPlayerId.get(room.authorizedPlayer(host).id)
    hostRuntime.progress = FINISH_PROGRESS - 0.01
    room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.INPUT, { movementMode: 'walking' }, 4))
    room.advanceSimulation(50, room.state.countdownEndsAt + 50)
    expect(room.state.phase).toBe('roundOver')
    expect(room.authorizedPlayer(host).score).toBe(4)
    room.handleCommand(host, command(CLIENT_MESSAGE_TYPES.NEXT_ROUND, {}, 5))
    expect(room.state.round).toBe(2)
    expect(room.state.phase).toBe('countdown')
    expect(room.authorizedPlayer(host).hasBullet).toBe(true)
    room.disconnect = vi.fn().mockResolvedValue(undefined)
    await room.onLeave(host)
    expect(room.state.phase).toBe('closed')
    expect(room.disconnect).toHaveBeenCalledOnce()
  })
})
