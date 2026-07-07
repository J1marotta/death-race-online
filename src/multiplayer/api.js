const DEFAULT_API_BASE = '/api/rooms'

async function requestJson(path, options = {}) {
  const base = import.meta.env.VITE_ROOMS_API_BASE ?? DEFAULT_API_BASE
  const response = await fetch(`${base}/${path}`, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed')
  }
  return payload
}

export function createRoom(roomCode, payload) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'create',
      ...payload,
    }),
  })
}

export function joinRoom(roomCode, payload) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'join',
      ...payload,
    }),
  })
}

export function leaveRoom(roomCode, payload) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'leave',
      ...payload,
    }),
  })
}

export function updateRoom(roomCode, payload) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'settings',
      ...payload,
    }),
  })
}

export function setPlayerReady(roomCode, payload) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'ready',
      ...payload,
    }),
  })
}

export function submitPlayerInput(roomCode, payload) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'input',
      ...payload,
    }),
  })
}

export function startCountdown(roomCode) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'countdown',
    }),
  })
}

export function startNextRound(roomCode) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'next-round',
    }),
  })
}

export function getRoom(roomCode) {
  return requestJson(roomCode)
}
