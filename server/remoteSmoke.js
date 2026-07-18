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
  roundId: room.state.round,
  sequence,
  payload,
})

const playerNamed = (room, name) => [...room.state.players.values()]
  .find(player => player.name === name)

const playRound = async (host, round, sequence, winnerEvents) => {
  await waitFor(() => host.state.round === round && host.state.phase === 'playing', 10000)
  send(host, CLIENT_MESSAGE_TYPES.INPUT, { movementMode: 'running' }, sequence)
  await waitFor(() => host.state.phase === 'roundOver', 35000)
  if (host.state.winnerName !== 'Smoke Host' || host.state.winnerType !== 'human') {
    throw new Error(`Round ${round} winner was ${host.state.winnerName || 'unknown'}`)
  }
  if (!host.state.winnerEventId || winnerEvents.has(host.state.winnerEventId)) {
    throw new Error(`Round ${round} did not publish a unique winner event`)
  }
  winnerEvents.add(host.state.winnerEventId)
}

try {
  const hostClient = new Client(endpoint)
  const guestClient = new Client(endpoint)
  const host = await hostClient.create('death-race', {
    roomCode, playerName: 'Smoke Host', privacy: 'private', roundCount: 3,
  })
  rooms.push(host)
  const guest = await guestClient.joinById(roomCode, { playerName: 'Smoke Guest' })
  rooms.push(guest)
  host.onMessage('snapshot', () => {})
  guest.onMessage('snapshot', () => {})
  host.onMessage('event', () => {})
  guest.onMessage('event', () => {})
  await waitFor(() => host.state.players?.size === 2 && guest.state.players?.size === 2)
  const guestPlayerId = [...guest.state.players.values()]
    .find(player => player.connectionId === guest.sessionId)?.id
  if (!guestPlayerId) throw new Error('Guest identity was not synchronized')

  const reconnected = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Remote reconnect timed out')), 15000)
    guest.onReconnect.once(() => {
      clearTimeout(timeout)
      resolve()
    })
  })
  guest.connection.close()
  await reconnected
  await waitFor(() => guest.state.players.get(guestPlayerId)?.connected === true)

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
  const guestRacer = () => host.state.racers.get(String(guestPrivate.laneId))
  send(host, CLIENT_MESSAGE_TYPES.SHOT, {
    aimX: guestRacer().progress,
    aimY: ((guestPrivate.laneId - 0.5) / 20) * 100,
  }, 3)
  await waitFor(() => guestRacer()?.eliminated && playerNamed(host, 'Smoke Host')?.score === 1)

  const winnerEvents = new Set()
  await playRound(host, 1, 4, winnerEvents)
  if (playerNamed(host, 'Smoke Host')?.score !== 4) {
    throw new Error('Round-one kill and win scoring did not accumulate')
  }

  send(host, CLIENT_MESSAGE_TYPES.NEXT_ROUND, {}, 5)
  await playRound(host, 2, 6, winnerEvents)
  send(host, CLIENT_MESSAGE_TYPES.NEXT_ROUND, {}, 7)
  await playRound(host, 3, 8, winnerEvents)
  send(host, CLIENT_MESSAGE_TYPES.NEXT_ROUND, {}, 9)
  await waitFor(() => host.state.phase === 'gameOver')

  const finalScore = playerNamed(host, 'Smoke Host')?.score
  if (finalScore !== 10) throw new Error(`Expected final score 10, received ${finalScore}`)

  const players = host.state.players.size
  await guest.leave(true)
  await host.leave(true)
  rooms.length = 0
  await new Promise(resolve => setTimeout(resolve, 500))
  let disposed = false
  try {
    const probe = await new Client(endpoint).joinById(roomCode, { playerName: 'Disposal Probe' })
    await probe.leave(true)
  } catch {
    disposed = true
  }
  if (!disposed) throw new Error('Room remained joinable after every player left')

  console.log(JSON.stringify({
    ok: true,
    endpoint,
    roomCode,
    players,
    racers: host.state.racers.size,
    rounds: 3,
    phase: 'gameOver',
    reconnect: 'passed',
    shot: 'passed',
    finalScore,
    winnerEvents: winnerEvents.size,
    disposed: 'passed',
  }))
} finally {
  for (const room of rooms.reverse()) {
    await Promise.race([
      room.leave(true).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ])
  }
}
