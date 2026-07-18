// @vitest-environment node
import { Client } from '@colyseus/sdk'
import { afterEach, describe, expect, it } from 'vitest'
import { CLIENT_MESSAGE_TYPES, PROTOCOL_VERSION } from '../src/multiplayer/protocol.js'
import { startGameServer } from './index.js'

let runningServer
let rooms = []

const waitFor = (predicate, timeoutMs = 4000) => new Promise((resolve, reject) => {
  const startedAt = Date.now()
  const check = () => {
    const value = predicate()
    if (value) return resolve(value)
    if (Date.now() - startedAt >= timeoutMs) return reject(new Error('Timed out waiting for multiplayer state'))
    setTimeout(check, 20)
  }
  check()
})

const send = (room, type, payload, sequence, roundId = 1) => room.send('command', {
  protocolVersion: PROTOCOL_VERSION,
  type,
  roomId: room.roomId,
  roundId,
  sequence,
  payload,
})

afterEach(async () => {
  for (const room of [...rooms].reverse()) {
    await Promise.race([
      room.leave(true).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 500)),
    ])
  }
  rooms = []
  if (runningServer) {
    await runningServer.gameServer.gracefullyShutdown(false)
    runningServer = undefined
  }
}, 15000)

describe('real two-client Colyseus flow', () => {
  it('creates, joins by code, readies, starts, assigns private lanes, and syncs movement', async () => {
    runningServer = await startGameServer({ port: 0 })
    const { port } = runningServer.transport.server.address()
    const hostClient = new Client(`ws://127.0.0.1:${port}`)
    const guestClient = new Client(`ws://127.0.0.1:${port}`)
    const host = await hostClient.create('death-race', {
      roomCode: 'E2ETEST', playerName: 'James', privacy: 'private', roundCount: 3,
    })
    host.onMessage('session', () => {})
    rooms.push(host)
    const guest = await guestClient.joinById('E2ETEST', { playerName: 'Mia' })
    guest.onMessage('session', () => {})
    rooms.push(guest)
    expect(host.roomId).toBe('E2ETEST')
    await waitFor(() => host.state.players?.size === 2 && guest.state.players?.size === 2)

    let hostPrivate
    let guestPrivate
    host.onMessage('private-state', payload => { hostPrivate = payload })
    guest.onMessage('private-state', payload => { guestPrivate = payload })
    send(host, CLIENT_MESSAGE_TYPES.READY, { ready: true }, 1)
    send(guest, CLIENT_MESSAGE_TYPES.READY, { ready: true }, 1)
    await waitFor(() => [...host.state.players.values()].every(player => player.ready))
    send(host, CLIENT_MESSAGE_TYPES.START_COUNTDOWN, {}, 2)

    await waitFor(() => host.state.phase === 'countdown' && hostPrivate && guestPrivate)
    expect(hostPrivate.laneId).not.toBe(guestPrivate.laneId)
    expect(host.state.racers.size).toBe(20)
    expect([...host.state.racers.values()].every(racer => !('playerId' in racer))).toBe(true)
    await waitFor(() => host.state.phase === 'playing', 5000)
    const startingProgress = guest.state.racers.get(String(hostPrivate.laneId)).progress
    send(host, CLIENT_MESSAGE_TYPES.INPUT, { movementMode: 'walking', progress: 100 }, 3)
    const hostRacer = await waitFor(() => {
      const racer = guest.state.racers.get(String(hostPrivate.laneId))
      return racer?.progress > startingProgress ? racer : null
    })
    expect(hostRacer.progress - startingProgress).toBeLessThan(2)
    expect(hostRacer.movementMode).toBe('walking')
  }, 10000)
})
