import { hashString } from './npcBehavior'

const LANE_IDS = Array.from({ length: 20 }, (_, index) => index + 1)

export const shuffleWithSeed = (items, seed) => {
  const result = [...items]
  let state = seed || 1
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    // Scale from the high bits: an LCG's low bits cycle with tiny periods
    // (the lowest bit just alternates), so `state % n` produced patterned
    // lane assignments instead of a fair shuffle.
    const swapIndex = Math.floor((state / 4294967296) * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }
  return result
}

// Every client derives the same secret lanes from the same seed parts
// (room code, round, roster), so assignments never need to cross the wire.
export const createHumanAssignments = (players, seedParts, laneIds = LANE_IDS) => {
  const shuffledLaneIds = shuffleWithSeed(laneIds, hashString(seedParts))
  return Object.fromEntries(
    players.slice(0, laneIds.length).map((player, index) => [
      player,
      shuffledLaneIds[index],
    ]),
  )
}
