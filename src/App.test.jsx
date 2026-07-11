import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createNpcProfile, getNpcStep } from './npcBehavior'

const appStyles = readFileSync(join(process.cwd(), 'src', 'App.css'), 'utf8')

const PLAYFIELD_RECT = {
  left: 0,
  top: 0,
  width: 1000,
  height: 1000,
  right: 1000,
  bottom: 1000,
  x: 0,
  y: 0,
  toJSON: () => {},
}

function mockPlayfieldBounds(playfield) {
  vi.spyOn(playfield, 'getBoundingClientRect').mockReturnValue(PLAYFIELD_RECT)
}

function installAudioContextMock(initialState = 'running') {
  const started = []
  const stopped = []
  const contexts = []
  const createContext = () => {
    const context = {
      state: initialState,
      currentTime: 1,
      destination: {},
      resume: vi.fn(() => {
        context.state = 'running'
        return Promise.resolve()
      }),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: {
          exponentialRampToValueAtTime: vi.fn(),
          setValueAtTime: vi.fn(),
        },
      })),
      createOscillator: vi.fn(() => ({
        connect: vi.fn((gain) => gain),
        frequency: {
          setValueAtTime: vi.fn(),
        },
        start: vi.fn((time) => started.push(time)),
        stop: vi.fn((time) => stopped.push(time)),
        type: 'square',
      })),
    }
    contexts.push(context)
    return context
  }
  vi.stubGlobal('AudioContext', vi.fn(function AudioContextMock() {
    return createContext()
  }))
  return {
    get context() {
      return contexts[0]
    },
    get latestContext() {
      return contexts.at(-1)
    },
    contexts,
    started,
    stopped,
  }
}

function startPlaying() {
  return (async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy(),
    )
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByLabelText('Countdown')).toBeTruthy()
    await act(async () => {
      vi.advanceTimersByTime(2200)
      await Promise.resolve()
      await Promise.resolve()
    })
    vi.useRealTimers()
    await waitFor(() => expect(screen.getByText('Playing')).toBeTruthy())
    const playfield = screen.getByLabelText('20 lane race playfield')
    mockPlayfieldBounds(playfield)
    return playfield
  })()
}

function startPlayingWithFakeTimers() {
  return (async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy(),
    )
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByLabelText('Countdown')).toBeTruthy()
    await act(async () => {
      vi.advanceTimersByTime(2200)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByText('Playing')).toBeTruthy()
    const playfield = screen.getByLabelText('20 lane race playfield')
    mockPlayfieldBounds(playfield)
    return playfield
  })()
}

