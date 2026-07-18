import { describe, expect, it } from 'vitest'
import { FINISH_PROGRESS } from './simulation.js'
import { advanceNpcRuntime, createNpcRuntime } from './npcSimulation.js'

describe('independent authoritative NPC simulation', () => {
  it('gives every NPC its own decision deadline and personality speed', () => {
    const npcs = Array.from({ length: 10 }, (_, index) =>
      createNpcRuntime({ laneId: index + 1, seed: 'round-1', nowMs: 0 }))
    expect(new Set(npcs.map(npc => Math.round(npc.modeEndsAt))).size).toBeGreaterThan(7)
    expect(new Set(npcs.map(npc => npc.speedJitter.toFixed(3))).size).toBeGreaterThan(7)
  })

  it('changing one NPC deadline cannot alter another NPC decision', () => {
    const first = createNpcRuntime({ laneId: 1, seed: 'round-1', nowMs: 0 })
    const second = createNpcRuntime({ laneId: 2, seed: 'round-1', nowMs: 0 })
    const control = { ...second }
    first.modeEndsAt = 1
    advanceNpcRuntime(first, 1000)
    advanceNpcRuntime(second, 1000)
    advanceNpcRuntime(control, 1000)
    expect(second).toEqual(control)
  })

  it('changes only NPCs whose private deadlines have elapsed', () => {
    const early = createNpcRuntime({ laneId: 1, seed: 'round-1', nowMs: 0 })
    const late = createNpcRuntime({ laneId: 2, seed: 'round-1', nowMs: 0 })
    early.modeEndsAt = 100
    late.modeEndsAt = 5000
    const earlyRandomState = early.randomState
    const lateRandomState = late.randomState
    advanceNpcRuntime(early, 500)
    advanceNpcRuntime(late, 500)
    expect(early.modeEndsAt).toBeGreaterThan(500)
    expect(early.randomState).not.toBe(earlyRandomState)
    expect(late.modeEndsAt).toBe(5000)
    expect(late.randomState).toBe(lateRandomState)
  })

  it('allows deterministic NPCs to cross the finish without shared ticks', () => {
    const npc = createNpcRuntime({ laneId: 1, seed: 'round-1', nowMs: 0 })
    for (let now = 50; now <= 180000 && npc.progress < FINISH_PROGRESS; now += 50) {
      advanceNpcRuntime(npc, now)
    }
    expect(npc.progress).toBeGreaterThanOrEqual(FINISH_PROGRESS)
  })
})
