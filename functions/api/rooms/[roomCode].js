import {
  createRoomState,
  joinRoomState,
  leaveRoomState,
  serializeRoom,
  startNextRound,
  startRoomCountdown,
  updateRoomSettings,
} from '../../../src/multiplayer/roomState.js'

const rooms = new Map()

function readJson(request) {
  return request.json().catch(() => ({}))
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

function getRoom(roomCode) {
  return rooms.get(roomCode) ?? null
}

export async function onRequestGet(context) {
  const roomCode = context.params.roomCode
  const room = getRoom(roomCode)

  if (!room) {
    return json({ error: 'Room not found' }, 404)
  }

  return json({ room: serializeRoom(room) })
}

export async function onRequestPost(context) {
  const roomCode = context.params.roomCode
  const body = await readJson(context.request)
  const action = body.action ?? 'join'
  const hostName = body.hostName ?? 'Host'

  if (action === 'create') {
    const room = createRoomState({
      roomCode,
      hostName,
      privacy: body.privacy ?? 'public',
      roundCount: body.roundCount ?? 5,
    })
    rooms.set(roomCode, room)
    return json({ room: serializeRoom(room) }, 201)
  }

  const existingRoom = getRoom(roomCode)
  if (!existingRoom) {
    return json({ error: 'Room not found' }, 404)
  }

  if (action === 'join') {
    const room = joinRoomState(existingRoom, body.playerName ?? hostName)
    rooms.set(roomCode, room)
    return json({ room: serializeRoom(room) })
  }

  if (action === 'leave') {
    const room = leaveRoomState(existingRoom, body.playerName ?? hostName)
    rooms.set(roomCode, room)
    return json({ room: serializeRoom(room) })
  }

  if (action === 'settings') {
    const room = updateRoomSettings(existingRoom, {
      privacy: body.privacy,
      roundCount: body.roundCount,
    })
    rooms.set(roomCode, room)
    return json({ room: serializeRoom(room) })
  }

  if (action === 'countdown') {
    const room = startRoomCountdown(existingRoom)
    rooms.set(roomCode, room)
    return json({ room: serializeRoom(room) })
  }

  if (action === 'next-round') {
    const room = startNextRound(existingRoom)
    rooms.set(roomCode, room)
    return json({ room: serializeRoom(room) })
  }

  return json({ error: 'Unknown action' }, 400)
}
