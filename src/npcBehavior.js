export const hashString = value => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// Sprints come in short bursts: whenever any source says run, a seeded duty
// cycle lets it through for at most SPRINT_BURST_TICKS in a row (about half
// a second) and downgrades the rest of the window to a walk.
export const SPRINT_WINDOW_TICKS = 12
export const SPRINT_BURST_TICKS = 3

export const createNpcProfile = (lane, npcPattern) => {
  const seed = hashString(`${lane.id}:${lane.progress}:${lane.depth}:${lane.shapeClass}`)
  const moveCadenceTicks = 1 + ((seed >>> 2) % 4)
  return {
    pattern: npcPattern,
    offset: lane.id % npcPattern.length,
    cycleTicks: 8 + (seed % 9),
    cycleOffsetTicks: (seed >>> 4) % 17,
    longCycleTicks: 23 + ((seed >>> 8) % 21),
    longCycleOffsetTicks: (seed >>> 13) % 31,
    shortCycleTicks: 4 + ((seed >>> 18) % 7),
    shortCycleOffsetTicks: (seed >>> 23) % 11,
    initialDelayTicks: 8 + ((seed >>> 27) % 9),
    moveCadenceTicks,
    movePhaseTicks: (seed >>> 11) % moveCadenceTicks,
    sprintPhaseTicks: (seed >>> 9) % SPRINT_WINDOW_TICKS,
    startStaggerTicks: (seed >>> 21) % 6,
    speedJitter: 0.88 + ((seed >>> 15) % 25) / 100,
    bobDelayMs: (seed >>> 19) % 900,
    idleBobMs: 620 + ((seed >>> 23) % 220),
    walkBobMs: 470 + ((seed >>> 27) % 130),
    runBobMs: 290 + ((seed >>> 30) % 90),
  }
}

export const getNpcStep = (racer, tick, seedParts) => {
  const cycleTick = tick + (racer.npc.cycleOffsetTicks ?? 0)
  const baseStep =
    racer.npc.pattern[
      (Math.floor(cycleTick / (racer.npc.cycleTicks ?? 12)) + racer.npc.offset) %
        racer.npc.pattern.length
    ]
  const longBlock = Math.floor(
    (tick + (racer.npc.longCycleOffsetTicks ?? 0)) / (racer.npc.longCycleTicks ?? 28)
  )
  const shortBlock = Math.floor(
    (tick + (racer.npc.shortCycleOffsetTicks ?? 0)) / (racer.npc.shortCycleTicks ?? 5)
  )
  const longRoll = hashString(`${seedParts}:${racer.id}:long:${longBlock}`) % 100
  const shortRoll = hashString(`${seedParts}:${racer.id}:short:${shortBlock}`) % 100
  // Burst rolls sit ON TOP of the pattern, so they are rare: they used to
  // force multi-second sprints 28% of the time, which made the crowd race.
  let step = baseStep
  if (longRoll > 85 || shortRoll > 92) {
    step = 'run'
  } else if (shortRoll < 6) {
    step = 'stop'
  }
  if (step !== 'run') {
    return step
  }
  // Sprint duty cycle: a run is only honored during the burst slice of each
  // window, so no NPC sprints longer than SPRINT_BURST_TICKS in a row.
  const sprintPhase =
    (tick + (racer.npc.sprintPhaseTicks ?? 0)) % SPRINT_WINDOW_TICKS
  return sprintPhase < SPRINT_BURST_TICKS ? 'run' : 'walk'
}
