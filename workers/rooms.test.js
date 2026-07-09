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

  it('destroys rooms when the host leaves', async () => {
    const state = createDurableObjectState()
    const roomObject = new RoomLobbyObject(state, {})

    await roomObject.fetch(postRoom('create', { hostName: 'James' }))
    await roomObject.fetch(postRoom('join', { playerName: 'Mia' }))
    const response = await roomObject.fetch(postRoom('leave', { playerName: 'James' }))
    const body = await response.json()

    expect(body.destroyed).toBe(true)
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
})
