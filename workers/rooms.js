import {
  createRoomState,
  joinRoomState,
  leaveRoomState,
  pruneDisconnectedPlayers,
  serializeRoom,
  setPlayerHeartbeatState,
  setPlayerReadyState,
  setPlayerInputState,
  startNextRound,
  startRoomCountdown,
  updateRoomSettings,
  canStartRoom,
  shouldDestroyRoom,
  toPlayerId,
} from '../src/multiplayer/roomState.js'

const PLAYER_STALE_MS = 45000
const CLEANUP_ALARM_MS = PLAYER_STALE_MS + 1000

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

async function readJson(request) {
  return request.json().catch(() => ({}))
}

class RoomLobbyObject {
  constructor(state, env) {
    this.state = state
    this.env = env
  }

  async loadRoom() {
    const existing = await this.state.storage.get('room')
    return existing ? pruneDisconnectedPlayers(existing, PLAYER_STALE_MS) : null
  }

  async saveRoom(room) {
    await this.state.storage.put('room', room)
    await this.scheduleCleanupAlarm()
    return room
  }

  async destroyRoom() {
    await this.state.storage.delete('room')
    if (typeof this.state.storage.deleteAlarm === 'function') {
      await this.state.storage.deleteAlarm()
    }
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
    await this.destroyRoom()
    return json({ error: 'Room closed', room: null, destroyed: true }, 410)
  }

  async alarm() {
    const room = await this.loadRoom()
    if (!room) {
      return
    }
    if (shouldDestroyRoom(room)) {
      await this.destroyRoom()
      return
    }
    await this.saveRoom(room)
  }

  async fetch(request) {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const roomCode = pathParts[pathParts.length - 1] ?? this.state.id.toString()

    if (request.method === 'GET') {
      const room = await this.loadRoom()
      if (!room) {
        return json({ error: 'Room not found' }, 404)
      }
      const nextRoom = pruneDisconnectedPlayers(room, PLAYER_STALE_MS)
      const closedResponse = await this.closeIfNeeded(nextRoom)
      if (closedResponse) {
        return closedResponse
      }
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
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
        await this.destroyRoom()
        return json({ room: null, destroyed: true })
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
        await this.destroyRoom()
        return json({ room: null, destroyed: true })
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
      const nextRoom = startNextRound(room)
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'ready') {
      const nextRoom = pruneDisconnectedPlayers(
        setPlayerReadyState(room, body.playerName ?? 'Player', body.ready ?? true),
        PLAYER_STALE_MS,
      )
      if (shouldDestroyRoom(nextRoom)) {
        await this.destroyRoom()
        return json({ room: null, destroyed: true })
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
        await this.destroyRoom()
        return json({ room: null, destroyed: true })
      }
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'input') {
      const nextRoom = pruneDisconnectedPlayers(
        setPlayerInputState(room, body.playerName ?? 'Player', {
          movementMode: body.movementMode ?? 'stopped',
          aim: body.aim ?? null,
          firing: body.firing ?? false,
        }),
        PLAYER_STALE_MS,
      )
      if (shouldDestroyRoom(nextRoom)) {
        await this.destroyRoom()
        return json({ room: null, destroyed: true })
      }
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    return json({ error: 'Unknown action' }, 400)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const roomCode = pathParts[pathParts.length - 1]

    if (!roomCode) {
      return json({ error: 'Room code required' }, 400)
    }

    const id = env.ROOM_LOBBY.idFromName(roomCode)
    const stub = env.ROOM_LOBBY.get(id)
    return stub.fetch(request)
  },
}

export { RoomLobbyObject }
