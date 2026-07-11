export const hashString = value => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const createNpcProfile = (lane, npcPattern) => {
  const seed = hashString(`${lane.id}:${lane.progress}:${lane.depth}:${lane.shapeClass}`)
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
  if (tick > (racer.npc.initialDelayTicks ?? 18) && longRoll < 14) {
    return 'stop'
  }
  if (longRoll > 80 || shortRoll > 86) {
    return 'run'
  }
  if (shortRoll < 5) {
    return 'stop'
  }
  return baseStep
}
