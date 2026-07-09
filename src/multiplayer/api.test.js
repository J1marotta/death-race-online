import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createRoom,
  createRoomSocket,
  finishRound,
  getRoom,
  getRoomsApiBase,
  joinRoom,
  recordShot,
  sendPlayerHeartbeat,
  setPlayerReady,
  showScoreboard,
  submitPlayerInput,
  startCountdown,
  startNextRound,
  startPlaying,
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

  it('creates live room sockets through the api', () => {
    const OriginalWebSocket = global.WebSocket
    global.WebSocket = vi.fn(function WebSocket(url) {
      return { url }
    })

    try {
      const socket = createRoomSocket('DR-2048', 'Mia')

      expect(socket.url).toContain('/api/rooms/DR-2048/live')
      expect(socket.url).toContain('playerName=Mia')
    } finally {
      global.WebSocket = OriginalWebSocket
    }
  })

  it('uses the deployed rooms worker from production pages hosts', () => {
    expect(getRoomsApiBase('death-race-online.pages.dev')).toBe(
      'https://death-race-rooms.james-marotta.workers.dev/api/rooms',
    )
    expect(getRoomsApiBase('localhost')).toBe('/api/rooms')
    expect(getRoomsApiBase('127.0.0.1')).toBe('/api/rooms')
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

  it('starts playing through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { phase: 'playing' } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await startPlaying('DR-2048', { playerName: 'James' })

    expect(result.room.phase).toBe('playing')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      action: 'playing',
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

    const result = await startNextRound('DR-2048', { playerName: 'James' })

    expect(result.room.round).toBe(2)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      action: 'next-round',
      playerName: 'James',
    })
  })

  it('records shots through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { roomCode: 'DR-2048', roundState: {} } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await recordShot('DR-2048', { playerName: 'Mia', laneId: 7 })

    expect(result.room.roomCode).toBe('DR-2048')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      action: 'shot',
      playerName: 'Mia',
      laneId: 7,
    })
  })

  it('finishes rounds through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { phase: 'roundOver' } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await finishRound('DR-2048', {
      playerName: 'James',
      laneId: 7,
      winnerName: 'James',
      winnerType: 'human',
    })

    expect(result.room.phase).toBe('roundOver')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      action: 'round-over',
      playerName: 'James',
      laneId: 7,
    })
  })

  it('shows scoreboards through the api', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ room: { phase: 'scoreboard' } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    const result = await showScoreboard('DR-2048', { playerName: 'James' })

    expect(result.room.phase).toBe('scoreboard')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      action: 'scoreboard',
      playerName: 'James',
    })
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
