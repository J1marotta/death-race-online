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
  shouldDestroyRoom,
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

  async loadRoom() {
    const existing = await this.state.storage.get('room')
    return existing ? pruneDisconnectedPlayers(existing) : null
  }

  async saveRoom(room) {
    await this.state.storage.put('room', room)
    return room
  }

  async destroyRoom() {
    await this.state.storage.delete('room')
  }

  async fetch(request) {
    const roomCode = this.state.id.toString()

    if (request.method === 'GET') {
      const room = await this.loadRoom()
      if (!room) {
        return json({ error: 'Room not found' }, 404)
      }
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

    const room = await this.loadRoom()
    if (!room) {
      return json({ error: 'Room not found' }, 404)
    }

    if (action === 'join') {
      const nextRoom = pruneDisconnectedPlayers(
        touchRoomPlayers(joinRoomState(room, body.playerName ?? 'Player')),
      )
      if (shouldDestroyRoom(nextRoom)) {
        await this.destroyRoom()
        return json({ room: null, destroyed: true })
      }
      await this.saveRoom(nextRoom)
      return json({ room: serializeRoom(nextRoom) })
    }

    if (action === 'leave') {
      const leavingHost = room.hostId === (body.playerName ?? 'Player').toLowerCase().replace(/\s+/g, '-')
      const nextRoom = pruneDisconnectedPlayers(
        touchRoomPlayers(leaveRoomState(room, body.playerName ?? 'Player')),
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
      if (shouldDestroyRoom(nextRoom)) {
        await this.destroyRoom()
        return json({ room: null, destroyed: true })
      }
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
