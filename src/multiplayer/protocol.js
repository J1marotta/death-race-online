export const PROTOCOL_VERSION = 1

export const CLIENT_MESSAGE_TYPES = Object.freeze({
  CREATE: 'create',
  JOIN: 'join',
  RESUME: 'resume',
  RENAME: 'rename',
  SETTINGS: 'settings',
  READY: 'ready',
  START_COUNTDOWN: 'start-countdown',
  INPUT: 'input',
  SHOT: 'shot',
  NEXT_ROUND: 'next-round',
  LEAVE: 'leave',
})

export const SERVER_MESSAGE_TYPES = Object.freeze({
  SESSION: 'session',
  SNAPSHOT: 'snapshot',
  PRIVATE_STATE: 'private-state',
  EVENT: 'event',
  ERROR: 'error',
  CLOSED: 'closed',
})

export const MOVEMENT_MODES = Object.freeze(['stopped', 'walking', 'running'])
export const ROOM_PRIVACY = Object.freeze(['public', 'private'])
export const ROUND_COUNTS = Object.freeze([3, 5, 7])

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)
const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0
const isIntegerAtLeast = (value, minimum) => Number.isInteger(value) && value >= minimum
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value)

const payloadValidators = {
  [CLIENT_MESSAGE_TYPES.CREATE]: payload =>
    isNonEmptyString(payload.playerName) &&
    ROOM_PRIVACY.includes(payload.privacy) &&
    ROUND_COUNTS.includes(payload.roundCount),
  [CLIENT_MESSAGE_TYPES.JOIN]: payload => isNonEmptyString(payload.playerName),
  [CLIENT_MESSAGE_TYPES.RESUME]: payload => isNonEmptyString(payload.resumeToken),
  [CLIENT_MESSAGE_TYPES.RENAME]: payload => isNonEmptyString(payload.nextPlayerName),
  [CLIENT_MESSAGE_TYPES.SETTINGS]: payload =>
    (!hasOwn(payload, 'privacy') || ROOM_PRIVACY.includes(payload.privacy)) &&
    (!hasOwn(payload, 'roundCount') || ROUND_COUNTS.includes(payload.roundCount)) &&
    (hasOwn(payload, 'privacy') || hasOwn(payload, 'roundCount')),
  [CLIENT_MESSAGE_TYPES.READY]: payload => typeof payload.ready === 'boolean',
  [CLIENT_MESSAGE_TYPES.START_COUNTDOWN]: () => true,
  [CLIENT_MESSAGE_TYPES.INPUT]: payload =>
    MOVEMENT_MODES.includes(payload.movementMode),
  [CLIENT_MESSAGE_TYPES.SHOT]: payload =>
    isFiniteNumber(payload.aimX) &&
    payload.aimX >= 0 &&
    payload.aimX <= 100 &&
    isFiniteNumber(payload.aimY) &&
    payload.aimY >= 0 &&
    payload.aimY <= 100,
  [CLIENT_MESSAGE_TYPES.NEXT_ROUND]: () => true,
  [CLIENT_MESSAGE_TYPES.LEAVE]: () => true,
}

export const CLIENT_MESSAGE_SCHEMAS = Object.freeze(
  Object.fromEntries(
    Object.keys(payloadValidators).map(type => [
      type,
      Object.freeze({
        requiredEnvelope: ['protocolVersion', 'type', 'roomId', 'roundId', 'sequence'],
        identitySource: 'authenticated-session',
      }),
    ]),
  ),
)

export function validateClientMessage(message) {
  if (!isObject(message)) {
    return { ok: false, error: 'Message must be an object' }
  }
  if (message.protocolVersion !== PROTOCOL_VERSION) {
    return { ok: false, error: 'Unsupported protocol version' }
  }
  if (!hasOwn(payloadValidators, message.type)) {
    return { ok: false, error: 'Unknown message type' }
  }
  if (!isNonEmptyString(message.roomId)) {
    return { ok: false, error: 'Room id is required' }
  }
  if (!isIntegerAtLeast(message.roundId, 0)) {
    return { ok: false, error: 'Round id must be a non-negative integer' }
  }
  if (!isIntegerAtLeast(message.sequence, 1)) {
    return { ok: false, error: 'Sequence must be a positive integer' }
  }
  const payload = message.payload ?? {}
  if (!isObject(payload) || !payloadValidators[message.type](payload)) {
    return { ok: false, error: `Invalid ${message.type} payload` }
  }
  return {
    ok: true,
    value: {
      protocolVersion: PROTOCOL_VERSION,
      type: message.type,
      roomId: message.roomId.trim(),
      roundId: message.roundId,
      sequence: message.sequence,
      payload,
    },
  }
}

export function checkMessageOrder(message, { roundId, lastSequence = 0 }) {
  if (message.roundId !== roundId) {
    return {
      ok: false,
      error: message.roundId < roundId ? 'Stale round' : 'Future round',
    }
  }
  if (message.sequence <= lastSequence) {
    return { ok: false, error: 'Duplicate or out-of-order message' }
  }
  return { ok: true }
}

export function createServerEnvelope(type, payload, context) {
  if (!Object.values(SERVER_MESSAGE_TYPES).includes(type)) {
    throw new Error(`Unknown server message type: ${type}`)
  }
  return {
    protocolVersion: PROTOCOL_VERSION,
    type,
    roomId: context.roomId,
    roundId: context.roundId,
    eventId: context.eventId,
    serverTime: context.serverTime ?? Date.now(),
    payload,
  }
}
