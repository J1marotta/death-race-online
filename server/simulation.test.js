import { describe, expect, it } from 'vitest'
import {
  FINISH_PROGRESS,
  RUN_PROGRESS_PER_SECOND,
  SPRINT_MAX_MS,
  WALK_PROGRESS_PER_SECOND,
  advancePlayerRuntime,
  assignSecretLanes,
  assignSeededLanes,
  createPlayerRuntime,
  eliminatePlayerRuntime,
  setMovementIntent,
} from './simulation.js'

describe('authoritative movement simulation', () => {
  it('advances walking and running from intent at bounded server speeds', () => {
    const walker = createPlayerRuntime({ playerId: 'a', laneId: 1 })
    const runner = createPlayerRuntime({ playerId: 'b', laneId: 2 })
    setMovementIntent(walker, 'walking')
    setMovementIntent(runner, 'running')

    advancePlayerRuntime(walker, 1000, 1000)
    advancePlayerRuntime(runner, 1000, 1000)

    expect(walker.progress).toBe(WALK_PROGRESS_PER_SECOND)
    expect(runner.progress).toBe(RUN_PROGRESS_PER_SECOND)
    expect(runner.staminaMs).toBe(SPRINT_MAX_MS - 1000)
  })

  it('exhausts after two seconds and falls back to walking speed', () => {
    const runtime = createPlayerRuntime({ playerId: 'a', laneId: 1 })
    setMovementIntent(runtime, 'running')

    advancePlayerRuntime(runtime, 2500, 2500)

    expect(runtime.progress).toBe(
      RUN_PROGRESS_PER_SECOND * 2 + WALK_PROGRESS_PER_SECOND * 0.5,
    )
    expect(runtime.staminaMs).toBe(0)
    expect(runtime.exhausted).toBe(true)
    expect(runtime.movementMode).toBe('walking')
  })

  it('keeps sprint locked until the delayed refill reaches full', () => {
    const runtime = createPlayerRuntime({ playerId: 'a', laneId: 1 })
    setMovementIntent(runtime, 'running')
    advancePlayerRuntime(runtime, 2000, 2000)
    setMovementIntent(runtime, 'stopped')

    advancePlayerRuntime(runtime, 999, 2999)
    expect(runtime.staminaMs).toBe(0)
    advancePlayerRuntime(runtime, 3001, 6000)
    expect(runtime.staminaMs).toBe(SPRINT_MAX_MS)
    expect(runtime.exhausted).toBe(false)
  })

  it('is deterministic across different server tick chunk sizes', () => {
    const oneTick = createPlayerRuntime({ playerId: 'a', laneId: 1 })
    const manyTicks = createPlayerRuntime({ playerId: 'a', laneId: 1 })
    setMovementIntent(oneTick, 'walking')
    setMovementIntent(manyTicks, 'walking')

    advancePlayerRuntime(oneTick, 1000, 1000)
    for (let now = 50; now <= 1000; now += 50) {
      advancePlayerRuntime(manyTicks, 50, now)
    }

    expect(manyTicks.progress).toBeCloseTo(oneTick.progress, 10)
    expect(manyTicks.staminaMs).toBe(oneTick.staminaMs)
  })

  it('ignores invalid intent and prevents eliminated racers from moving', () => {
    const runtime = createPlayerRuntime({ playerId: 'a', laneId: 1 })
    expect(setMovementIntent(runtime, 'teleport')).toBe(false)
    setMovementIntent(runtime, 'running')
    eliminatePlayerRuntime(runtime)
    advancePlayerRuntime(runtime, 5000, 5000)

    expect(runtime.progress).toBe(0)
    expect(runtime.movementMode).toBe('stopped')
  })

  it('assigns unique secret lanes using an injectable deterministic shuffle', () => {
    const picks = [0, 1, 2, 3, 4]
    let pick = 0
    const assignments = assignSecretLanes(
      ['a', 'b', 'c', 'd'],
      5,
      upperBound => picks[pick++] % upperBound,
    )

    expect(new Set(assignments.values()).size).toBe(4)
    expect([...assignments.keys()]).toEqual(['a', 'b', 'c', 'd'])
  })

  it('assigns seeded lanes deterministically and fairly from high bits', () => {
    const first = assignSeededLanes(['a', 'b', 'c'], 20, 'DRTEST:1:a,b,c')
    const second = assignSeededLanes(['a', 'b', 'c'], 20, 'DRTEST:1:a,b,c')
    const otherRound = assignSeededLanes(['a', 'b', 'c'], 20, 'DRTEST:2:a,b,c')

    expect([...first.values()]).toEqual([...second.values()])
    expect([...first.values()]).not.toEqual([...otherRound.values()])

    const counts = new Map()
    for (let index = 0; index < 400; index += 1) {
      const lane = assignSeededLanes(['host'], 20, `R${index}:1:host`).get('host')
      counts.set(lane, (counts.get(lane) ?? 0) + 1)
    }
    expect(counts.size).toBe(20)
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(5)
      expect(count).toBeLessThan(40)
    }
  })

  it('can cross the server finish threshold without exceeding the track maximum', () => {
    const runtime = createPlayerRuntime({ playerId: 'a', laneId: 1 })
    runtime.progress = FINISH_PROGRESS - 1
    setMovementIntent(runtime, 'walking')
    advancePlayerRuntime(runtime, 1000, 1000)

    expect(runtime.progress).toBeGreaterThanOrEqual(FINISH_PROGRESS)
    expect(runtime.progress).toBeLessThanOrEqual(100)
  })
})
