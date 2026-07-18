export const HIT_WINDOW_PERCENT = 3.5

export function laneFromAimY(aimY, laneCount = 20) {
  const bounded = Math.min(100, Math.max(0, aimY))
  return Math.min(laneCount, Math.floor((bounded / 100) * laneCount) + 1)
}

export function resolveShot({ shooter, runtimes, aimX, aimY, laneCount = 20 }) {
  if (!shooter || !shooter.hasBullet || shooter.eliminated) {
    return { ok: false, error: 'shot-unavailable' }
  }
  shooter.hasBullet = false
  const laneId = laneFromAimY(aimY, laneCount)
  const victim = [...runtimes.values()].find(runtime => runtime.laneId === laneId)
  const hit = Boolean(
    victim &&
    !victim.eliminated &&
    Math.abs(victim.progress - aimX) <= HIT_WINDOW_PERCENT,
  )
  if (!hit) {
    return { ok: true, hit: false, laneId, impactX: aimX, victim: null, scored: false }
  }
  victim.eliminated = true
  victim.requestedMode = 'stopped'
  victim.movementMode = 'stopped'
  const scored = victim.controllerType === 'human' && victim.playerId !== shooter.playerId
  return { ok: true, hit: true, laneId, impactX: victim.progress, victim, scored }
}
