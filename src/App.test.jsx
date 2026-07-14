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
import { createNpcProfile, getNpcStep, SPRINT_BURST_TICKS } from './npcBehavior'

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
    let currentShots = []
    let currentWinner = null
    global.fetch = vi.fn(async (input, options = {}) => {
      const requestUrl = typeof input === 'string' ? input : input.url
      const roomCode = requestUrl.split('/').pop()
      const body = options.body ? JSON.parse(options.body) : {}
      if (body.action === 'countdown') {
        currentPhase = 'countdown'
        currentShotRacerIds = []
        currentShots = []
        currentWinner = null
      }
      if (body.action === 'playing') {
        currentPhase = 'playing'
      }
      if (body.action === 'shot') {
        currentShotRacerIds = currentShotRacerIds.includes(body.laneId)
          ? currentShotRacerIds
          : [...currentShotRacerIds, body.laneId]
        currentShots = [
          ...currentShots,
          { shooterName: body.playerName, laneId: body.laneId },
        ]
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
        currentShots = []
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
              shots: currentShots,
              winner: currentWinner,
              scores: { James: 0, Mia: 0 },
              kills: { James: 0, Mia: 0 },
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

  it('shows kbd control buttons below the playfield', async () => {
    await startPlaying()

    const controls = screen.getByLabelText('Controls')
    expect(within(controls).getByText('Walk')).toBeTruthy()
    expect(within(controls).getByText('Sprint')).toBeTruthy()
    expect(within(controls).getByText('Aim · Fire')).toBeTruthy()
    expect(within(controls).getByLabelText('Right arrow key').tagName).toBe('KBD')
    expect(within(controls).getByLabelText('Space bar').tagName).toBe('KBD')
    expect(within(controls).getByLabelText('Left mouse button').tagName).toBe('KBD')
    expect(controls.closest('.playfield')).toBeNull()
  })

  it('depresses the walk and sprint keys while held and releases them', async () => {
    await startPlaying()

    fireEvent.keyDown(window, { code: 'ArrowRight' })
    expect(screen.getByTestId('control-walk').className).toContain('held')
    expect(screen.getByTestId('control-sprint').className).not.toContain('held')

    fireEvent.keyDown(window, { code: 'Space' })
    expect(screen.getByTestId('control-sprint').className).toContain('held')

    fireEvent.keyUp(window, { code: 'ArrowRight' })
    fireEvent.keyUp(window, { code: 'Space' })
    expect(screen.getByTestId('control-walk').className).not.toContain('held')
    expect(screen.getByTestId('control-sprint').className).not.toContain('held')
  })

  it('dims the control buttons during the countdown and ignores presses', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }))
    await screen.findByLabelText('Countdown')

    fireEvent.keyDown(window, { code: 'ArrowRight' })
    expect(screen.getByTestId('control-walk').className).toContain('locked')
    expect(screen.getByTestId('control-walk').className).not.toContain('held')
  })

  it('greys the fire button and removes the bullet pip after firing', async () => {
    const playfield = await startPlaying()

    expect(screen.getByTestId('control-fire').querySelector('.control-bullet')).toBeTruthy()

    fireEvent.mouseDown(playfield, { clientX: 900, clientY: 925 })

    expect(screen.getByTestId('control-fire').className).toContain('spent')
    expect(screen.getByTestId('control-fire').querySelector('.control-bullet')).toBeNull()
  })

  it('leaves spaces alone while typing in name fields', async () => {
    render(<App />)
    const nameInput = screen.getByLabelText('Player name')

    // fireEvent returns false when preventDefault was called.
    expect(fireEvent.keyDown(nameInput, { code: 'Space', key: ' ' })).toBe(true)
  })

  it('keeps a clear sound toggle outside the playfield', async () => {
    const playfield = await startPlaying()
    const muteButton = screen.getByRole('button', { name: 'Mute sound' })

    expect(muteButton.closest('.playfield')).toBeNull()
    expect(playfield.contains(muteButton)).toBe(false)

    fireEvent.click(muteButton)
    expect(screen.getByRole('button', { name: 'Unmute sound' })).toBeTruthy()
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

    await waitFor(() => expect(within(lane19).getByText(/down/)).toBeTruthy())
  })

  it('credits the corpse marker with the killer name', async () => {
    const playfield = await startPlaying()

    const lane19 = screen.getByTestId('lane-19')
    const racer19 = screen.getByTestId('racer-19')
    const progress = Number.parseFloat(racer19.style.getPropertyValue('--racer-progress'))

    fireEvent.mouseDown(playfield, {
      clientX: (progress / 100) * 1000,
      clientY: 925,
    })

    await waitFor(() =>
      expect(within(lane19).getByText('down · James')).toBeTruthy(),
    )
  })

  it('keeps eliminated racers frozen where the shot landed', async () => {
    const playfield = await startPlayingWithFakeTimers()
    const readProgress = (racer) =>
      Number.parseFloat(racer.style.getPropertyValue('--racer-progress'))
    const npcRacers = screen
      .getAllByTestId(/^racer-/)
      .filter((racer) => racer.className.includes('npc-bobbing'))
    const startProgressByRacer = new Map(
      npcRacers.map((racer) => [racer, readProgress(racer)]),
    )

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    // NPC pacing is seeded per room code, so any single lane may legally idle
    // through this window — shoot whichever NPC has moved the furthest.
    const target = npcRacers
      .map((racer) => ({
        racer,
        laneId: Number(racer.dataset.testid.replace('racer-', '')),
        hitProgress: readProgress(racer),
        moved: readProgress(racer) - startProgressByRacer.get(racer),
      }))
      .sort((a, b) => b.moved - a.moved)[0]
    expect(target.moved).toBeGreaterThan(0)
    const { racer: targetRacer, laneId, hitProgress } = target

    fireEvent.mouseDown(playfield, {
      clientX: (hitProgress / 100) * 1000,
      clientY: (laneId - 0.5) * 50,
    })
    // Flush the deferred render after a long fake-timer advance before
    // letting the round keep running.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const frozenProgress = readProgress(targetRacer)
    expect(targetRacer.className).toContain('dead')
    expect(frozenProgress).toBeCloseTo(hitProgress, 1)
  })

  it('pops a bouncing KO marker with the killer name for a moment', async () => {
    const playfield = await startPlayingWithFakeTimers()
    const racer19 = screen.getByTestId('racer-19')
    const progress = Number.parseFloat(
      racer19.style.getPropertyValue('--racer-progress'),
    )

    fireEvent.mouseDown(playfield, {
      clientX: (progress / 100) * 1000,
      clientY: 925,
    })

    const koMarker = screen.getByTestId('ko-19')
    expect(koMarker.textContent).toContain('KO!')
    expect(koMarker.textContent).toContain('James')

    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.queryByTestId('ko-19')).toBeNull()
  })

  it('shakes and flashes the playfield when the local shot lands', async () => {
    const playfield = await startPlayingWithFakeTimers()
    // Lane assignments are seeded per room code, so a fixed lane could be a
    // human (or the local player, whose death shakes differently) — target a
    // guaranteed NPC.
    const npcRacer = screen
      .getAllByTestId(/^racer-/)
      .find((racer) => racer.className.includes('npc-bobbing'))
    const laneId = Number(npcRacer.dataset.testid.replace('racer-', ''))
    const progress = Number.parseFloat(
      npcRacer.style.getPropertyValue('--racer-progress'),
    )

    fireEvent.mouseDown(playfield, {
      clientX: (progress / 100) * 1000,
      clientY: (laneId - 0.5) * 50,
    })

    expect(playfield.className).toContain('shake-shooter')
    expect(screen.getByTestId('playfield-flash').className).toContain('flash-shooter')

    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(playfield.className).not.toContain('shake-shooter')
    expect(screen.queryByTestId('playfield-flash')).toBeNull()
  })

  it('gives the victim a big shake and red flash when their racer dies', async () => {
    const playfield = await startPlayingWithFakeTimers()
    const controlledLane = screen
      .getByTestId('local-crosshair')
      .closest('[data-testid^="lane-"]')
    const racer = controlledLane.querySelector('[data-testid^="racer-"]')
    const laneId = Number(controlledLane.dataset.testid.replace('lane-', ''))
    const progress = Number.parseFloat(
      racer.style.getPropertyValue('--racer-progress'),
    )

    fireEvent.mouseDown(playfield, {
      clientX: (progress / 100) * 1000,
      clientY: (laneId - 0.5) * 50,
    })

    expect(playfield.className).toContain('shake-victim')
    expect(screen.getByTestId('playfield-flash').className).toContain('flash-victim')
  })

  it('shows kills in the kill feed and fades them out', async () => {
    const playfield = await startPlayingWithFakeTimers()
    const npcRacer = screen
      .getAllByTestId(/^racer-/)
      .find((racer) => racer.className.includes('npc-bobbing'))
    const laneId = Number(npcRacer.dataset.testid.replace('racer-', ''))
    const progress = Number.parseFloat(
      npcRacer.style.getPropertyValue('--racer-progress'),
    )

    fireEvent.mouseDown(playfield, {
      clientX: (progress / 100) * 1000,
      clientY: (laneId - 0.5) * 50,
    })

    const killFeed = screen.getByLabelText('Kill feed')
    expect(within(killFeed).getByText(/James/)).toBeTruthy()
    expect(within(killFeed).getByText(new RegExp(`NPC ${laneId}`))).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByLabelText('Kill feed')).toBeNull()
  })

  it('shows a kills count for every player on the scoreboard', async () => {
    await startPlayingWithFakeTimers()

    act(() => {
      vi.advanceTimersByTime(70000)
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    vi.useRealTimers()

    const scoreboard = await screen.findByLabelText('Scoreboard')

    expect(within(scoreboard).getAllByText(/\d+ kills/)).toHaveLength(2)
  })

  it('keeps the lane claim on the firing input and aim off periodic inputs', async () => {
    const playfield = await startPlaying()

    fireEvent.mouseDown(playfield, { clientX: 900, clientY: 925 })

    await waitFor(() => {
      const inputBodies = fetch.mock.calls
        .map(([, options]) => (options?.body ? JSON.parse(options.body) : null))
        .filter((body) => body?.action === 'input')
      const firingInput = inputBodies.find((body) => body.firing === true)
      expect(firingInput).toBeTruthy()
      // Firing must not wipe the server-side lane claim used for winner
      // adjudication and kill attribution.
      expect(firingInput.laneId).toBeGreaterThan(0)
      expect(Number.isFinite(firingInput.progress)).toBe(true)
      expect(firingInput.aim).toBeTruthy()
      // Periodic inputs skip aim so mouse movement is not billable traffic.
      const periodicInputs = inputBodies.filter((body) => body.firing !== true)
      expect(periodicInputs.length).toBeGreaterThan(0)
      expect(periodicInputs.every((body) => body.aim === undefined)).toBe(true)
    })
  })

  it('ignores stale old-round snapshots after the host starts the next round', async () => {
    let currentPhase = 'lobby'
    let currentRoundNum = 1
    let shotLanes = []
    let staleResponsesLeft = 0
    global.fetch = vi.fn(async (input, options = {}) => {
      const requestUrl = typeof input === 'string' ? input : input.url
      const roomCode = requestUrl.split('/').pop()
      const body = options.body ? JSON.parse(options.body) : {}
      if (body.action === 'countdown') {
        currentPhase = 'countdown'
        shotLanes = []
      }
      if (body.action === 'playing') {
        currentPhase = 'playing'
      }
      if (body.action === 'shot') {
        shotLanes = [...shotLanes, body.laneId]
      }
      if (body.action === 'round-over') {
        currentPhase = 'roundOver'
      }
      if (body.action === 'next-round') {
        // Simulate an in-flight message from the round that just ended: the
        // next-round response itself is the stale old-round snapshot.
        staleResponsesLeft = 1
        currentRoundNum += 1
        currentPhase = 'countdown'
        shotLanes = []
      }
      const stale = staleResponsesLeft > 0
      if (stale) {
        staleResponsesLeft -= 1
      }
      return new Response(
        JSON.stringify({
          room: {
            roomCode,
            phase: stale ? 'playing' : currentPhase,
            hostId: 'james',
            round: stale ? currentRoundNum - 1 : currentRoundNum,
            roundCount: 5,
            players: [
              { name: 'James', id: 'james', role: 'host', connected: true, ready: true },
            ],
            spectators: [],
            inputs: {},
            roundState: {
              round: stale ? currentRoundNum - 1 : currentRoundNum,
              shotRacerIds: stale ? [7] : shotLanes,
              shots: stale ? [{ shooterName: 'James', laneId: 7 }] : [],
              winner: null,
              scores: { James: 0 },
              kills: { James: 0 },
              history: [],
              countdownStartedAt: new Date(Date.now()).toISOString(),
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    })

    await startPlayingWithFakeTimers()
    act(() => {
      vi.advanceTimersByTime(70000)
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    vi.useRealTimers()

    fireEvent.click(await screen.findByRole('button', { name: 'Next round' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // The stale round-1 snapshot (shotRacerIds [7], phase playing) must be
    // rejected: lane 7 stays alive and the countdown keeps running.
    expect(within(screen.getByTestId('lane-7')).queryByText(/down/)).toBeNull()
    expect(screen.getByTestId('racer-7').className).not.toContain('dead')
    expect(screen.getAllByLabelText('Countdown').length).toBeGreaterThan(0)
  })

  it('stays on the final scores screen after the match completes', async () => {
    // The mock advertises a 1-round match, so the client must adopt the
    // host round count and treat the first round as the last.
    let currentPhase = 'lobby'
    let currentWinner = null
    global.fetch = vi.fn(async (input, options = {}) => {
      const requestUrl = typeof input === 'string' ? input : input.url
      const roomCode = requestUrl.split('/').pop()
      const body = options.body ? JSON.parse(options.body) : {}
      if (body.action === 'countdown') {
        currentPhase = 'countdown'
      }
      if (body.action === 'playing') {
        currentPhase = 'playing'
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
      return new Response(
        JSON.stringify({
          room: {
            roomCode,
            phase: currentPhase,
            hostId: 'james',
            round: 1,
            roundCount: 1,
            players: [
              { name: 'James', id: 'james', role: 'host', connected: true, ready: true },
            ],
            spectators: [],
            inputs: {},
            roundState: {
              round: 1,
              shotRacerIds: [],
              shots: [],
              winner: currentWinner,
              scores: { James: 0 },
              kills: { James: 0 },
              history: [],
              countdownStartedAt: new Date(Date.now()).toISOString(),
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    })

    await startPlayingWithFakeTimers()
    act(() => {
      vi.advanceTimersByTime(70000)
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    vi.useRealTimers()

    // Round 1 of 1: the round-over action is Show final scores, not Next round.
    fireEvent.click(await screen.findByRole('button', { name: 'Show final scores' }))
    await screen.findByText('Final scores')

    // Later roundOver-phase snapshots (heartbeats) must not yank the player
    // back out of the final-scores screen.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByText('Final scores')).toBeTruthy()
    expect(screen.getByText('Game over')).toBeTruthy()
  })

  it('shows a prominent join card on the title screen', () => {
    render(<App />)

    const joinCard = screen.getByLabelText('Join a game')
    expect(joinCard.className).toContain('join-card')
    expect(within(joinCard).getByText('Join a game')).toBeTruthy()
    expect(within(joinCard).getByLabelText('Room code')).toBeTruthy()
    expect(within(joinCard).getByRole('button', { name: 'Join lobby' })).toBeTruthy()
    expect(screen.getByLabelText('Host a game')).toBeTruthy()
  })

  it('retries the playing request when it fails so go cannot freeze', async () => {
    let currentPhase = 'lobby'
    let playingAttempts = 0
    // Fixed per countdown, like the real server — regenerating it per
    // response would restart the countdown clock on every snapshot.
    let countdownStartedAt = new Date(Date.now()).toISOString()
    global.fetch = vi.fn(async (input, options = {}) => {
      const requestUrl = typeof input === 'string' ? input : input.url
      const roomCode = requestUrl.split('/').pop()
      const body = options.body ? JSON.parse(options.body) : {}
      if (body.action === 'countdown') {
        currentPhase = 'countdown'
        countdownStartedAt = new Date(Date.now()).toISOString()
      }
      if (body.action === 'playing') {
        playingAttempts += 1
        if (playingAttempts === 1) {
          // The failure that used to strand every client on "go".
          return new Response(JSON.stringify({ error: 'Room request failed' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
        }
        currentPhase = 'playing'
      }
      return new Response(
        JSON.stringify({
          room: {
            roomCode,
            phase: currentPhase,
            hostId: 'james',
            round: 1,
            roundCount: 5,
            players: [
              { name: 'James', id: 'james', role: 'host', connected: true, ready: true },
            ],
            spectators: [],
            inputs: {},
            roundState: {
              round: 1,
              shotRacerIds: [],
              shots: [],
              winner: null,
              scores: { James: 0 },
              kills: { James: 0 },
              history: [],
              countdownStartedAt,
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    })

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
    await act(async () => {
      vi.advanceTimersByTime(2200)
      await Promise.resolve()
      await Promise.resolve()
    })
    // First playing request failed; the countdown ticker must retry.
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(200)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(playingAttempts).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Playing')).toBeTruthy()
  })

  it('keeps the juice effects gated behind reduced-motion support', () => {
    expect(appStyles).toMatch(/@keyframes ko-bounce/)
    expect(appStyles).toMatch(/@keyframes shake-victim/)
    expect(appStyles).toMatch(/@keyframes shake-shooter/)
    expect(appStyles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*{[\s\S]*\.playfield\.shake-victim/,
    )
  })

  it('advances the controlled racer while the walk key is held', async () => {
    const playfield = await startPlaying()
    vi.useFakeTimers()
    const controlledLane = screen
      .getByTestId('local-crosshair')
      .closest('[data-testid^="lane-"]')
    const racer = controlledLane.querySelector('[data-testid^="racer-"]')
    const startingProgress = racer.style.getPropertyValue('--racer-progress')

    fireEvent.keyDown(window, { code: 'ArrowRight' })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    fireEvent.keyUp(window, { code: 'ArrowRight' })

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
    fireEvent.keyDown(window, { code: 'ArrowRight' })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    fireEvent.keyUp(window, { code: 'ArrowRight' })
    const walkEnd = Number.parseFloat(racer.style.getPropertyValue('--racer-progress'))

    const runStart = Number.parseFloat(racer.style.getPropertyValue('--racer-progress'))
    fireEvent.keyDown(window, { code: 'Space' })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    fireEvent.keyUp(window, { code: 'Space' })
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
    expect(new Set(profiles.map((profile) => profile.moveCadenceTicks)).size).toBeGreaterThan(1)
    expect(new Set(profiles.map((profile) => profile.bobDelayMs)).size).toBeGreaterThan(5)

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

  it('staggers live NPC bobbing and movement cadence', async () => {
    await startPlayingWithFakeTimers()

    const npcRacers = screen
      .getAllByTestId(/^racer-/)
      .filter((racer) => racer.className.includes('npc-bobbing'))
    expect(npcRacers.length).toBeGreaterThan(10)
    expect(npcRacers.every((racer) => racer.style.getPropertyValue('--bob-duration'))).toBe(true)
    expect(new Set(npcRacers.map((racer) => racer.style.getPropertyValue('--bob-delay'))).size)
      .toBeGreaterThan(5)

    // NPCs hold at the line for ~1.5s (+stagger) after go, so sample
    // movement once the crowd is actually racing.
    act(() => {
      vi.advanceTimersByTime(3200)
    })
    const startingProgress = new Map(
      npcRacers.map((racer) => [
        racer.dataset.testid,
        racer.style.getPropertyValue('--racer-progress'),
      ]),
    )
    act(() => {
      vi.advanceTimersByTime(80)
    })
    const movedRacers = npcRacers.filter(
      (racer) =>
        racer.style.getPropertyValue('--racer-progress') !==
        startingProgress.get(racer.dataset.testid),
    )

    expect(movedRacers.length).toBeGreaterThan(0)
    expect(movedRacers.length).toBeLessThan(npcRacers.length)
  })

  it('keeps NPCs idle at the start line for about 1.5 seconds', async () => {
    await startPlayingWithFakeTimers()
    const npcRacers = screen
      .getAllByTestId(/^racer-/)
      .filter((racer) => racer.className.includes('npc-bobbing'))
    const startingProgress = new Map(
      npcRacers.map((racer) => [
        racer.dataset.testid,
        racer.style.getPropertyValue('--racer-progress'),
      ]),
    )

    act(() => {
      vi.advanceTimersByTime(1200)
    })
    const movedTooEarly = npcRacers.filter(
      (racer) =>
        racer.style.getPropertyValue('--racer-progress') !==
        startingProgress.get(racer.dataset.testid),
    )
    expect(movedTooEarly).toHaveLength(0)

    act(() => {
      vi.advanceTimersByTime(2800)
    })
    const movedAfterIdle = npcRacers.filter(
      (racer) =>
        racer.style.getPropertyValue('--racer-progress') !==
        startingProgress.get(racer.dataset.testid),
    )
    expect(movedAfterIdle.length).toBeGreaterThan(0)
  })

  it('never lets an NPC sprint longer than the burst cap', () => {
    // Worst case: a pattern that always wants to run.
    const pattern = ['run', 'run', 'run', 'run', 'run', 'run', 'run']
    for (let laneId = 1; laneId <= 8; laneId += 1) {
      const profile = createNpcProfile(
        {
          id: laneId,
          progress: 7 + laneId,
          depth: Math.floor(laneId / 5),
          shapeClass: `shape-${laneId % 8}`,
        },
        pattern,
      )
      const racer = { id: laneId, npc: profile }
      let streak = 0
      let maxStreak = 0
      for (let tick = 0; tick < 500; tick += 1) {
        if (getNpcStep(racer, tick, 'burst-cap-room') === 'run') {
          streak += 1
          maxStreak = Math.max(maxStreak, streak)
        } else {
          streak = 0
        }
      }
      expect(maxStreak).toBeLessThanOrEqual(SPRINT_BURST_TICKS)
      expect(maxStreak).toBeGreaterThan(0)
    }
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

  it('plays background music during gameplay and stops it when muted', async () => {
    const audio = installAudioContextMock()
    await startPlayingWithFakeTimers()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(audio.started.length).toBeGreaterThanOrEqual(7)
    const startedBeforeMute = audio.started.length
    const stoppedBeforeMute = audio.stopped.length

    fireEvent.click(screen.getByRole('button', { name: 'Mute sound' }))

    expect(screen.getByRole('button', { name: 'Unmute sound' })).toBeTruthy()
    expect(audio.stopped.length).toBeGreaterThan(stoppedBeforeMute)

    fireEvent.click(screen.getByRole('button', { name: 'Unmute sound' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(audio.started.length).toBeGreaterThan(startedBeforeMute)
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

    // The scoreboard now shows alongside the winner reveal with no extra
    // host click; the only action is Next round.
    await screen.findByLabelText('Scoreboard')
    expect(screen.getByRole('button', { name: 'Next round' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Scoreboard' })).toBeNull()
  })

  it('uses the room code from a shareable join link', async () => {
    window.history.pushState({}, '', '/join/ABCD')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(fetch.mock.calls[0][0]).not.toContain('/api/rooms/ABCD')
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/rooms\/DR[A-Z0-9]{4}$/)
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

  it('renders every racer as a cute animal with a pastel palette', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }))
    await screen.findByLabelText('Countdown')

    const racers = screen.getAllByTestId(/^racer-/)
    expect(racers).toHaveLength(20)
    expect(
      racers.every((racer) =>
        /^(Cat|Bunny|Bear|Fox|Frog|Pig|Chick|Mouse) · (Peach|Sky|Mint|Honey|Berry)$/.test(
          racer.title,
        ),
      ),
    ).toBe(true)
    // All 8 species and all 5 palettes appear across the 20 lanes.
    expect(new Set(racers.map((racer) => racer.title.split(' · ')[0])).size).toBe(8)
    expect(new Set(racers.map((racer) => racer.title.split(' · ')[1])).size).toBe(5)
    expect(appStyles).toMatch(/\.archetype-peach\s*{/)
    expect(appStyles).toMatch(/shape-1: bunny/)
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
