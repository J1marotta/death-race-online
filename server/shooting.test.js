import { describe, expect, it } from 'vitest'
import { createPlayerRuntime } from './simulation.js'
import { HIT_WINDOW_PERCENT, laneFromAimY, resolveShot } from './shooting.js'

const runtime = (playerId, laneId, progress = 40) => ({
  ...createPlayerRuntime({ playerId, laneId }),
  controllerType: 'human',
  hasBullet: true,
  progress,
})

describe('authoritative shooting', () => {
  it('maps normalized vertical aim to a bounded lane', () => {
    expect(laneFromAimY(0)).toBe(1)
    expect(laneFromAimY(49.9)).toBe(10)
    expect(laneFromAimY(100)).toBe(20)
  })

  it('hits only inside the shared progress hit window', () => {
    const shooter = runtime('a', 1)
    const victim = runtime('b', 2)
    const runtimes = new Map([['a', shooter], ['b', victim]])
    const result = resolveShot({ shooter, runtimes, aimX: 40 + HIT_WINDOW_PERCENT, aimY: 7 })
    expect(result.hit).toBe(true)
    expect(victim.eliminated).toBe(true)
    expect(result.scored).toBe(true)
  })

  it('spends the only bullet on a miss', () => {
    const shooter = runtime('a', 1)
    const result = resolveShot({ shooter, runtimes: new Map([['a', shooter]]), aimX: 90, aimY: 90 })
    expect(result).toMatchObject({ ok: true, hit: false, scored: false })
    expect(shooter.hasBullet).toBe(false)
    expect(resolveShot({ shooter, runtimes: new Map(), aimX: 0, aimY: 0 })).toEqual({
      ok: false,
      error: 'shot-unavailable',
    })
  })

  it('allows self-elimination without awarding score', () => {
    const shooter = runtime('a', 4)
    const result = resolveShot({ shooter, runtimes: new Map([['a', shooter]]), aimX: 40, aimY: 16 })
    expect(result.hit).toBe(true)
    expect(result.scored).toBe(false)
    expect(shooter.eliminated).toBe(true)
  })

  it('does not score corpse shots or let eliminated shooters fire', () => {
    const shooter = runtime('a', 1)
    const victim = runtime('b', 2)
    victim.eliminated = true
    const result = resolveShot({ shooter, runtimes: new Map([['a', shooter], ['b', victim]]), aimX: 40, aimY: 7 })
    expect(result.hit).toBe(false)
    shooter.eliminated = true
    shooter.hasBullet = true
    expect(resolveShot({ shooter, runtimes: new Map(), aimX: 0, aimY: 0 }).ok).toBe(false)
  })
})
