const DEFAULT_API_BASE = '/api/rooms'
const PRODUCTION_API_BASE = 'https://death-race-rooms.james-marotta.workers.dev/api/rooms'

export function getRoomsApiBase(hostname = window.location.hostname) {
  if (import.meta.env.VITE_ROOMS_API_BASE) {
    return import.meta.env.VITE_ROOMS_API_BASE
  }
  if (!['localhost', '127.0.0.1', ''].includes(hostname)) {
    return PRODUCTION_API_BASE
  }
  return DEFAULT_API_BASE
}

function roomUrl(roomCode) {
  const base = getRoomsApiBase()
  return new URL(`${base}/${roomCode}`, window.location.origin)
}

async function requestJson(path, options = {}) {
  const base = getRoomsApiBase()
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

export function createRoomSocket(roomCode, playerName) {
  const url = roomUrl(`${roomCode}/live`)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  if (playerName) {
    url.searchParams.set('playerName', playerName)
  }
  return new WebSocket(url.toString())
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

export function leaveRoomOnUnload(roomCode, payload) {
  const body = JSON.stringify({
    action: 'leave',
    ...payload,
  })
  const url = roomUrl(roomCode).toString()
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      url,
      new Blob([body], { type: 'text/plain;charset=UTF-8' }),
    )
    if (sent) {
      return true
    }
  }
  void fetch(url, {
    method: 'POST',
    body,
    headers: {
      'content-type': 'text/plain;charset=UTF-8',
    },
    keepalive: true,
  }).catch(() => {})
  return false
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

export function renameRoomPlayer(roomCode, payload) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'rename',
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

export function sendPlayerHeartbeat(roomCode, payload) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'heartbeat',
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

export function startCountdown(roomCode, payload = {}) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'countdown',
      ...payload,
    }),
  })
}

export function startPlaying(roomCode, payload = {}) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'playing',
      ...payload,
    }),
  })
}

export function recordShot(roomCode, payload = {}) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'shot',
      ...payload,
    }),
  })
}

export function finishRound(roomCode, payload = {}) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'round-over',
      ...payload,
    }),
  })
}

export function showScoreboard(roomCode, payload = {}) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'scoreboard',
      ...payload,
    }),
  })
}

export function startNextRound(roomCode, payload = {}) {
  return requestJson(roomCode, {
    method: 'POST',
    body: JSON.stringify({
      action: 'next-round',
      ...payload,
    }),
  })
}

export function getRoom(roomCode) {
  return requestJson(roomCode)
}
