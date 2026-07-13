import {
  createRoomState,
  joinRoomState,
  leaveRoomState,
  pruneDisconnectedPlayers,
  renamePlayerState,
  serializeRoom,
  setPlayerHeartbeatState,
  setPlayerReadyState,
  setPlayerInputState,
  finishRoomRound,
  recordRoomShot,
  showRoomScoreboard,
  startNextRound,
  startRoomCountdown,
  startRoomPlaying,
  updateRoomSettings,
  canStartRoom,
  shouldDestroyRoom,
  toPlayerId,
} from '../src/multiplayer/roomState.js'

const PLAYER_STALE_MS = 45000
const CLEANUP_ALARM_MS = PLAYER_STALE_MS + 1000
const INPUT_BROADCAST_MS = 50
const INPUT_TICKER_IDLE_TICKS = 20
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
}

function getRoomCodeFromPath(pathname) {
  const pathParts = pathname.split('/').filter(Boolean)
  const roomsIndex = pathParts.lastIndexOf('rooms')
  if (roomsIndex >= 0 && pathParts[roomsIndex + 1]) {
    return pathParts[roomsIndex + 1]
  }
  if (pathParts[pathParts.length - 1] === 'rooms') {
    return undefined
  }
  return pathParts[pathParts.length - 1]
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  })
}

function preflight() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

async function readJson(request) {
  return request.json().catch(() => ({}))
}

class RoomLobbyObject {
  constructor(state, env) {
    this.state = state
    this.env = env
    // In-memory authoritative room; undefined = not yet loaded from storage.
    this.room = undefined
    this.inputsDirty = false
    this.inputTickerId = null
    this.idleInputTicks = 0
    if (
      typeof state.setWebSocketAutoResponse === 'function' &&
      typeof WebSocketRequestResponsePair === 'function'
    ) {
      state.setWebSocketAutoResponse(
        new WebSocketRequestResponsePair('ping', JSON.stringify({ type: 'pong' })),
      )
    }
  }

  async loadRoom() {
    if (this.room === undefined) {
      const existing = await this.state.storage.get('room')
      this.room = existing ?? null
    }
    return this.room ? pruneDisconnectedPlayers(this.room, PLAYER_STALE_MS) : null
  }

  // Durable state (phases, rosters, shots, scores) persists to storage and
  // broadcasts the full room. High-rate ephemeral updates (inputs) keep the
  // room in memory only and go out as compact deltas on the input ticker.
  async saveRoom(room, { persist = true, broadcastRoom = true } = {}) {
    this.room = room
    if (persist) {
      await this.state.storage.put('room', room)
      await this.scheduleCleanupAlarm()
    }
    if (broadcastRoom) {
      this.broadcast({ type: 'room', room: serializeRoom(room) })
    }
    return room
  }

  async destroyRoom(reason = 'Room closed') {
    this.room = null
    this.stopInputTicker()
    await this.state.storage.delete('room')
    if (typeof this.state.storage.deleteAlarm === 'function') {
      await this.state.storage.deleteAlarm()
    }
    this.broadcast({ type: 'closed', error: reason })
  }

  ensureInputTicker() {
    if (this.inputTickerId !== null || !this.liveSockets().length) {
      return
    }
    this.idleInputTicks = 0
    this.inputTickerId = setInterval(() => this.broadcastInputs(), INPUT_BROADCAST_MS)
  }

  stopInputTicker() {
    if (this.inputTickerId !== null) {
      clearInterval(this.inputTickerId)
      this.inputTickerId = null
    }
    this.idleInputTicks = 0
  }

  // The ticker stops itself once inputs go quiet so the object can hibernate.
  broadcastInputs() {
    if (!this.inputsDirty || !this.room || !this.liveSockets().length) {
      this.idleInputTicks += 1
      if (this.idleInputTicks >= INPUT_TICKER_IDLE_TICKS) {
        this.stopInputTicker()
      }
      return
    }
    this.idleInputTicks = 0
    this.inputsDirty = false
    this.broadcast({
      type: 'inputs',
      inputs: this.room.inputs ?? {},
      round: this.room.round,
      updatedAt: this.room.updatedAt,
    })
  }

  applyInputUpdate(room) {
    this.room = room
    this.inputsDirty = true
    this.ensureInputTicker()
    return room
  }

  async scheduleCleanupAlarm() {
    if (typeof this.state.storage.setAlarm === 'function') {
      await this.state.storage.setAlarm(Date.now() + CLEANUP_ALARM_MS)
    }
  }

