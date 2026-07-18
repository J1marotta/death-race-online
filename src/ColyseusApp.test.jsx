import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ColyseusApp from './ColyseusApp.jsx'
import { createLobbyCode } from './multiplayer/lobbyCode.js'

class FakeTransport {
  listeners = new Map()
  create = vi.fn().mockResolvedValue(undefined)
  join = vi.fn().mockResolvedValue(undefined)
  rename = vi.fn()
  setReady = vi.fn()
  startCountdown = vi.fn()
  move = vi.fn()
  shoot = vi.fn()
  nextRound = vi.fn()
  subscribe(type, listener) { this.listeners.set(type, listener); return () => this.listeners.delete(type) }
  emit(type, value) {
    if (type === 'view') this.listeners.get('meta')?.({ ...value, racers: [] })
    this.listeners.get(type)?.(value)
  }
}

const lobby = {
  roomCode: 'DRTEST', phase: 'lobby', round: 1, roundCount: 3,
  localPlayerId: 'p1', hostPlayerId: 'p1', localLaneId: 7,
  players: [{ id: 'p1', name: 'James', role: 'host', ready: false, connected: true, score: 0, kills: 0, hasBullet: true }],
  racers: [], shots: [], winner: null,
}

describe('feature-flagged Colyseus React client', () => {
  afterEach(cleanup)

  it('generates an easy-to-share lobby code for hosts', () => {
    expect(createLobbyCode(() => 0)).toBe('AAAAAA')
    expect(createLobbyCode(() => 0.999)).toBe('999999')
  })

  it('creates a lobby through the transport with a loading state', async () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'James' } })
    fireEvent.change(screen.getByLabelText('Lobby code'), { target: { value: 'drtest' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Create lobby' }).at(-1))
    return waitFor(() => expect(transport.create).toHaveBeenCalledWith(expect.objectContaining({ roomCode: 'DRTEST', playerName: 'James' })))
  })

  it('shows readiness and host start without a scrolling action flow', () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    act(() => transport.emit('view', lobby))
    fireEvent.click(screen.getByRole('button', { name: 'Ready' }))
    expect(transport.setReady).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: 'Start game' }).disabled).toBe(true)
  })

  it('lets the local player edit and submit their lobby display name', () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    act(() => transport.emit('view', lobby))
    const input = screen.getByLabelText('Display name')
    fireEvent.change(input, { target: { value: 'Jules' } })
    expect(input.value).toBe('Jules')
    fireEvent.blur(input)
    expect(transport.rename).toHaveBeenCalledWith('Jules')
  })

  it('renders authoritative racers and sends intent rather than progress', () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    const playing = {
      ...lobby,
      phase: 'playing',
      players: [{ ...lobby.players[0], ready: true }],
      racers: Array.from({ length: 20 }, (_, index) => ({ laneId: index + 1, progress: index, movementMode: 'idle', eliminated: false })),
    }
    act(() => transport.emit('meta', { ...playing, racers: [] }))
    act(() => transport.emit('view', playing))
    expect(screen.getByLabelText('Race track').querySelectorAll('.migration-racer')).toHaveLength(20)
    fireEvent.keyDown(window, { code: 'ArrowRight' })
    fireEvent.keyUp(window, { code: 'ArrowRight' })
    expect(transport.move.mock.calls).toEqual([['walking'], ['stopped']])
    expect(transport.move.mock.calls.flat()).not.toContain(expect.objectContaining({ progress: expect.anything() }))
  })

  it('shows authoritative results and lets only the host advance', () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    act(() => transport.emit('view', { ...lobby, phase: 'roundOver', winner: { name: 'James', type: 'human', laneId: 7 } }))
    fireEvent.click(screen.getByRole('button', { name: 'Next round' }))
    expect(transport.nextRound).toHaveBeenCalledOnce()
    expect(screen.getByText('James wins')).toBeTruthy()
  })

  it('keeps a late-joining spectator from sending gameplay input', () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    const spectatorView = {
      ...lobby,
      phase: 'playing',
      players: [{ ...lobby.players[0], role: 'spectator' }],
      racers: Array.from({ length: 20 }, (_, index) => ({ laneId: index + 1, progress: 0, eliminated: false })),
    }
    act(() => transport.emit('meta', { ...spectatorView, racers: [] }))
    act(() => transport.emit('view', spectatorView))
    fireEvent.keyDown(window, { code: 'ArrowRight' })
    expect(transport.move).not.toHaveBeenCalled()
    expect(screen.getByText('Spectating')).toBeTruthy()
  })
})
