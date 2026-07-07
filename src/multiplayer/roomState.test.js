import { describe, expect, it } from 'vitest'
import {
  createRoomState,
  joinRoomState,
  leaveRoomState,
  serializeRoom,
  startNextRound,
  startRoomCountdown,
  updateRoomSettings,
} from './roomState'

describe('roomState', () => {
  it('creates a lobby with a host', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })

    expect(room.players).toHaveLength(1)
    expect(room.players[0].role).toBe('host')
    expect(room.hostId).toBe('james')
  })

  it('joins and leaves players cleanly', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const joined = joinRoomState(room, 'Mia')
    const left = leaveRoomState(joined, 'Mia')

    expect(joined.players.map((player) => player.name)).toContain('Mia')
    expect(left.players.find((player) => player.name === 'Mia').connected).toBe(
      false,
    )
    expect(left.spectators).toContain('Mia')
  })

  it('updates lobby settings and round flow', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const updated = updateRoomSettings(room, { privacy: 'private', roundCount: 7 })
    const countdown = startRoomCountdown(updated)
    const nextRound = startNextRound(countdown)

    expect(updated.privacy).toBe('private')
    expect(updated.roundCount).toBe(7)
    expect(countdown.phase).toBe('countdown')
    expect(nextRound.round).toBe(2)
  })

  it('serializes the public room shape', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })

    expect(serializeRoom(room)).toMatchObject({
      roomCode: 'DR-2048',
      phase: 'lobby',
      round: 1,
    })
  })
})
