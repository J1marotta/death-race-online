import { Client } from '@colyseus/sdk'
import {
  CLIENT_MESSAGE_TYPES,
  PROTOCOL_VERSION,
  SERVER_MESSAGE_TYPES,
} from './protocol.js'
import { projectAuthoritativeState } from './authoritativeView.js'

export const DEFAULT_COLYSEUS_ENDPOINT = 'ws://127.0.0.1:2567'
export const MAX_RECONNECT_ATTEMPTS = 5

export function getColyseusEndpoint() {
  return import.meta.env.VITE_COLYSEUS_URL || DEFAULT_COLYSEUS_ENDPOINT
}

export class ColyseusTransport {
  constructor({
    endpoint = getColyseusEndpoint(),
    client = new Client(endpoint),
    schedule = (callback, delay) => setTimeout(callback, delay),
    random = Math.random,
  } = {}) {
    this.client = client
    this.schedule = schedule
    this.random = random
    this.room = null
    this.roomId = ''
    this.roundId = 1
    this.sequence = 0
    this.closedIntentionally = false
    this.latestState = null
    this.privateState = null
    this.lastMetaSignature = ''
    this.listeners = new Map()
  }

  subscribe(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
    return () => listeners.delete(listener)
  }

  emit(type, payload) {
    for (const listener of this.listeners.get(type) ?? []) listener(payload)
  }

  publishView(state = this.latestState) {
    const view = projectAuthoritativeState(state, this.privateState)
    this.emit('view', view)
    const meta = {
      ...view,
      racers: [],
      crosshairs: [],
      localStamina: undefined,
      localExhausted: undefined,
      localEliminated: undefined,
    }
    const signature = JSON.stringify(meta)
    if (signature !== this.lastMetaSignature) {
      this.lastMetaSignature = signature
      this.emit('meta', meta)
    }
  }

  async create({ roomCode, playerName, privacy = 'public', roundCount = 5 }) {
    const room = await this.client.create('death-race', {
      roomCode,
      playerName,
      privacy,
      roundCount,
    })
    return this.attach(room)
  }

  async join({ roomCode, playerName }) {
    const room = await this.client.joinById(roomCode, { playerName })
    return this.attach(room)
  }

  attach(room) {
    this.room = room
    this.roomId = room.roomId
    this.closedIntentionally = false
    room.onStateChange(state => {
      const snapshot = state?.toJSON ? state.toJSON() : state
      const players = snapshot?.players instanceof Map
        ? [...snapshot.players.values()]
        : Object.values(snapshot?.players ?? {})
      const localPlayer = players.find(player => player.connectionId === room.sessionId)
      if (localPlayer) this.privateState = { ...this.privateState, playerId: localPlayer.id }
      this.roundId = snapshot?.round ?? this.roundId
      this.latestState = snapshot
      this.emit('snapshot', snapshot)
      this.publishView(snapshot)
    })
    room.onMessage(SERVER_MESSAGE_TYPES.SNAPSHOT, envelope => {
      this.roundId = envelope.roundId
      this.latestState = envelope.payload
      this.emit('snapshot', envelope.payload)
      this.publishView(envelope.payload)
    })
    room.onMessage(SERVER_MESSAGE_TYPES.PRIVATE_STATE, payload => {
      this.privateState = { ...this.privateState, ...payload }
      this.emit('private-state', this.privateState)
      if (this.latestState) this.publishView()
    })
    room.onMessage(SERVER_MESSAGE_TYPES.EVENT, envelope => this.emit('event', envelope))
    room.onMessage(SERVER_MESSAGE_TYPES.ERROR, envelope => this.emit('error', envelope))
    room.onLeave(code => {
      if (this.closedIntentionally || code === 1000) {
        this.emit('closed', { code })
        return
      }
      void this.reconnect(room.reconnectionToken)
    })
    this.emit('status', 'connected')
    return room
  }

  command(type, payload = {}) {
    if (!this.room) throw new Error('Not connected to a room')
    this.sequence += 1
    this.room.send('command', {
      protocolVersion: PROTOCOL_VERSION,
      type,
      roomId: this.roomId,
      roundId: this.roundId,
      sequence: this.sequence,
      payload,
    })
  }

  rename(nextPlayerName) { this.command(CLIENT_MESSAGE_TYPES.RENAME, { nextPlayerName }) }
  setReady(ready) { this.command(CLIENT_MESSAGE_TYPES.READY, { ready }) }
  updateSettings(settings) { this.command(CLIENT_MESSAGE_TYPES.SETTINGS, settings) }
  startCountdown() { this.command(CLIENT_MESSAGE_TYPES.START_COUNTDOWN) }
  move(movementMode) { this.command(CLIENT_MESSAGE_TYPES.INPUT, { movementMode }) }
  aim(aimX, aimY) { this.command(CLIENT_MESSAGE_TYPES.AIM, { aimX, aimY }) }
  shoot(aimX, aimY) { this.command(CLIENT_MESSAGE_TYPES.SHOT, { aimX, aimY }) }
  nextRound() { this.command(CLIENT_MESSAGE_TYPES.NEXT_ROUND) }

  async reconnect(token) {
    this.emit('status', 'reconnecting')
    for (let attempt = 0; attempt < MAX_RECONNECT_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        const jitter = 0.75 + this.random() * 0.5
        const delay = Math.round(500 * (2 ** (attempt - 1)) * jitter)
        await new Promise(resolve => this.schedule(resolve, delay))
      }
      try {
        const room = await this.client.reconnect(token)
        return this.attach(room)
      } catch (error) {
        if (attempt === MAX_RECONNECT_ATTEMPTS - 1) {
          this.emit('status', 'disconnected')
          this.emit('error', { code: 'reconnect-failed', message: error.message })
        }
      }
    }
    return null
  }

  async leave() {
    this.closedIntentionally = true
    if (this.room) {
      this.command(CLIENT_MESSAGE_TYPES.LEAVE)
      await this.room.leave()
    }
    this.room = null
  }
}
