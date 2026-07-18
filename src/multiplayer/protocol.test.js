import { describe, expect, it } from 'vitest'
import {
  CLIENT_MESSAGE_TYPES,
  PROTOCOL_VERSION,
  SERVER_MESSAGE_TYPES,
  checkMessageOrder,
  createServerEnvelope,
  validateClientMessage,
} from './protocol'

const inputMessage = overrides => ({
  protocolVersion: PROTOCOL_VERSION,
  type: CLIENT_MESSAGE_TYPES.INPUT,
  roomId: 'DRTEST',
  roundId: 2,
  sequence: 7,
  payload: { movementMode: 'walking' },
  ...overrides,
})

describe('versioned multiplayer protocol', () => {
  it('accepts a valid movement-intent message without client-authored progress', () => {
    const result = validateClientMessage(inputMessage())

    expect(result.ok).toBe(true)
    expect(result.value.payload).toEqual({ movementMode: 'walking' })
    expect(result.value.payload.progress).toBeUndefined()
  })

  it('accepts bounded aim coordinates without a claimed player or lane', () => {
    const result = validateClientMessage(inputMessage({
      type: CLIENT_MESSAGE_TYPES.AIM,
      payload: { aimX: 44.5, aimY: 72 },
    }))

    expect(result.ok).toBe(true)
    expect(result.value.payload).toEqual({ aimX: 44.5, aimY: 72 })
    expect(result.value.payload).not.toHaveProperty('playerId')
    expect(result.value.payload).not.toHaveProperty('laneId')
  })

  it('rejects malformed, unknown, and incompatible messages', () => {
    expect(validateClientMessage(null)).toEqual({
      ok: false,
      error: 'Message must be an object',
    })
    expect(validateClientMessage(inputMessage({ protocolVersion: 99 })).error).toBe(
      'Unsupported protocol version',
    )
    expect(validateClientMessage(inputMessage({ type: 'teleport' })).error).toBe(
      'Unknown message type',
    )
    expect(validateClientMessage(inputMessage({ sequence: 0 })).error).toBe(
      'Sequence must be a positive integer',
    )
  })

  it('rejects invalid movement, shot, and settings payloads', () => {
    expect(
      validateClientMessage(inputMessage({ payload: { movementMode: 'teleporting' } })).ok,
    ).toBe(false)
    expect(
      validateClientMessage(
        inputMessage({
          type: CLIENT_MESSAGE_TYPES.SHOT,
          payload: { aimX: 101, aimY: 20 },
        }),
      ).ok,
    ).toBe(false)
    expect(
      validateClientMessage(
        inputMessage({
          type: CLIENT_MESSAGE_TYPES.SETTINGS,
          payload: { roundCount: 99 },
        }),
      ).ok,
    ).toBe(false)
  })

  it('rejects stale rounds, future rounds, duplicates, and reordered messages', () => {
    const message = inputMessage()

    expect(checkMessageOrder(message, { roundId: 3, lastSequence: 1 }).error).toBe(
      'Stale round',
    )
    expect(checkMessageOrder(message, { roundId: 1, lastSequence: 1 }).error).toBe(
      'Future round',
    )
    expect(checkMessageOrder(message, { roundId: 2, lastSequence: 7 }).error).toBe(
      'Duplicate or out-of-order message',
    )
    expect(checkMessageOrder(message, { roundId: 2, lastSequence: 6 }).ok).toBe(true)
  })

  it('creates server envelopes with authoritative timestamps and event ids', () => {
    expect(
      createServerEnvelope(
        SERVER_MESSAGE_TYPES.EVENT,
        { name: 'round-started' },
        {
          roomId: 'DRTEST',
          roundId: 2,
          eventId: 'event-9',
          serverTime: 1234,
        },
      ),
    ).toEqual({
      protocolVersion: PROTOCOL_VERSION,
      type: SERVER_MESSAGE_TYPES.EVENT,
      roomId: 'DRTEST',
      roundId: 2,
      eventId: 'event-9',
      serverTime: 1234,
      payload: { name: 'round-started' },
    })
  })
})
