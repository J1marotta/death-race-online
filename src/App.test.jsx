import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

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

function startPlaying() {
  return (async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start round' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Start round' }))
    const advance = screen.getByRole('button', { name: 'Advance countdown' })
    fireEvent.click(advance)
    fireEvent.click(advance)
    fireEvent.click(advance)
    fireEvent.click(advance)
    const playfield = screen.getByLabelText('20 lane race playfield')
    mockPlayfieldBounds(playfield)
    return playfield
  })()
}

describe('game controls', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.history.pushState({}, '', '/')
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          room: {
            roomCode: 'DR-2048',
            phase: 'lobby',
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
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    )
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('moves the local crosshair to the lane under the mouse', async () => {
    const playfield = await startPlaying()

    fireEvent.mouseMove(playfield, { clientX: 700, clientY: 925 })

    const lane19 = screen.getByTestId('lane-19')
    expect(within(lane19).getByTestId('local-crosshair')).toBeTruthy()
    expect(screen.getByTestId('local-crosshair').style.left).toBe('70%')
  })

  it('does not eliminate a racer when clicking away from the racer body', async () => {
    const playfield = await startPlaying()

    fireEvent.mouseDown(playfield, { clientX: 900, clientY: 925 })

    expect(screen.queryByText('down')).toBeNull()
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

    expect(within(lane19).getByText('down')).toBeTruthy()
  })

  it('advances the controlled racer while the walk key is held', async () => {
    const playfield = await startPlaying()
    vi.useFakeTimers()
    const racer = screen.getByTestId('racer-7')
    const startingProgress = racer.style.getPropertyValue('--racer-progress')

    fireEvent.keyDown(window, { code: 'Space' })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    fireEvent.keyUp(window, { code: 'Space' })

    expect(racer.style.getPropertyValue('--racer-progress')).not.toBe(
      startingProgress,
    )
    expect(playfield).toBeTruthy()
  })

  it('uses the room code from a shareable join link', async () => {
    window.history.pushState({}, '', '/join/ABCD')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms/ABCD'),
        expect.any(Object),
      ),
    )
  })

  it('shows the latest synced room input in the lobby', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }))

    await waitFor(() =>
      expect(screen.getByText('Latest input: Mia running')).toBeTruthy(),
    )
  })
})
