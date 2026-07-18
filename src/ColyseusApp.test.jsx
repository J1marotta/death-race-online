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
  aim = vi.fn()
  shoot = vi.fn()
  nextRound = vi.fn()
  leave = vi.fn().mockResolvedValue(undefined)
  subscribe(type, listener) { this.listeners.set(type, listener); return () => this.listeners.delete(type) }
  emit(type, value) {
    if (type === 'view') this.currentView = value
    if (type === 'view') this.listeners.get('meta')?.({ ...value, racers: [] })
    this.listeners.get(type)?.(value)
  }
}

const lobby = {
  roomCode: 'DRTEST', phase: 'lobby', round: 1, roundCount: 3,
  localPlayerId: 'p1', hostPlayerId: 'p1', localLaneId: 7,
  players: [{ id: 'p1', name: 'James', role: 'host', ready: false, connected: true, score: 0, kills: 0, hasBullet: true }],
  racers: [], crosshairs: [], shots: [], winner: null,
}

function installAudioContextMock(oscillators) {
  const parameter = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
  vi.stubGlobal('AudioContext', vi.fn(function AudioContextMock() {
    return {
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createGain: () => ({ gain: parameter(), connect: vi.fn() }),
      createOscillator: () => {
        const oscillator = { frequency: parameter(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
        oscillators.push(oscillator)
        return oscillator
      },
      createBuffer: (_channels, length) => ({ getChannelData: () => new Float32Array(length) }),
      createBufferSource: () => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), buffer: null }),
      createBiquadFilter: () => ({ connect: vi.fn(), frequency: parameter(), type: '' }),
    }
  }))
}

