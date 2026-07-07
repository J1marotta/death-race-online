const MAX_PLAYERS = 20

function createPlayerRecord(name, role = 'player') {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    role,
    connected: true,
    ready: role === 'host',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function joinRoomState(room, playerName) {
  if (room.players.some((player) => player.name === playerName)) {
    return room
  }

  if (room.players.length >= MAX_PLAYERS) {
    return room
  }

  return {
    ...room,
    players: [...room.players, createPlayerRecord(playerName)],
    updatedAt: new Date().toISOString(),
  }
}

export function leaveRoomState(room, playerName) {
  return {
    ...room,
    players: room.players.map((player) =>
      player.name === playerName ? { ...player, connected: false } : player,
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
    updatedAt: room.updatedAt,
  }
}
