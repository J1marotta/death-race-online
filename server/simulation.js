import { randomInt } from 'node:crypto'
import { MOVEMENT_MODES } from '../src/multiplayer/protocol.js'

export const SERVER_TICK_MS = 50
export const WALK_PROGRESS_PER_SECOND = 5
export const RUN_PROGRESS_PER_SECOND = 7.5
export const SPRINT_MAX_MS = 2000
export const SPRINT_REFILL_DELAY_MS = 1000
export const SPRINT_REFILL_MS = 3000
export const FINISH_PROGRESS = 93
export const MAX_PROGRESS = 100
export const COUNTDOWN_DURATION_MS = 3000

const progressFor = (speed, milliseconds) => speed * (milliseconds / 1000)

export function createPlayerRuntime({ playerId, laneId }) {
  return {
    playerId,
    laneId,
    progress: 0,
    requestedMode: 'stopped',
    movementMode: 'stopped',
    staminaMs: SPRINT_MAX_MS,
    exhausted: false,
    eliminated: false,
    controllerType: 'human',
    hasBullet: true,
    lastSprintAt: Number.NEGATIVE_INFINITY,
  }
}

export function setMovementIntent(runtime, movementMode) {
  if (!MOVEMENT_MODES.includes(movementMode) || runtime.eliminated) {
    return false
  }
  runtime.requestedMode = movementMode
  return true
}

export function advancePlayerRuntime(runtime, deltaMs, nowMs) {
  if (runtime.eliminated) {
    runtime.requestedMode = 'stopped'
    runtime.movementMode = 'stopped'
    return runtime
  }

  const dt = Math.max(0, deltaMs)
  let movingMs = dt
  let progressGain = 0
  const wantsRun = runtime.requestedMode === 'running'
  const canRun = wantsRun && !runtime.exhausted && runtime.staminaMs > 0

  if (canRun) {
    const sprintMs = Math.min(runtime.staminaMs, dt)
    progressGain += progressFor(RUN_PROGRESS_PER_SECOND, sprintMs)
    runtime.staminaMs -= sprintMs
    runtime.lastSprintAt = nowMs - (dt - sprintMs)
    movingMs -= sprintMs
    if (runtime.staminaMs === 0) {
      runtime.exhausted = true
    }
  }

  const walks = runtime.requestedMode === 'walking' || (wantsRun && !canRun) || movingMs > 0
  if (walks && runtime.requestedMode !== 'stopped') {
    progressGain += progressFor(WALK_PROGRESS_PER_SECOND, movingMs)
  }

  const actuallyRunning = canRun && movingMs === 0
  runtime.movementMode = runtime.requestedMode === 'stopped'
    ? 'stopped'
    : actuallyRunning
      ? 'running'
      : 'walking'
  runtime.progress = Math.min(MAX_PROGRESS, runtime.progress + progressGain)

  if (!canRun && runtime.staminaMs < SPRINT_MAX_MS) {
    const frameStartedAt = nowMs - dt
    const refillStartedAt = runtime.lastSprintAt + SPRINT_REFILL_DELAY_MS
    const refillMs = Math.max(0, nowMs - Math.max(frameStartedAt, refillStartedAt))
    runtime.staminaMs = Math.min(
      SPRINT_MAX_MS,
      runtime.staminaMs + (refillMs * SPRINT_MAX_MS) / SPRINT_REFILL_MS,
    )
    if (runtime.staminaMs === SPRINT_MAX_MS) {
      runtime.exhausted = false
    }
  }

  return runtime
}

export function eliminatePlayerRuntime(runtime) {
  runtime.eliminated = true
  runtime.requestedMode = 'stopped'
  runtime.movementMode = 'stopped'
}

export function assignSecretLanes(playerIds, laneCount = 20, pickIndex = randomInt) {
  if (playerIds.length > laneCount) {
    throw new Error('Too many players for available lanes')
  }
  const lanes = Array.from({ length: laneCount }, (_, index) => index + 1)
  for (let index = lanes.length - 1; index > 0; index -= 1) {
    const swapIndex = pickIndex(index + 1)
    const current = lanes[index]
    lanes[index] = lanes[swapIndex]
    lanes[swapIndex] = current
  }
  return new Map(playerIds.map((playerId, index) => [playerId, lanes[index]]))
}
