import { describe, expect, it, vi } from 'vitest'
import { RoomLobbyObject } from './rooms'

function createDurableObjectState(roomCode = 'DR-TEST') {
  const store = new Map()
  return {
    id: {
      toString: () => roomCode,
    },
    storage: {
      get: vi.fn(async (key) => store.get(key)),
      put: vi.fn(async (key, value) => {
        store.set(key, value)
      }),
      delete: vi.fn(async (key) => {
        store.delete(key)
      }),
      setAlarm: vi.fn(async (timestamp) => {
        store.set('alarm', timestamp)
      }),
      deleteAlarm: vi.fn(async () => {
        store.delete('alarm')
      }),
    },
    store,
  }
}

function postRoom(action, body = {}, roomCode = 'DR-TEST') {
  return new Request(`https://rooms.example/api/rooms/${roomCode}`, {
    method: 'POST',
    body: JSON.stringify({ action, ...body }),
    headers: {
      'content-type': 'application/json',
    },
  })
}

describe('rooms worker', () => {
  it('answers browser preflight requests for cross-origin pages', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    const response = await roomObject.fetch(
      new Request('https://rooms.example/api/rooms/DR-TEST', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://death-race-online.pages.dev',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('access-control-allow-methods')).toContain('POST')
    expect(response.headers.get('access-control-allow-headers')).toContain('content-type')
  })

  it('adds cors headers to api responses', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    const response = await roomObject.fetch(
      new Request('https://rooms.example/api/rooms/DR-TEST'),
    )

    expect(response.status).toBe(404)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('does not create placeholder rooms on get', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    const response = await roomObject.fetch(
      new Request('https://rooms.example/api/rooms/DR-TEST'),
    )
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Room not found')
    expect(state.store.has('room')).toBe(false)
  })

  it('does not create placeholder rooms on join', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    const response = await roomObject.fetch(postRoom('join', { playerName: 'Mia' }))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Room not found')
    expect(state.store.has('room')).toBe(false)
  })

  it('lets players join only after the host creates the room', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    const createResponse = await roomObject.fetch(
      postRoom('create', { hostName: 'James' }),
    )
    const joinResponse = await roomObject.fetch(postRoom('join', { playerName: 'Mia' }))
    const { room } = await joinResponse.json()

    expect(createResponse.status).toBe(201)
    expect(joinResponse.status).toBe(200)
    expect(room.players.map((player) => player.name)).toEqual(['James', 'Mia'])
  })

  it('preserves the requested room code instead of the object id', async () => {
    const state = createDurableObjectState('opaque-object-id')
    const roomObject = new RoomLobbyObject(state, {})

    const response = await roomObject.fetch(
      postRoom('create', { hostName: 'James' }, 'DR-SHARE'),
    )
    const { room } = await response.json()

    expect(room.roomCode).toBe('DR-SHARE')
  })

  it('rejects live sockets when the runtime has no websocket support', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    await roomObject.fetch(postRoom('create', { hostName: 'James' }))
    const response = await roomObject.fetch(
      new Request('https://rooms.example/api/rooms/DR-TEST/live', {
        headers: {
          upgrade: 'websocket',
        },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(501)
    expect(body.error).toBe('Live transport unavailable')
  })

  it('destroys rooms when the host leaves', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    await roomObject.fetch(postRoom('create', { hostName: 'James' }))
    await roomObject.fetch(postRoom('join', { playerName: 'Mia' }))
    const response = await roomObject.fetch(postRoom('leave', { playerName: 'James' }))
    const body = await response.json()

    expect(body.destroyed).toBe(true)
    expect(body.error).toBe('Host left the room')
    expect(state.store.has('room')).toBe(false)
  })

  it('refreshes a single player heartbeat', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    await roomObject.fetch(postRoom('create', { hostName: 'James' }))
    const staleRoom = state.store.get('room')
    const oldHeartbeat = new Date(Date.now() - 10000).toISOString()
    state.store.set('room', {
      ...staleRoom,
      players: staleRoom.players.map((player) => ({
        ...player,
        updatedAt: oldHeartbeat,
      })),
    })
    const response = await roomObject.fetch(
      postRoom('heartbeat', { playerName: 'James' }),
    )
    const { room } = await response.json()

    expect(response.status).toBe(200)
    expect(room.players[0].updatedAt).not.toBe(oldHeartbeat)
    expect(state.store.has('alarm')).toBe(true)
  })

  it('closes stale rooms when no connected host remains', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    await roomObject.fetch(postRoom('create', { hostName: 'James' }))
    const staleRoom = state.store.get('room')
    state.store.set('room', {
      ...staleRoom,
      players: staleRoom.players.map((player) => ({
        ...player,
        ready: true,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })),
    })
    const response = await roomObject.fetch(
      new Request('https://rooms.example/api/rooms/DR-TEST'),
    )
    const body = await response.json()

    expect(response.status).toBe(410)
    expect(body.destroyed).toBe(true)
    expect(state.store.has('room')).toBe(false)
  })

  it('uses the cleanup alarm to destroy abandoned rooms', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    await roomObject.fetch(postRoom('create', { hostName: 'James' }))
    const staleRoom = state.store.get('room')
    state.store.set('room', {
      ...staleRoom,
      players: staleRoom.players.map((player) => ({
        ...player,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })),
    })
    await roomObject.alarm()

    expect(state.store.has('room')).toBe(false)
  })

  it('requires the host and all ready players before starting countdown', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    await roomObject.fetch(postRoom('create', { hostName: 'James' }))
    const tooEarlyResponse = await roomObject.fetch(
      postRoom('countdown', { playerName: 'James' }),
    )
    await roomObject.fetch(postRoom('ready', { playerName: 'James', ready: true }))
    await roomObject.fetch(postRoom('join', { playerName: 'Mia' }))
    await roomObject.fetch(postRoom('ready', { playerName: 'Mia', ready: true }))
    const nonHostResponse = await roomObject.fetch(
      postRoom('countdown', { playerName: 'Mia' }),
    )
    const hostResponse = await roomObject.fetch(
      postRoom('countdown', { playerName: 'James' }),
    )
    const { room } = await hostResponse.json()

    expect(tooEarlyResponse.status).toBe(400)
    expect(nonHostResponse.status).toBe(403)
    expect(hostResponse.status).toBe(200)
    expect(room.phase).toBe('countdown')
  })

  it('syncs host-controlled round events through the room', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    await roomObject.fetch(postRoom('create', { hostName: 'James' }))
    await roomObject.fetch(postRoom('ready', { playerName: 'James', ready: true }))
    await roomObject.fetch(postRoom('join', { playerName: 'Mia' }))
    await roomObject.fetch(postRoom('ready', { playerName: 'Mia', ready: true }))
    await roomObject.fetch(postRoom('countdown', { playerName: 'James' }))

    const nonHostPlaying = await roomObject.fetch(
      postRoom('playing', { playerName: 'Mia' }),
    )
    const hostPlaying = await roomObject.fetch(
      postRoom('playing', { playerName: 'James' }),
    )
    await roomObject.fetch(postRoom('shot', { playerName: 'Mia', laneId: 7 }))
    const nonHostFinish = await roomObject.fetch(
      postRoom('round-over', {
        playerName: 'Mia',
        laneId: 7,
        winnerName: 'Mia',
        winnerType: 'human',
      }),
    )
    const hostFinish = await roomObject.fetch(
      postRoom('round-over', {
        playerName: 'James',
        laneId: 7,
        winnerName: 'Mia',
        winnerType: 'human',
        finalProgress: 91,
      }),
    )
    const nonHostScoreboard = await roomObject.fetch(
      postRoom('scoreboard', { playerName: 'Mia' }),
    )
    const hostScoreboard = await roomObject.fetch(
      postRoom('scoreboard', { playerName: 'James' }),
    )
    const nonHostNextRound = await roomObject.fetch(
      postRoom('next-round', { playerName: 'Mia' }),
    )
    const hostNextRound = await roomObject.fetch(
      postRoom('next-round', { playerName: 'James' }),
    )
    const { room } = await hostNextRound.json()

    expect(nonHostPlaying.status).toBe(403)
    expect(hostPlaying.status).toBe(200)
    expect(nonHostFinish.status).toBe(403)
    expect(hostFinish.status).toBe(200)
    expect(nonHostScoreboard.status).toBe(403)
    expect(hostScoreboard.status).toBe(200)
    expect(nonHostNextRound.status).toBe(403)
    expect(hostNextRound.status).toBe(200)
    expect(room.phase).toBe('countdown')
    expect(room.round).toBe(2)
    expect(room.roundState.scores.Mia).toBe(1)
    expect(room.roundState.history[0]).toMatchObject({
      round: 1,
      winnerName: 'Mia',
      laneId: 7,
    })
  })
})