describe('game controls', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.history.pushState({}, '', '/')
    let currentPhase = 'lobby'
    let currentRound = 1
    let currentShotRacerIds = []
    let currentWinner = null
    global.fetch = vi.fn(async (input, options = {}) => {
      const requestUrl = typeof input === 'string' ? input : input.url
      const roomCode = requestUrl.split('/').pop()
      const body = options.body ? JSON.parse(options.body) : {}
      if (body.action === 'countdown') {
        currentPhase = 'countdown'
        currentShotRacerIds = []
        currentWinner = null
      }
      if (body.action === 'playing') {
        currentPhase = 'playing'
      }
      if (body.action === 'shot') {
        currentShotRacerIds = currentShotRacerIds.includes(body.laneId)
          ? currentShotRacerIds
          : [...currentShotRacerIds, body.laneId]
      }
      if (body.action === 'round-over') {
        currentPhase = 'roundOver'
        currentWinner = {
          laneId: body.laneId,
          winnerName: body.winnerName,
          winnerType: body.winnerType,
          finalProgress: body.finalProgress,
        }
      }
      if (body.action === 'scoreboard') {
        currentPhase = 'scoreboard'
      }
      if (body.action === 'next-round') {
        currentPhase = 'countdown'
        currentRound += 1
        currentShotRacerIds = []
        currentWinner = null
      }
      return new Response(
        JSON.stringify({
          room: {
            roomCode,
            phase: currentPhase,
            hostId: 'james',
            round: currentRound,
            players: [
              { name: 'James', id: 'james', role: 'host', connected: true, ready: true },
              { name: 'Mia', id: 'mia', role: 'player', connected: true, ready: true },
            ],
            spectators: [],
            inputs: {
              Mia: {
                movementMode: 'running',
                updatedAt: '2026-07-07T00:00:00.000Z',
              },
            },
            roundState: {
              round: currentRound,
              shotRacerIds: currentShotRacerIds,
              shots:
                body.action === 'shot'
                  ? [{ shooterName: body.playerName, laneId: body.laneId }]
                  : [],
              winner: currentWinner,
              scores: { James: 0, Mia: 0 },
              history: [],
              countdownStartedAt: new Date(Date.now()).toISOString(),
            },
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      )
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('moves the local crosshair to the lane under the mouse', async () => {
    const playfield = await startPlaying()

    fireEvent.mouseMove(playfield, { clientX: 700, clientY: 925 })

    const lane19 = screen.getByTestId('lane-19')
    expect(within(lane19).getByTestId('local-crosshair')).toBeTruthy()
    expect(screen.getByTestId('local-crosshair').style.left).toBe('70%')
  })

  it('shows controls below the playfield', async () => {
    await startPlaying()

    const controls = screen.getByLabelText('Controls')
    expect(within(controls).getByText('Space to walk.')).toBeTruthy()
    expect(within(controls).getByText('Left shift to run.')).toBeTruthy()
    expect(within(controls).getByText('Mouse to aim and shoot.')).toBeTruthy()
    expect(within(controls).getByText('You only get one bullet.')).toBeTruthy()
    expect(controls.closest('.playfield')).toBeNull()
  })

  it('keeps the crosshair origin aligned with the pointer edge', async () => {
    const playfield = await startPlaying()

    fireEvent.mouseMove(playfield, { clientX: 0, clientY: 925 })

    expect(screen.getByTestId('local-crosshair').style.left).toBe('0%')
  })

  it('does not eliminate a racer when clicking away from the racer body', async () => {
    const playfield = await startPlaying()

    fireEvent.mouseDown(playfield, { clientX: 900, clientY: 925 })

    expect(screen.queryByText('down')).toBeNull()
  })

  it('does not highlight a racer when the crosshair is over the target', async () => {
    const playfield = await startPlaying()
    const lane19 = screen.getByTestId('lane-19')
    const racer19 = screen.getByTestId('racer-19')
    const progress = Number.parseFloat(racer19.style.getPropertyValue('--racer-progress'))

    fireEvent.mouseMove(playfield, {
      clientX: (progress / 100) * 1000,
      clientY: 925,
    })

    expect(lane19.className).not.toContain('targeted')
    expect(racer19.className).not.toContain('targeted')
  })

  it('shows a pixel bullet on the crosshair before firing', async () => {
    await startPlaying()

    expect(screen.getByTestId('local-crosshair').querySelector('.crosshair-bullet')).toBeTruthy()
  })

  it('dims the local crosshair after firing instead of hiding it', async () => {
    const playfield = await startPlaying()

    fireEvent.mouseDown(playfield, { clientX: 900, clientY: 925 })

    const crosshair = screen.getByTestId('local-crosshair')
    expect(crosshair.className).toContain('crosshair-spent')
    expect(crosshair.style.left).toBe('90%')
    expect(crosshair.querySelector('.crosshair-bullet')).toBeNull()
  })

  it('eliminates a racer only when the shot is near that racer', async () => {
    const playfield = await startPlaying()

    const lane19 = screen.getByTestId('lane-19')
    const racer19 = screen.getByTestId('racer-19')
    const progress = Number.parseFloat(racer19.style.getPropertyValue('--racer-progress'))

    fireEvent.mouseDown(playfield, {
      clientX: (progress / 100) * 1000,
      clientY: 925,
    })

    await waitFor(() => expect(within(lane19).getByText('down')).toBeTruthy())
  })

  it('advances the controlled racer while the walk key is held', async () => {
    const playfield = await startPlaying()
    vi.useFakeTimers()
    const controlledLane = screen
      .getByTestId('local-crosshair')
      .closest('[data-testid^="lane-"]')
    const racer = controlledLane.querySelector('[data-testid^="racer-"]')
    const startingProgress = racer.style.getPropertyValue('--racer-progress')

    fireEvent.keyDown(window, { code: 'Space' })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    fireEvent.keyUp(window, { code: 'Space' })

    const startingValue = Number.parseFloat(startingProgress)
    const endingValue = Number.parseFloat(racer.style.getPropertyValue('--racer-progress'))

    expect(racer.style.getPropertyValue('--racer-progress')).not.toBe(
      startingProgress,
    )
    expect(endingValue - startingValue).toBeGreaterThan(0.3)
    expect(playfield).toBeTruthy()
  })

  it('advances the controlled racer faster while running than walking', async () => {
    await startPlaying()
    vi.useFakeTimers()
    const controlledLane = screen
      .getByTestId('local-crosshair')
      .closest('[data-testid^="lane-"]')
    const racer = controlledLane.querySelector('[data-testid^="racer-"]')

    const walkStart = Number.parseFloat(racer.style.getPropertyValue('--racer-progress'))
    fireEvent.keyDown(window, { code: 'Space' })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    fireEvent.keyUp(window, { code: 'Space' })
    const walkEnd = Number.parseFloat(racer.style.getPropertyValue('--racer-progress'))

    const runStart = Number.parseFloat(racer.style.getPropertyValue('--racer-progress'))
    fireEvent.keyDown(window, { code: 'ShiftLeft' })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    fireEvent.keyUp(window, { code: 'ShiftLeft' })
    const runEnd = Number.parseFloat(racer.style.getPropertyValue('--racer-progress'))

    expect(runEnd - runStart).toBeGreaterThan((walkEnd - walkStart) * 1.9)
  })

  it('shows a straight checkered finish line on the playfield', async () => {
    const playfield = await startPlaying()

    expect(screen.getByTestId('finish-line')).toBeTruthy()
    expect(playfield.querySelector('.finish-flag')).toBeNull()
  })

  it('gives NPCs staggered behavior cycle timing', () => {
    const pattern = ['walk', 'idle', 'stop', 'walk']
    const profiles = Array.from({ length: 12 }, (_, index) =>
      createNpcProfile(
        {
          id: index + 1,
          progress: 7 + index,
          depth: Math.floor(index / 4),
          shapeClass: `shape-${index % 8}`,
        },
        pattern,
      ),
    )

    expect(new Set(profiles.map((profile) => profile.cycleTicks)).size).toBeGreaterThan(3)
    expect(new Set(profiles.map((profile) => profile.longCycleTicks)).size).toBeGreaterThan(3)
    expect(new Set(profiles.map((profile) => profile.shortCycleTicks)).size).toBeGreaterThan(3)

    const firstCycleChangeTicks = profiles.map((profile, index) => {
      const racer = { id: index + 1, npc: profile }
      const startingStep = getNpcStep(racer, 0, 'test-room')
      for (let tick = 1; tick < 40; tick += 1) {
        if (getNpcStep(racer, tick, 'test-room') !== startingStep) {
          return tick
        }
      }
      return 40
    })
    expect(new Set(firstCycleChangeTicks).size).toBeGreaterThan(2)
  })

  it('keeps the finish line behind larger racers without forcing a taller page', () => {
    expect(appStyles).toMatch(/\.finish-line\s*{[\s\S]*z-index:\s*1;/)
    expect(appStyles).toMatch(/\.lane\s*{[\s\S]*z-index:\s*2;/)
    expect(appStyles).toMatch(/\.racer\s*{[\s\S]*--racer-scale:\s*1\.2;/)
    expect(appStyles).toMatch(/\.playfield\s*{[\s\S]*height:\s*520px;/)
    expect(appStyles).toMatch(
      /\.hero-panel\.game-focused \.playfield\s*{[\s\S]*height:\s*clamp\(520px,\s*calc\(100svh - 220px\),\s*620px\);/,
    )
  })

  it('lets NPC racers cross the visible finish line and end the round', async () => {
    await startPlayingWithFakeTimers()

    act(() => {
      vi.advanceTimersByTime(70000)
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    vi.useRealTimers()

    await waitFor(() =>
      expect(
        fetch.mock.calls.some(([, options]) => {
          if (!options?.body) {
            return false
          }
          const body = JSON.parse(options.body)
          return (
            body.action === 'round-over' &&
            body.winnerType === 'npc' &&
            body.finalProgress >= 93
          )
        }),
      ).toBe(true),
    )
  })

  it('resumes audio and plays the start cue when the next round begins', async () => {
    const audio = installAudioContextMock()
    await startPlayingWithFakeTimers()

    act(() => {
      vi.advanceTimersByTime(70000)
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    vi.useRealTimers()

    fireEvent.click(await screen.findByRole('button', { name: 'Scoreboard' }))
    const nextRoundButton = await screen.findByRole('button', { name: 'Next round' })
    const startedBeforeNextRound = audio.started.length
    audio.context.state = 'suspended'

    fireEvent.click(nextRoundButton)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(audio.context.resume).toHaveBeenCalled()
    expect(audio.started.length - startedBeforeNextRound).toBe(3)
    expect(screen.getByLabelText('Countdown')).toBeTruthy()
  })

  it('recreates audio after the game starts if the browser closed the context', async () => {
    const audio = installAudioContextMock()
    const playfield = await startPlayingWithFakeTimers()
    const startedBeforeShot = audio.started.length
    audio.context.state = 'closed'

    fireEvent.mouseDown(playfield, { clientX: 900, clientY: 925 })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(audio.contexts).toHaveLength(2)
    expect(audio.latestContext.state).toBe('running')
    expect(audio.started.length - startedBeforeShot).toBe(2)
  })

  it('keeps between-round panels free of repeated room details', async () => {
    await startPlayingWithFakeTimers()

    act(() => {
      vi.advanceTimersByTime(70000)
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    vi.useRealTimers()

    await screen.findByLabelText('Winner reveal')
    expect(screen.queryByLabelText('Room status')).toBeNull()
    expect(screen.queryByLabelText('Round setup')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Scoreboard' }))
    await screen.findByLabelText('Scoreboard')
    expect(screen.queryByLabelText('Room status')).toBeNull()
    expect(screen.queryByLabelText('Round setup')).toBeNull()
  })

  it('uses the room code from a shareable join link', async () => {
    window.history.pushState({}, '', '/join/ABCD')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(fetch.mock.calls[0][0]).not.toContain('/api/rooms/ABCD')
    expect(fetch.mock.calls[0][0]).toContain('/api/rooms/DR-')
  })

  it('lets the join button use the room code field', async () => {
    render(<App />)
    const roomCodeField = screen.getByLabelText('Room code')
    fireEvent.change(roomCodeField, { target: { value: 'WXYZ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Join lobby' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms/WXYZ'),
        expect.any(Object),
      ),
    )
  })

  it('shows a loading state while creating a lobby', async () => {
    let resolveFetch
    global.fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve(
              new Response(
                JSON.stringify({
                  room: {
                    roomCode: 'DR-LOAD',
                    phase: 'lobby',
                    hostId: 'james',
                    round: 1,
                    players: [
                      {
                        name: 'James',
                        id: 'james',
                        role: 'host',
                        connected: true,
                        ready: false,
                      },
                    ],
                    spectators: [],
                    inputs: {},
                  },
                }),
                {
                  status: 201,
                  headers: {
                    'content-type': 'application/json',
                  },
                },
              ),
            )
        }),
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    expect(screen.getByRole('button', { name: 'Creating lobby' }).disabled).toBe(true)
    resolveFetch()
    await screen.findByLabelText('Real players')
  })

  it('shows an error when joining a missing room', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )
    render(<App />)
    fireEvent.change(screen.getByLabelText('Room code'), {
      target: { value: 'NOPE' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Join lobby' }))

    await waitFor(() => expect(screen.getByLabelText('Room error')).toBeTruthy())
    expect(screen.getByText('Room not found')).toBeTruthy()
  })

  it('shows a closed-room state when the host leaves or the room expires', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Room closed', destroyed: true }), {
        status: 410,
        headers: {
          'content-type': 'application/json',
        },
      }),
    )
    render(<App />)
    fireEvent.change(screen.getByLabelText('Room code'), {
      target: { value: 'DONE' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Join lobby' }))

    const roomError = await screen.findByLabelText('Room error')
    expect(within(roomError).getAllByText('Room closed')).toHaveLength(2)
    expect(within(roomError).getByText('Back to menu')).toBeTruthy()
  })

  it('shows room overview in the top bar once the lobby exists', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    const roomOverview = await screen.findByLabelText('Room overview')
    expect(within(roomOverview).getByText('Connected')).toBeTruthy()
    expect(within(roomOverview).getByText('Ready')).toBeTruthy()
  })

  it('shows connected real players in the lobby', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    const realPlayers = await screen.findByLabelText('Real players')
    expect(realPlayers).toBeTruthy()
    expect(within(realPlayers).getByLabelText('Your player name').value).toBe('James')
    expect(within(realPlayers).getByText('Mia')).toBeTruthy()
  })

  it('does not show the transport sync state in the status strip', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    await screen.findByLabelText('Room overview')

    expect(screen.queryByText('Sync')).toBeNull()
  })

  it('keeps a 20-racer playfield from the synced room roster once playing', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }))
    await screen.findByLabelText('Countdown')

    expect(screen.getAllByTestId(/^lane-/)).toHaveLength(20)
  })

  it('renames the current lobby player through the real players list', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    const nameInput = await screen.findByLabelText('Your player name')
    fireEvent.change(nameInput, { target: { value: 'Jules' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(
        fetch.mock.calls.some(([, options]) => {
          if (!options?.body) {
            return false
          }
          const body = JSON.parse(options.body)
          return (
            body.action === 'rename' &&
            body.playerName === 'James' &&
            body.nextPlayerName === 'Jules'
          )
        }),
      ).toBe(true),
    )
  })

  it('hides the lobby panel once the game starts', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }))
    await screen.findByLabelText('Countdown')

    expect(screen.queryByLabelText('Lobby controls')).toBeNull()
    expect(screen.getByLabelText('20 lane race playfield')).toBeTruthy()
  })

  it('does not show the start button to joined non-host players', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Player name'), {
      target: { value: 'Mia' },
    })
    fireEvent.change(screen.getByLabelText('Room code'), {
      target: { value: 'WXYZ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Join lobby' }))

    await screen.findByLabelText('Host start status')
    expect(screen.queryByRole('button', { name: 'Start game' })).toBeNull()
    expect(screen.getByText('Waiting for host')).toBeTruthy()
  })

  it('marks the joined username ready', async () => {
    global.fetch = vi.fn(async (input, options = {}) => {
      const requestUrl = typeof input === 'string' ? input : input.url
      const roomCode = requestUrl.split('/').pop()
      const body = options.body ? JSON.parse(options.body) : {}
      return new Response(
        JSON.stringify({
          room: {
            roomCode,
            phase: 'lobby',
            hostId: 'james',
            players: [
              { name: 'James', id: 'james', role: 'host', connected: true, ready: true },
              {
                name: 'Mia',
                id: 'mia',
                role: 'player',
                connected: true,
                ready: body.action === 'ready',
              },
            ],
            spectators: [],
            inputs: {},
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      )
    })

    render(<App />)
    fireEvent.change(screen.getByLabelText('Player name'), {
      target: { value: 'Mia' },
    })
    fireEvent.change(screen.getByLabelText('Room code'), {
      target: { value: 'WXYZ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Join lobby' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Ready up' }))

    await waitFor(() =>
      expect(
        fetch.mock.calls.some(([, options]) => {
          if (!options?.body) {
            return false
          }
          const body = JSON.parse(options.body)
          return body.action === 'ready' && body.playerName === 'Mia'
        }),
      ).toBe(true),
    )
  })

  it('does not leave the room while starting the game', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }))
    await screen.findByLabelText('Countdown')

    const postedActions = fetch.mock.calls
      .map(([, options]) => {
        if (!options?.body) {
          return null
        }
        return JSON.parse(options.body).action
      })
      .filter(Boolean)

    expect(postedActions).toContain('countdown')
    expect(postedActions).not.toContain('leave')
  })
})
