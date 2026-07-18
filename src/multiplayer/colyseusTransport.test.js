import { describe, expect, it, vi } from 'vitest'
import { ColyseusTransport, MAX_RECONNECT_ATTEMPTS } from './colyseusTransport.js'
import { CLIENT_MESSAGE_TYPES, PROTOCOL_VERSION } from './protocol.js'

const fakeRoom = (roomId = 'DRTEST') => {
  const handlers = { messages: new Map() }
  return {
    roomId,
    sessionId: 'session-local',
    reconnectionToken: 'resume-token',
    send: vi.fn(),
    leave: vi.fn().mockResolvedValue(undefined),
    onStateChange: vi.fn(callback => { handlers.state = callback }),
    onMessage: vi.fn((type, callback) => handlers.messages.set(type, callback)),
    onLeave: vi.fn(callback => { handlers.leave = callback }),
    handlers,
  }
}

describe('Colyseus client transport', () => {
  it('creates and joins rooms through a stable adapter', async () => {
    const created = fakeRoom()
    const joined = fakeRoom()
    const client = {
      create: vi.fn().mockResolvedValue(created),
      joinById: vi.fn().mockResolvedValue(joined),
    }
    const transport = new ColyseusTransport({ client })
    await transport.create({ roomCode: 'DRTEST', playerName: 'James', privacy: 'private', roundCount: 7 })
    expect(client.create).toHaveBeenCalledWith('death-race', expect.objectContaining({ roomCode: 'DRTEST' }))
    await transport.join({ roomCode: 'DRTEST', playerName: 'Mia' })
    expect(client.joinById).toHaveBeenCalledWith('DRTEST', { playerName: 'Mia' })
  })

  it('adds protocol, room, round, and monotonic sequence envelopes', async () => {
    const room = fakeRoom()
    const transport = new ColyseusTransport({ client: { create: vi.fn().mockResolvedValue(room) } })
    await transport.create({ roomCode: 'DRTEST', playerName: 'James' })
    room.handlers.state({ toJSON: () => ({ round: 3 }) })
    transport.move('walking')
    transport.shoot(25, 40)
    expect(room.send.mock.calls[0][1]).toMatchObject({
      protocolVersion: PROTOCOL_VERSION,
      type: CLIENT_MESSAGE_TYPES.INPUT,
      roomId: 'DRTEST',
      roundId: 3,
      sequence: 1,
    })
    expect(room.send.mock.calls[1][1]).toMatchObject({ type: CLIENT_MESSAGE_TYPES.SHOT, sequence: 2 })
  })

  it('forwards snapshots and private state without polling', async () => {
    const room = fakeRoom()
    const transport = new ColyseusTransport({ client: { create: vi.fn().mockResolvedValue(room) } })
    const snapshots = []
    const privateStates = []
    const views = []
    transport.subscribe('snapshot', value => snapshots.push(value))
    transport.subscribe('private-state', value => privateStates.push(value))
    transport.subscribe('view', value => views.push(value))
    await transport.create({ roomCode: 'DRTEST', playerName: 'James' })
    room.handlers.state({ toJSON: () => ({ phase: 'playing', round: 2, players: { p1: { id: 'p1', connectionId: 'session-local' } } }) })
    room.handlers.messages.get('private-state')({ laneId: 7 })
    expect(snapshots).toEqual([expect.objectContaining({ phase: 'playing', round: 2 })])
    expect(privateStates).toEqual([{ playerId: 'p1', laneId: 7 }])
    expect(views.at(-1).localLaneId).toBe(7)
    expect(views.at(-1).localPlayerId).toBe('p1')
    expect(views.at(-1).phase).toBe('playing')
  })

  it('does not republish room metadata for progress-only server ticks', async () => {
    const room = fakeRoom()
    const transport = new ColyseusTransport({ client: { create: vi.fn().mockResolvedValue(room) } })
    const meta = []
    transport.subscribe('meta', value => meta.push(value))
    await transport.create({ roomCode: 'DRTEST', playerName: 'James' })
    room.handlers.state({ toJSON: () => ({ phase: 'playing', round: 1, racers: { 1: { laneId: 1, progress: 1 } } }) })
    room.handlers.state({ toJSON: () => ({ phase: 'playing', round: 1, racers: { 1: { laneId: 1, progress: 2 } } }) })
    expect(meta).toHaveLength(1)
  })

  it('reconnects with capped exponential delays and jitter', async () => {
    const original = fakeRoom()
    const resumed = fakeRoom()
    const reconnect = vi.fn()
      .mockRejectedValueOnce(new Error('one'))
      .mockRejectedValueOnce(new Error('two'))
      .mockResolvedValue(resumed)
    const delays = []
    const transport = new ColyseusTransport({
      client: { create: vi.fn().mockResolvedValue(original), reconnect },
      random: () => 0.5,
      schedule: (callback, delay) => { delays.push(delay); callback() },
    })
    await transport.create({ roomCode: 'DRTEST', playerName: 'James' })
    original.handlers.leave(1006)
    await vi.waitFor(() => expect(reconnect).toHaveBeenCalledTimes(3))
    expect(delays).toEqual([500, 1000])
  })

  it('stops after the retry cap and reports disconnection', async () => {
    const statuses = []
    const errors = []
    const transport = new ColyseusTransport({
      client: { reconnect: vi.fn().mockRejectedValue(new Error('offline')) },
      schedule: callback => callback(),
      random: () => 0.5,
    })
    transport.subscribe('status', status => statuses.push(status))
    transport.subscribe('error', error => errors.push(error))
    await transport.reconnect('expired')
    expect(statuses).toEqual(['reconnecting', 'disconnected'])
    expect(errors.at(-1).code).toBe('reconnect-failed')
    expect(transport.client.reconnect).toHaveBeenCalledTimes(MAX_RECONNECT_ATTEMPTS)
  })

  it('surfaces a server-owned room closure without starting reconnection', async () => {
    const room = fakeRoom()
    const reconnect = vi.fn()
    const transport = new ColyseusTransport({
      client: { create: vi.fn().mockResolvedValue(room), reconnect },
    })
    const closures = []
    transport.subscribe('closed', details => closures.push(details))
    await transport.create({ roomCode: 'DRTEST', playerName: 'James' })

    room.handlers.messages.get('closed')({
      payload: { reason: 'host-left', message: 'The host left the room' },
    })
    room.handlers.leave(1006)

    expect(closures).toEqual([{ reason: 'host-left', message: 'The host left the room' }])
    expect(reconnect).not.toHaveBeenCalled()
  })
})
