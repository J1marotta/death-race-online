import { describe, expect, it } from 'vitest'
import {
  evaluateInputSend,
  FULL_RATE_PROGRESS,
  PROGRESS_CORRECTION_INTERVAL_MS,
} from './inputCadence'

const snapshot = (overrides = {}) => ({
  playerName: 'James',
  movementMode: 'running',
  laneId: 7,
  progress: 20,
  firing: false,
  ...overrides,
})

const sent = (input, sentAt) => ({
  payload: JSON.stringify(input),
  signature: `${input.playerName}|${input.movementMode}|${input.laneId}|${input.firing}`,
  sentAt,
})

describe('evaluateInputSend', () => {
  it('skips identical payloads entirely', () => {
    const input = snapshot()
    expect(evaluateInputSend(sent(input, 0), input, 10_000)).toBeNull()
  })

  it('suppresses progress-only drift inside the correction interval', () => {
    const previous = sent(snapshot({ progress: 20 }), 1000)
    const next = snapshot({ progress: 21 })
    expect(
      evaluateInputSend(previous, next, 1000 + PROGRESS_CORRECTION_INTERVAL_MS - 50),
    ).toBeNull()
  })

  it('sends a progress correction once the interval elapses', () => {
    const previous = sent(snapshot({ progress: 20 }), 1000)
    const next = snapshot({ progress: 25 })
    const decision = evaluateInputSend(
      previous,
      next,
      1000 + PROGRESS_CORRECTION_INTERVAL_MS,
    )
    expect(decision).toMatchObject({ payload: JSON.stringify(next) })
  })

  it('sends movement mode changes immediately', () => {
    const previous = sent(snapshot({ movementMode: 'running' }), 1000)
    const next = snapshot({ movementMode: 'stopped', progress: 20.5 })
    expect(evaluateInputSend(previous, next, 1010)).not.toBeNull()
  })

  it('sends firing changes immediately', () => {
    const previous = sent(snapshot({ firing: false }), 1000)
    const next = snapshot({ firing: true, progress: 20.5 })
    expect(evaluateInputSend(previous, next, 1010)).not.toBeNull()
  })

  it('runs at full rate in the final stretch so the finish adjudicates fresh', () => {
    const previous = sent(snapshot({ progress: FULL_RATE_PROGRESS }), 1000)
    const next = snapshot({ progress: FULL_RATE_PROGRESS + 0.3 })
    expect(evaluateInputSend(previous, next, 1050)).not.toBeNull()
  })
})
