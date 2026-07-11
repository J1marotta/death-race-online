const MAX_PLAYERS = 20

function createScoreState(players, currentScores = {}) {
  return Object.fromEntries(
    players.map((player) => [player.name, currentScores[player.name] ?? 0]),
  )
}

function createRoundState(room, overrides = {}) {
  const existing = room.roundState ?? {}
  return {
    round: room.round,
    shotRacerIds: [],
    shots: [],
    winner: null,
    scores: createScoreState(room.players, existing.scores),
    history: existing.history ?? [],
    phaseStartedAt: new Date().toISOString(),
    ...overrides,
    updatedAt: new Date().toISOString(),
  }
}

export function toPlayerId(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-')
}

function createPlayerRecord(name, role = 'player') {
  return {
    id: toPlayerId(name),
    name,
    role,
    connected: true,
    ready: false,
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createRoomState({ roomCode, hostName, privacy = 'public', roundCount = 5 }) {
  const host = createPlayerRecord(hostName, 'host')
  return {
    roomCode,
    privacy,
    roundCount,
    hostId: host.id,
    phase: 'lobby',
    players: [host],
    spectators: [],
    round: 1,
    inputs: {},
    roundState: createRoundState({ players: [host], round: 1 }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function joinRoomState(room, playerName) {
  const existingPlayer = room.players.find((player) => player.name === playerName)
  if (existingPlayer) {
    if (existingPlayer.connected) {
      return {
        ...room,
        updatedAt: new Date().toISOString(),
      }
    }
    return {
      ...room,
      players: room.players.map((player) =>
        player.name === playerName
          ? { ...player, connected: true, updatedAt: new Date().toISOString() }
          : player,
      ),
      spectators: room.spectators.filter((spectator) => spectator !== playerName),
      updatedAt: new Date().toISOString(),
    }
  }

  if (room.players.length >= MAX_PLAYERS || room.phase !== 'lobby') {
    return {
      ...room,
      spectators: room.spectators.includes(playerName)
        ? room.spectators
        : [...room.spectators, playerName],
      updatedAt: new Date().toISOString(),
    }
  }

  return {
    ...room,
    players: [...room.players, createPlayerRecord(playerName)],
    updatedAt: new Date().toISOString(),
  }
}

export function setPlayerReadyState(room, playerName, ready = true) {
  return {
    ...room,
    players: room.players.map((player) =>
      player.name === playerName
        ? { ...player, ready, connected: true, updatedAt: new Date().toISOString() }
        : player,
    ),
    updatedAt: new Date().toISOString(),
  }
}

export function renamePlayerState(room, playerName, nextPlayerName) {
  const trimmedName = nextPlayerName?.trim()
  if (!trimmedName || room.phase !== 'lobby') {
    return room
  }

  const player = room.players.find(
    (roomPlayer) => roomPlayer.name === playerName && roomPlayer.connected,
  )
  if (!player) {
    return room
  }

  const nextPlayerId = toPlayerId(trimmedName)
  const nameTaken = room.players.some(
    (roomPlayer) =>
      roomPlayer.name !== playerName &&
      (roomPlayer.name === trimmedName || roomPlayer.id === nextPlayerId),
  )
  if (nameTaken) {
    return room
  }

  const updatedAt = new Date().toISOString()
  const nextInputs = { ...(room.inputs ?? {}) }
  if (nextInputs[playerName]) {
    nextInputs[trimmedName] = nextInputs[playerName]
    delete nextInputs[playerName]
  }

  const existingScores = room.roundState?.scores ?? {}
  const nextScores = { ...existingScores }
  if (Object.hasOwn(nextScores, playerName)) {
    nextScores[trimmedName] = nextScores[playerName]
    delete nextScores[playerName]
  }

  return {
    ...room,
    hostId: room.hostId === player.id ? nextPlayerId : room.hostId,
    inputs: nextInputs,
    players: room.players.map((roomPlayer) =>
      roomPlayer.name === playerName
        ? {
            ...roomPlayer,
            id: nextPlayerId,
            name: trimmedName,
            updatedAt,
          }
        : roomPlayer,
    ),
    roundState: room.roundState
      ? {
          ...room.roundState,
          scores: nextScores,
          updatedAt,
        }
      : room.roundState,
    updatedAt,
  }
}

export function setPlayerHeartbeatState(room, playerName) {
  return {
    ...room,
    players: room.players.map((player) =>
      player.name === playerName
        ? { ...player, connected: true, updatedAt: new Date().toISOString() }
        : player,
    ),
    updatedAt: new Date().toISOString(),
  }
}

export function setPlayerInputState(room, playerName, input = {}) {
  const inputOwner = room.players.find((player) => player.name === playerName && player.connected)
  if (!inputOwner) {
    return room
  }
  return {
    ...room,
    inputs: {
      ...(room.inputs ?? {}),
      [playerName]: {
        ...input,
        updatedAt: new Date().toISOString(),
      },
    },
    players: room.players.map((player) =>
      player.name === playerName
        ? { ...player, updatedAt: new Date().toISOString() }
        : player,
    ),
    updatedAt: new Date().toISOString(),
  }
}

export function pruneDisconnectedPlayers(room, staleAfterMs = 120000) {
  const now = Date.now()
  const updatedAt = new Date().toISOString()
  const playersWithStaleConnections = room.players.map((player) => {
    const lastSeen = player.updatedAt ? Date.parse(player.updatedAt) || 0 : 0
    if (player.connected && now - lastSeen > staleAfterMs) {
      return { ...player, connected: false, ready: false, updatedAt }
    }
    return player
  })
  const nextPlayers = playersWithStaleConnections.filter((player) => {
    if (player.connected) {
      return true
    }
    const lastSeen = player.updatedAt ? Date.parse(player.updatedAt) || 0 : 0
    return now - lastSeen < staleAfterMs
  })

  const removedNames = playersWithStaleConnections
    .filter((player) => !nextPlayers.some((nextPlayer) => nextPlayer.id === player.id))
    .map((player) => player.name)

  return {
    ...room,
    players: nextPlayers,
    spectators: room.spectators.filter((spectator) => !removedNames.includes(spectator)),
    updatedAt: new Date().toISOString(),
  }
}

export function leaveRoomState(room, playerName) {
  const updatedAt = new Date().toISOString()
  const nextPlayers = room.players.map((player) =>
    player.name === playerName ? { ...player, connected: false, ready: false } : player,
  )
  const hostStillConnected = nextPlayers.some(
    (player) => player.role === 'host' && player.connected,
  )
  const nextHost = hostStillConnected
    ? room.hostId
    : nextPlayers.find((player) => player.connected)?.id ?? room.hostId
  const nextScores =
    room.roundState?.scores && Object.hasOwn(room.roundState.scores, playerName)
      ? {
          ...room.roundState.scores,
          [playerName]: 0,
        }
      : null

  return {
    ...room,
    hostId: nextHost,
    players: nextPlayers.map((player) =>
      player.id === nextHost
        ? { ...player, role: 'host', ready: false, updatedAt }
        : { ...player, updatedAt },
    ),
    roundState: nextScores
      ? {
          ...room.roundState,
          scores: nextScores,
          updatedAt,
        }
      : room.roundState,
    spectators: room.spectators.includes(playerName)
      ? room.spectators
      : [...room.spectators, playerName],
    updatedAt,
  }
}

export function updateRoomSettings(room, { privacy, roundCount }) {
  return {
    ...room,
    privacy: privacy ?? room.privacy,
    roundCount: roundCount ?? room.roundCount,
    updatedAt: new Date().toISOString(),
  }
}

export function startRoomCountdown(room) {
  return {
    ...room,
    phase: 'countdown',
    roundState: createRoundState(room, {
      scores: createScoreState(room.players, room.roundState?.scores),
      history: room.roundState?.history ?? [],
      countdownStartedAt: new Date().toISOString(),
    }),
    updatedAt: new Date().toISOString(),
  }
}

export function startRoomPlaying(room) {
  return {
    ...room,
    phase: 'playing',
    roundState: createRoundState(room, {
      ...(room.roundState ?? {}),
      phase: 'playing',
      playingStartedAt: new Date().toISOString(),
    }),
    updatedAt: new Date().toISOString(),
  }
}

export function recordRoomShot(room, { shooterName, laneId }) {
  if (!shooterName || !laneId) {
    return room
  }
  const existingShots = room.roundState?.shots ?? []
  if (existingShots.some((shot) => shot.shooterName === shooterName)) {
    return room
  }
  const numericLaneId = Number(laneId)
  const nextShotRacerIds = room.roundState?.shotRacerIds?.includes(numericLaneId)
    ? room.roundState.shotRacerIds
    : [...(room.roundState?.shotRacerIds ?? []), numericLaneId]
  return {
    ...room,
    roundState: createRoundState(room, {
      ...(room.roundState ?? {}),
      shotRacerIds: nextShotRacerIds,
      shots: [
        ...existingShots,
        {
          shooterName,
          laneId: numericLaneId,
          createdAt: new Date().toISOString(),
        },
      ],
    }),
    updatedAt: new Date().toISOString(),
  }
}

export function finishRoomRound(room, winner) {
  if (!winner?.laneId) {
    return room
  }
  const existingHistory = room.roundState?.history ?? []
  const alreadyRecorded = existingHistory.some((entry) => entry.round === room.round)
  const winnerEntry = {
    round: room.round,
    winnerName: winner.winnerName,
    winnerType: winner.winnerType,
    laneId: Number(winner.laneId),
  }
  const nextScores = {
    ...createScoreState(room.players, room.roundState?.scores),
  }
  if (winner.winnerType === 'human' && winner.winnerName) {
    nextScores[winner.winnerName] = (nextScores[winner.winnerName] ?? 0) + 1
  }
  return {
    ...room,
    phase: 'roundOver',
    roundState: createRoundState(room, {
      ...(room.roundState ?? {}),
      winner: {
        laneId: Number(winner.laneId),
        winnerName: winner.winnerName,
        winnerType: winner.winnerType,
        finalProgress: winner.finalProgress,
      },
      scores: nextScores,
      history: alreadyRecorded ? existingHistory : [...existingHistory, winnerEntry],
      phase: 'roundOver',
      roundOverAt: new Date().toISOString(),
    }),
    updatedAt: new Date().toISOString(),
  }
}

export function showRoomScoreboard(room) {
  return {
    ...room,
    phase: 'scoreboard',
    roundState: createRoundState(room, {
      ...(room.roundState ?? {}),
      phase: 'scoreboard',
      scoreboardStartedAt: new Date().toISOString(),
    }),
    updatedAt: new Date().toISOString(),
  }
}

export function startNextRound(room) {
  const nextRound = room.round + 1
  return {
    ...room,
    phase: 'countdown',
    round: nextRound,
    roundState: createRoundState(
      { ...room, round: nextRound },
      {
        scores: createScoreState(room.players, room.roundState?.scores),
        history: room.roundState?.history ?? [],
        countdownStartedAt: new Date().toISOString(),
      },
    ),
    updatedAt: new Date().toISOString(),
  }
}

export function serializeRoom(room) {
  return {
    roomCode: room.roomCode,
    privacy: room.privacy,
    roundCount: room.roundCount,
    hostId: room.hostId,
    phase: room.phase,
    players: room.players,
    spectators: room.spectators,
    round: room.round,
    inputs: room.inputs ?? {},
    roundState: room.roundState ?? createRoundState(room),
    updatedAt: room.updatedAt,
  }
}

export function canStartRoom(room) {
  return (
    room.players.length > 0 &&
    room.players.every((player) => player.connected) &&
    room.players.some((player) => player.role === 'host') &&
    room.players.every((player) => player.ready)
  )
}

export function touchRoomPlayers(room) {
  const updatedAt = new Date().toISOString()
  return {
    ...room,
    players: room.players.map((player) => ({ ...player, updatedAt })),
    updatedAt,
  }
}

export function shouldDestroyRoom(room, { hostLeft = false } = {}) {
  const activePlayers = room.players.filter((player) => player.connected)
  const hostConnected = room.players.some(
    (player) => player.id === room.hostId && player.connected,
  )
  return hostLeft || activePlayers.length === 0 || !hostConnected
}
