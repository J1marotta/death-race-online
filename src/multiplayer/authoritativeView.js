const values = collection => {
  if (!collection) return []
  if (Array.isArray(collection)) return collection
  if (collection instanceof Map) return [...collection.values()]
  return Object.values(collection)
}

export function projectAuthoritativeState(state, privateState = null) {
  return {
    roomCode: state?.roomCode ?? '',
    phase: state?.phase ?? 'menu',
    privacy: state?.privacy ?? 'public',
    round: state?.round ?? 1,
    roundCount: state?.roundCount ?? 5,
    countdownEndsAt: state?.countdownEndsAt ?? 0,
    winner: state?.winnerLaneId
      ? {
          laneId: state.winnerLaneId,
          name: state.winnerName,
          type: state.winnerType,
        }
      : null,
    hostPlayerId: state?.hostPlayerId ?? '',
    localPlayerId: privateState?.playerId ?? '',
    localLaneId: privateState?.laneId ?? 0,
    localCrosshairId: privateState?.crosshairId ?? '',
    localStamina: privateState?.stamina ?? 1,
    localExhausted: privateState?.exhausted ?? false,
    localEliminated: privateState?.eliminated ?? false,
    players: values(state?.players).map(player => ({ ...player })),
    racers: values(state?.racers)
      .map(racer => ({ ...racer }))
      .sort((left, right) => left.laneId - right.laneId),
    crosshairs: values(state?.crosshairs).map(crosshair => ({ ...crosshair })),
    shots: values(state?.shots).map(shot => ({ ...shot })),
  }
}

export function reconcileProgress(current, authoritative, factor = 0.25, snapDistance = 12) {
  const difference = authoritative - current
  if (Math.abs(difference) >= snapDistance) return authoritative
  return current + difference * factor
}

export function predictLocalProgress({ progress, movementMode }, elapsedMs, speeds) {
  const speed = speeds[movementMode] ?? 0
  return Math.min(100, progress + speed * (Math.max(0, elapsedMs) / 1000))
}