describe('feature-flagged Colyseus React client', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

  it('generates an easy-to-share lobby code for hosts', () => {
    expect(createLobbyCode(() => 0)).toBe('AAAAAA')
    expect(createLobbyCode(() => 0.999)).toBe('999999')
  })

  it('creates a lobby through the transport with a loading state', async () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    fireEvent.click(screen.getByRole('button', { name: 'Host a game' }))
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'James' } })
    fireEvent.change(screen.getByLabelText('Lobby code'), { target: { value: 'drtest' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Create lobby' }).at(-1))
    return waitFor(() => expect(transport.create).toHaveBeenCalledWith(expect.objectContaining({ roomCode: 'DRTEST', playerName: 'James' })))
  })

  it('opens on the join flow because guests are the common case', () => {
    render(<ColyseusApp transport={new FakeTransport()} />)
    expect(screen.getByRole('tablist').querySelector('button').className).toContain('active')
    expect(screen.getByRole('tablist').querySelector('button').textContent).toBe('Join lobby')
    expect(screen.getByPlaceholderText('Enter shared code')).toBeTruthy()
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
    const racers = [...document.querySelectorAll('.migration-racer')]
    expect(new Set(racers.map(racer => racer.className.match(/shape-\d/)?.[0])).size).toBe(8)
    expect(new Set(racers.map(racer => racer.className.match(/archetype-\w+/)?.[0])).size).toBe(5)
    expect(racers.every(racer => racer.querySelector('.racer-head') && racer.querySelector('.racer-body'))).toBe(true)
    fireEvent.keyDown(window, { code: 'ArrowRight' })
    fireEvent.keyDown(window, { code: 'Space' })
    fireEvent.keyUp(window, { code: 'ArrowRight' })
    fireEvent.keyUp(window, { code: 'Space' })
    expect(transport.move.mock.calls).toEqual([['walking'], ['running'], ['stopped']])
    expect(transport.move.mock.calls.flat()).not.toContain(expect.objectContaining({ progress: expect.anything() }))
    expect(screen.getByRole('button', { name: 'Mute sound' }).closest('.migration-track')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mute sound' }))
    expect(screen.getByRole('button', { name: 'Unmute sound' })).toBeTruthy()
  })

  it('falls back to walking when sprint is released while walk remains held', () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    const playing = {
      ...lobby,
      phase: 'playing',
      countdownEndsAt: Date.now() - 1000,
      players: [{ ...lobby.players[0], ready: true }],
      racers: Array.from({ length: 20 }, (_, index) => ({ laneId: index + 1, progress: 3, movementMode: 'stopped', eliminated: false })),
    }
    act(() => transport.emit('view', playing))

    fireEvent.keyDown(window, { code: 'ArrowRight' })
    fireEvent.keyDown(window, { code: 'Space' })
    fireEvent.keyUp(window, { code: 'Space' })

    expect(transport.move.mock.calls).toEqual([['walking'], ['running'], ['walking']])
    expect(document.querySelector('.migration-controls span.pressed').textContent).toContain('Walk')
  })

  it('renders anonymous shared crosshairs, private stamina, and authoritative kill feedback', () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    const playing = {
      ...lobby,
      phase: 'playing',
      localCrosshairId: 'cross-local',
      localStamina: 0.4,
      localExhausted: true,
      players: [{ ...lobby.players[0], ready: true }],
      racers: Array.from({ length: 20 }, (_, index) => ({ laneId: index + 1, progress: 20, movementMode: 'idle', eliminated: index === 2 })),
      crosshairs: [
        { id: 'cross-local', aimX: 10, aimY: 20, colorIndex: 0, hasBullet: true },
        { id: 'cross-guest', aimX: 40, aimY: 15, colorIndex: 2, hasBullet: false },
      ],
      shots: [{ eventId: 'shot-1', shooterName: 'James', laneId: 3, victimName: '', victimType: 'npc', impactX: 20, hit: true, scored: false }],
    }
    act(() => transport.emit('meta', { ...playing, racers: [], crosshairs: [] }))
    act(() => transport.emit('view', playing))
    expect(document.querySelectorAll('.migration-crosshair')).toHaveLength(2)
    expect(screen.getByLabelText('Kill feed').textContent).toContain('James▸NPC 3')
    expect(document.querySelector('.migration-sprint').style.getPropertyValue('--stamina')).toBe('0.4')
    expect(document.querySelector('.migration-sprint').className).toContain('exhausted')
    act(() => transport.emit('event', { payload: playing.shots[0] }))
    expect(document.querySelector('.migration-track').className).toContain('effect-shooter')
    expect(document.querySelector('.migration-hit-flash.shooter').dataset.eventId).toBe('shot-1')
  })

  it('shows authoritative results and lets only the host advance', () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    const racers = Array.from({ length: 20 }, (_, index) => ({
      laneId: index + 1,
      progress: 30,
      movementMode: 'stopped',
      eliminated: false,
      revealedName: index === 6 ? 'James' : '',
    }))
    act(() => transport.emit('view', { ...lobby, phase: 'roundOver', racers, winner: { name: 'James', type: 'human', laneId: 7 } }))
    fireEvent.click(screen.getByRole('button', { name: 'Next round' }))
    expect(transport.nextRound).toHaveBeenCalledOnce()
    expect(screen.getByText('James wins')).toBeTruthy()
    expect(screen.getByText('Human winner. Racers revealed.')).toBeTruthy()
    expect(document.querySelectorAll('.migration-racer')).toHaveLength(20)
    expect(document.querySelector('.migration-reveal-name').textContent).toBe('James')
  })

  it('restarts gameplay music on later rounds and keeps mute outside the track', () => {
    const oscillators = []
    installAudioContextMock(oscillators)
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    const playing = { ...lobby, phase: 'playing', racers: [], players: [{ ...lobby.players[0], ready: true }] }

    act(() => transport.emit('view', playing))
    expect(oscillators).toHaveLength(6)
    expect(oscillators.slice(0, 4).every(oscillator => oscillator.type === 'sine')).toBe(true)
    expect(oscillators[4].type).toBe('triangle')
    expect(screen.getByRole('button', { name: 'Mute sound' }).closest('.migration-track')).toBeNull()
    act(() => transport.emit('view', { ...playing, phase: 'roundOver' }))
    expect(oscillators.slice(0, 6).every(oscillator => oscillator.stop.mock.calls.length === 1)).toBe(true)
    act(() => transport.emit('view', { ...playing, round: 2 }))
    expect(oscillators).toHaveLength(12)
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

  it('leaves an inactive browser session after twenty minutes', async () => {
    vi.useFakeTimers()
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    act(() => transport.emit('view', lobby))

    await act(() => vi.advanceTimersByTimeAsync(20 * 60 * 1000))

    expect(transport.leave).toHaveBeenCalledOnce()
    expect(screen.getByText('Enter the race')).toBeTruthy()
  })

  it('shows the server closure reason and a return-to-menu action', () => {
    const transport = new FakeTransport()
    render(<ColyseusApp transport={transport} />)
    act(() => transport.emit('view', lobby))
    act(() => transport.emit('closed', { reason: 'host-left', message: 'The host left the room' }))

    expect(screen.getByText('Room closed')).toBeTruthy()
    expect(screen.getByText('The host left the room')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Return to menu' }))
    expect(screen.getByText('Enter the race')).toBeTruthy()
  })
})
