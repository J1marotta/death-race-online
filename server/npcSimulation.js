import { MAX_PROGRESS } from './simulation.js'

const NPC_WALK_SPEED = 3
const NPC_RUN_SPEED = 4.5
const NPC_IDLE_SPEED = 1

const ranges = {
  idle: [350, 2200],
  walking: [500, 3500],
  running: [250, 1400],
  stopped: [1600, 5200],
}

const choices = {
  idle: [['walking', 65], ['stopped', 25], ['running', 10]],
  walking: [['walking', 45], ['idle', 25], ['stopped', 15], ['running', 15]],
  running: [['walking', 45], ['idle', 35], ['stopped', 20]],
  stopped: [['walking', 60], ['idle', 25], ['running', 10], ['stopped', 5]],
}

const hash = value => {
  let result = 2166136261
  for (const character of value) {
    result ^= character.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

const nextRandom = runtime => {
  runtime.randomState = (Math.imul(runtime.randomState, 1664525) + 1013904223) >>> 0
  return runtime.randomState / 0x100000000
}

const chooseMode = runtime => {
  const options = choices[runtime.behaviorMode] ?? choices.idle
  let roll = nextRandom(runtime) * 100
  for (const [mode, weight] of options) {
    roll -= weight
    if (roll < 0) return mode
  }
  return options.at(-1)[0]
}

const chooseDuration = (runtime, mode) => {
  const [minimum, maximum] = ranges[mode]
  return minimum + nextRandom(runtime) * (maximum - minimum)
}

export function createNpcRuntime({ laneId, seed, nowMs }) {
  const runtime = {
    playerId: `npc:${laneId}`,
    laneId,
    progress: 0,
    requestedMode: 'stopped',
    movementMode: 'stopped',
    behaviorMode: 'stopped',
    modeEndsAt: 0,
    lastUpdatedAt: nowMs,
    randomState: hash(`${seed}:${laneId}`) || 1,
    speedJitter: 1,
    eliminated: false,
    controllerType: 'npc',
    hasBullet: false,
  }
  runtime.speedJitter = 0.88 + nextRandom(runtime) * 0.24
  runtime.modeEndsAt = nowMs + 1200 + nextRandom(runtime) * 600
  return runtime
}

export function advanceNpcRuntime(runtime, nowMs) {
  if (runtime.eliminated) {
    runtime.movementMode = 'stopped'
    runtime.lastUpdatedAt = nowMs
    return runtime
  }
  let cursor = runtime.lastUpdatedAt
  while (cursor < nowMs) {
    const segmentEnd = Math.min(nowMs, runtime.modeEndsAt)
    const elapsedSeconds = Math.max(0, segmentEnd - cursor) / 1000
    const speed = runtime.behaviorMode === 'running'
      ? NPC_RUN_SPEED
      : runtime.behaviorMode === 'walking'
        ? NPC_WALK_SPEED
        : runtime.behaviorMode === 'idle'
          ? NPC_IDLE_SPEED
          : 0
    runtime.progress = Math.min(
      MAX_PROGRESS,
      runtime.progress + speed * runtime.speedJitter * elapsedSeconds,
    )
    cursor = segmentEnd
    if (cursor >= runtime.modeEndsAt) {
      runtime.behaviorMode = chooseMode(runtime)
      runtime.modeEndsAt = cursor + chooseDuration(runtime, runtime.behaviorMode)
    }
  }
  runtime.movementMode = runtime.behaviorMode
  runtime.lastUpdatedAt = nowMs
  return runtime
}
