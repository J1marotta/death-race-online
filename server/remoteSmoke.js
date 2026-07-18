import { Client } from '@colyseus/sdk'
import { CLIENT_MESSAGE_TYPES, PROTOCOL_VERSION } from '../src/multiplayer/protocol.js'

const endpoint = process.env.COLYSEUS_URL || 'wss://death-race-online-game.fly.dev'
const roomCode = `SMOKE${Date.now().toString(36).toUpperCase()}`.slice(-12)
const rooms = []

const waitFor = (predicate, timeoutMs = 15000) => new Promise((resolve, reject) => {
  const startedAt = Date.now()
  const check = () => {
    const value = predicate()
    if (value) return resolve(value)
    if (Date.now() - startedAt >= timeoutMs) return reject(new Error('Remote smoke test timed out'))
    setTimeout(check, 50)
  }
  check()
})

const send = (room, type, payload, sequence) => room.send('command', {
  protocolVersion: PROTOCOL_VERSION,
  type,
  roomId: room.roomId,
  roundId: 1,
  sequence,
  payload,
})

try {
  const hostClient = new Client(endpoint)
  const guestClient = new Client(endpoint)
  const host = await hostClient.create('death-race', {
    roomCode, playerName: 'Smoke Host', privacy: 'private', roundCount: 3,
  })
  rooms.push(host)
  const guest = await guestClient.joinById(roomCode, { playerName: 'Smoke Guest' })
  rooms.push(guest)
  await waitFor(() => host.state.players?.size === 2 && guest.state.players?.size === 2)
  let hostPrivate
  let guestPrivate
  host.onMessage('private-state', value => { hostPrivate = value })
  guest.onMessage('private-state', value => { guestPrivate = value })
  send(host, CLIENT_MESSAGE_TYPES.READY, { ready: true }, 1)
  send(guest, CLIENT_MESSAGE_TYPES.READY, { ready: true }, 1)
  await waitFor(() => [...host.state.players.values()].every(player => player.ready))
  send(host, CLIENT_MESSAGE_TYPES.START_COUNTDOWN, {}, 2)
  await waitFor(() => hostPrivate && guestPrivate && host.state.racers?.size === 20)
  if (hostPrivate.laneId === guestPrivate.laneId) throw new Error('Private lanes collided')
  await waitFor(() => host.state.phase === 'playing')
  send(host, CLIENT_MESSAGE_TYPES.INPUT, { movementMode: 'walking', progress: 100 }, 3)
  await waitFor(() => guest.state.racers.get(String(hostPrivate.laneId))?.progress > 0)
  console.log(JSON.stringify({
    ok: true,
    endpoint,
    roomCode,
    players: host.state.players.size,
    racers: host.state.racers.size,
    phase: host.state.phase,
  }))
} finally {
  for (const room of rooms.reverse()) {
    await Promise.race([
      room.leave(true).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ])
  }
}
