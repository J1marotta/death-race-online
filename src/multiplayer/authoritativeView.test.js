import { describe, expect, it } from 'vitest'
import {
  predictLocalProgress,
  projectAuthoritativeState,
  reconcileProgress,
} from './authoritativeView.js'

describe('authoritative UI projection', () => {
  it('projects schema maps without inventing player-to-lane identity', () => {
    const view = projectAuthoritativeState({
      roomCode: 'DRTEST',
      phase: 'playing',
      round: 2,
      players: { p1: { id: 'p1', name: 'James', score: 1 } },
      racers: { 7: { laneId: 7, progress: 12 }, 2: { laneId: 2, progress: 8 } },
    }, { playerId: 'p1', laneId: 7 })
    expect(view.players).toEqual([{ id: 'p1', name: 'James', score: 1 }])
    expect(view.racers.map(racer => racer.laneId)).toEqual([2, 7])
    expect(view.localLaneId).toBe(7)
    expect(view.racers.every(racer => !('playerId' in racer))).toBe(true)
  })

  it('smoothly converges ordinary corrections and snaps only large divergence', () => {
    expect(reconcileProgress(10, 14)).toBe(11)
    expect(reconcileProgress(10, 30)).toBe(30)
  })

  it('predicts only from acknowledged movement mode and bounded elapsed time', () => {
    expect(predictLocalProgress({ progress: 10, movementMode: 'walking' }, 1000, { walking: 5 })).toBe(15)
    expect(predictLocalProgress({ progress: 99, movementMode: 'running' }, 1000, { running: 7.5 })).toBe(100)
    expect(predictLocalProgress({ progress: 10, movementMode: 'stopped' }, -100, {})).toBe(10)
  })
})