  async closeIfNeeded(room) {
    if (!shouldDestroyRoom(room)) {
      return null
    }
    await this.destroyRoom('Room closed')
    return json({ error: 'Room closed', room: null, destroyed: true }, 410)
  }

  async alarm() {
    const room = await this.loadRoom()
    if (!room) {
      return
    }
    if (shouldDestroyRoom(room)) {
      await this.destroyRoom('Room closed')
      return
    }
    await this.saveRoom(room)
  }

  liveSockets() {
    return typeof this.state.getWebSockets === 'function'
      ? this.state.getWebSockets()
      : []
  }

  broadcast(message) {
    const payload = JSON.stringify(message)
    for (const socket of this.liveSockets()) {
      try {
        socket.send(payload)
      } catch {
        // The runtime removes closed hibernatable sockets on its own.
      }
    }
  }

  async handleWebSocket(request) {
    if (
      typeof WebSocketPair !== 'function' ||
      typeof this.state.acceptWebSocket !== 'function'
    ) {
      return json({ error: 'Live transport unavailable' }, 501)
    }
    const room = await this.loadRoom()
    if (!room) {
      return json({ error: 'Room not found' }, 404)
    }

    const playerName = new URL(request.url).searchParams.get('playerName') ?? ''
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.state.acceptWebSocket(server)
    if (typeof server.serializeAttachment === 'function') {
      server.serializeAttachment({ playerName })
    }
    server.send(JSON.stringify({ type: 'room', room: serializeRoom(room) }))

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  socketPlayerName(socket) {
    if (typeof socket.deserializeAttachment !== 'function') {
      return ''
    }
    try {
      return socket.deserializeAttachment()?.playerName ?? ''
    } catch {
      return ''
    }
  }

  async webSocketMessage(socket, rawMessage) {
    if (typeof rawMessage !== 'string') {
      return
    }
    if (rawMessage === 'ping') {
      socket.send(JSON.stringify({ type: 'pong' }))
      return
    }
    let message
    try {
      message = JSON.parse(rawMessage)
    } catch {
      return
    }
    const playerName = message.playerName ?? this.socketPlayerName(socket)
    if (!playerName) {
      return
    }
    const room = await this.loadRoom()
    if (!room) {
      socket.send(JSON.stringify({ type: 'closed', error: 'Room closed' }))
      return
    }

    if (message.type === 'input') {
      this.applyInputUpdate(
        setPlayerInputState(room, playerName, {
          movementMode: message.movementMode ?? 'stopped',
          aim: message.aim ?? null,
          progress: message.progress ?? 0,
          firing: message.firing ?? false,
        }),
      )
      return
    }

    let nextRoom = null
    if (message.type === 'heartbeat') {
      nextRoom = setPlayerHeartbeatState(room, playerName)
    } else if (message.type === 'shot') {
      nextRoom = recordRoomShot(room, {
        shooterName: playerName,
        laneId: message.laneId,
      })
    }
    if (!nextRoom) {
      return
    }

    const prunedRoom = pruneDisconnectedPlayers(nextRoom, PLAYER_STALE_MS)
    if (shouldDestroyRoom(prunedRoom)) {
      await this.destroyRoom('Room closed')
      return
    }
    await this.saveRoom(prunedRoom)
  }

  async fetch(request) {
    const url = new URL(request.url)
    const roomCode = getRoomCodeFromPath(url.pathname) ?? this.state.id.toString()

    if (request.method === 'OPTIONS') {
      return preflight()
    }

    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      return this.handleWebSocket(request)
    }

    if (request.method === 'GET') {
      const room = await this.loadRoom()
      if (!room) {
        return json({ error: 'Room not found' }, 404)
      }
      const closedResponse = await this.closeIfNeeded(room)
      if (closedResponse) {
        return closedResponse
      }
      // Reads only refresh the in-memory copy; they never rewrite storage or
      // rebroadcast to the live sockets.
      await this.saveRoom(room, { persist: false, broadcastRoom: false })
      return json({ room: serializeRoom(room) })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const body = await readJson(request)
    const action = body.action ?? 'join'

    if (action === 'create') {
      const nextRoom = createRoomState({
        roomCode,
        hostName: body.hostName ?? 'Host',
        privacy: body.privacy ?? 'public',
        roundCount: body.roundCount ?? 5,
      })
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) }, 201)
    }

    const room = await this.loadRoom()
    if (!room) {
      return json({ error: 'Room not found' }, 404)
    }
    const closedResponse = await this.closeIfNeeded(room)
    if (closedResponse) {
      return closedResponse
    }

    if (action === 'join') {
      const nextRoom = pruneDisconnectedPlayers(
        joinRoomState(room, body.playerName ?? 'Player'),
        PLAYER_STALE_MS,
      )
      if (shouldDestroyRoom(nextRoom)) {
        await this.destroyRoom('Room closed')
        return json({ error: 'Room closed', room: null, destroyed: true })
      }
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'leave') {
      const leavingHost = room.hostId === toPlayerId(body.playerName ?? 'Player')
      const nextRoom = pruneDisconnectedPlayers(
        leaveRoomState(room, body.playerName ?? 'Player'),
        PLAYER_STALE_MS,
      )
      if (shouldDestroyRoom(nextRoom, { hostLeft: leavingHost })) {
        const reason = leavingHost ? 'Host left the room' : 'Room closed'
        await this.destroyRoom(reason)
        return json({ error: reason, room: null, destroyed: true })
      }
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'settings') {
      const nextRoom = updateRoomSettings(room, {
        privacy: body.privacy,
        roundCount: body.roundCount,
      })
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'rename') {
      const nextRoom = renamePlayerState(
        room,
        body.playerName ?? 'Player',
        body.nextPlayerName ?? '',
      )
      if (nextRoom === room) {
        return json({ error: 'Player name is not available' }, 400)
      }
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'countdown') {
      if (toPlayerId(body.playerName ?? '') !== room.hostId) {
        return json({ error: 'Only the host can start the game' }, 403)
      }
      if (!canStartRoom(room)) {
        return json({ error: 'Room is not ready' }, 400)
      }
      const nextRoom = startRoomCountdown(room)
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'next-round') {
      if (toPlayerId(body.playerName ?? '') !== room.hostId) {
        return json({ error: 'Only the host can start the next round' }, 403)
      }
      const nextRoom = startNextRound(room)
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'playing') {
      if (toPlayerId(body.playerName ?? '') !== room.hostId) {
        return json({ error: 'Only the host can start the round' }, 403)
      }
      const nextRoom = startRoomPlaying(room)
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'shot') {
      const nextRoom = recordRoomShot(room, {
        shooterName: body.playerName ?? 'Player',
        laneId: body.laneId,
      })
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'round-over') {
      if (toPlayerId(body.playerName ?? '') !== room.hostId) {
        return json({ error: 'Only the host can finish the round' }, 403)
      }
      const nextRoom = finishRoomRound(room, {
        laneId: body.laneId,
        winnerName: body.winnerName,
        winnerType: body.winnerType,
        finalProgress: body.finalProgress,
      })
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'scoreboard') {
      if (toPlayerId(body.playerName ?? '') !== room.hostId) {
        return json({ error: 'Only the host can show the scoreboard' }, 403)
      }
      const nextRoom = showRoomScoreboard(room)
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'ready') {
      const nextRoom = pruneDisconnectedPlayers(
        setPlayerReadyState(room, body.playerName ?? 'Player', body.ready ?? true),
        PLAYER_STALE_MS,
      )
      if (shouldDestroyRoom(nextRoom)) {
        await this.destroyRoom('Room closed')
        return json({ error: 'Room closed', room: null, destroyed: true })
      }
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'heartbeat') {
      const nextRoom = pruneDisconnectedPlayers(
        setPlayerHeartbeatState(room, body.playerName ?? 'Player'),
        PLAYER_STALE_MS,
      )
      if (shouldDestroyRoom(nextRoom)) {
        await this.destroyRoom('Room closed')
        return json({ error: 'Room closed', room: null, destroyed: true })
      }
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'input') {
      const nextRoom = this.applyInputUpdate(
        setPlayerInputState(room, body.playerName ?? 'Player', {
          movementMode: body.movementMode ?? 'stopped',
          aim: body.aim ?? null,
          progress: body.progress ?? 0,
          firing: body.firing ?? false,
        }),
      )
      return json({ room: serializeRoom(nextRoom) })
    }

    return json({ error: 'Unknown action' }, 400)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const roomCode = getRoomCodeFromPath(url.pathname)

    if (request.method === 'OPTIONS') {
      return preflight()
    }

    if (!roomCode) {
      return json({ error: 'Room code required' }, 400)
    }

    const id = env.ROOM_LOBBY.idFromName(roomCode)
    const stub = env.ROOM_LOBBY.get(id)
    return stub.fetch(request)
  },
}

export { RoomLobbyObject }
