import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoom, getRoom, joinRoom, startCountdown } from './api'

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

    const result = await startCountdown('DR-2048')

    expect(result.room.phase).toBe('countdown')
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
})
