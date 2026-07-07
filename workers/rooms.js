import {
  createRoomState,
  joinRoomState,
  leaveRoomState,
  pruneDisconnectedPlayers,
  serializeRoom,
  setPlayerReadyState,
  setPlayerInputState,
  startNextRound,
  startRoomCountdown,
  updateRoomSettings,
  canStartRoom,
  touchRoomPlayers,
} from '../src/multiplayer/roomState.js'

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

  async loadRoom(roomCode) {
    const existing = await this.state.storage.get('room')
    if (existing) {
      return pruneDisconnectedPlayers(existing)
    }
    const created = createRoomState({
      roomCode,
      hostName: 'Host',
    })
    await this.state.storage.put('room', created)
    return created
  }

  async saveRoom(room) {
    await this.state.storage.put('room', room)
    return room
  }

  async fetch(request) {
    const roomCode = this.state.id.toString()
    const room = await this.loadRoom(roomCode)

    if (request.method === 'GET') {
      const nextRoom = pruneDisconnectedPlayers(room)
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

    if (action === 'join') {
      const nextRoom = pruneDisconnectedPlayers(
        touchRoomPlayers(joinRoomState(room, body.playerName ?? 'Player')),
      )
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'leave') {
      const nextRoom = pruneDisconnectedPlayers(
        touchRoomPlayers(leaveRoomState(room, body.playerName ?? 'Player')),
      )
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
        touchRoomPlayers(
          setPlayerReadyState(room, body.playerName ?? 'Player', body.ready ?? true),
        ),
      )
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'input') {
      const nextRoom = pruneDisconnectedPlayers(
        touchRoomPlayers(
          setPlayerInputState(room, body.playerName ?? 'Player', {
            movementMode: body.movementMode ?? 'stopped',
            aim: body.aim ?? null,
            firing: body.firing ?? false,
          }),
        ),
      )
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    return json({ error: 'Unknown action' }, 400)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const roomCode = url.pathname.split('/').filter(Boolean)[1]

    if (!roomCode) {
      return json({ error: 'Room code required' }, 400)
    }

    const id = env.ROOM_LOBBY.idFromName(roomCode)
    const stub = env.ROOM_LOBBY.get(id)
    return stub.fetch(request)
  },
}

export { RoomLobbyObject }
