import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createRoom,
  getRoom,
  joinRoom,
  sendPlayerHeartbeat,
  setPlayerReady,
  submitPlayerInput,
  startCountdown,
  startNextRound,
} from './api'

describe('multiplayer api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn()
  })

  it('creates rooms through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { roomCode: 'DR-2048' } }), {
        status: 201,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await createRoom('DR-2048', { hostName: 'James' })

    expect(result.room.roomCode).toBe('DR-2048')
    expect(fetch).toHaveBeenCalled()
  })

  it('joins rooms through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { roomCode: 'DR-2048' } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await joinRoom('DR-2048', { playerName: 'Mia' })

    expect(result.room.roomCode).toBe('DR-2048')
  })

  it('starts countdowns through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { phase: 'countdown' } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await startCountdown('DR-2048', { playerName: 'James' })

    expect(result.room.phase).toBe('countdown')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      action: 'countdown',
      playerName: 'James',
    })
  })

  it('retrieves rooms through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { roomCode: 'DR-2048' } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await getRoom('DR-2048')

    expect(result.room.roomCode).toBe('DR-2048')
  })

  it('marks players ready through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { roomCode: 'DR-2048', players: [] } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await setPlayerReady('DR-2048', { playerName: 'Mia', ready: true })

    expect(result.room.roomCode).toBe('DR-2048')
  })

  it('sends player heartbeats through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { roomCode: 'DR-2048', players: [] } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await sendPlayerHeartbeat('DR-2048', { playerName: 'Mia' })

    expect(result.room.roomCode).toBe('DR-2048')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      action: 'heartbeat',
      playerName: 'Mia',
    })
  })

  it('starts the next round through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { roomCode: 'DR-2048', round: 2 } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await startNextRound('DR-2048')

    expect(result.room.round).toBe(2)
  })

  it('submits player input through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { roomCode: 'DR-2048', inputs: {} } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await submitPlayerInput('DR-2048', {
      playerName: 'Mia',
      movementMode: 'running',
    })

    expect(result.room.roomCode).toBe('DR-2048')
  })
})
