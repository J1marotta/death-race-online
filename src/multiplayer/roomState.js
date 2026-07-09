const MAX_PLAYERS = 20

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
  const nextPlayers = room.players.map((player) =>
    player.name === playerName ? { ...player, connected: false, ready: false } : player,
  )
  const hostStillConnected = nextPlayers.some(
    (player) => player.role === 'host' && player.connected,
  )
  const nextHost = hostStillConnected
    ? room.hostId
    : nextPlayers.find((player) => player.connected)?.id ?? room.hostId

  return {
    ...room,
    hostId: nextHost,
    players: nextPlayers.map((player) =>
      player.id === nextHost
        ? { ...player, role: 'host', ready: false, updatedAt: new Date().toISOString() }
        : { ...player, updatedAt: new Date().toISOString() },
    ),
    spectators: room.spectators.includes(playerName)
      ? room.spectators
      : [...room.spectators, playerName],
    updatedAt: new Date().toISOString(),
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
    updatedAt: new Date().toISOString(),
  }
}

export function startNextRound(room) {
  return {
    ...room,
    phase: 'countdown',
    round: room.round + 1,
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
