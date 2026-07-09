import { describe, expect, it } from 'vitest'
import {
  canStartRoom,
  createRoomState,
  joinRoomState,
  leaveRoomState,
  setPlayerHeartbeatState,
  setPlayerReadyState,
  setPlayerInputState,
  pruneDisconnectedPlayers,
  serializeRoom,
  startNextRound,
  startRoomCountdown,
  updateRoomSettings,
  shouldDestroyRoom,
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
    expect(room.players[0].ready).toBe(false)
  })

  it('joins and leaves players cleanly', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const joined = joinRoomState(room, 'Mia')
    const rejoined = joinRoomState(
      {
        ...joined,
        players: joined.players.map((player) =>
          player.name === 'Mia' ? { ...player, connected: false, ready: false } : player,
        ),
      },
      'Mia',
    )
    const left = leaveRoomState(joined, 'Mia')

    expect(joined.players.map((player) => player.name)).toContain('Mia')
    expect(rejoined.players.find((player) => player.name === 'Mia').connected).toBe(
      true,
    )
    expect(left.players.find((player) => player.name === 'Mia').connected).toBe(false)
    expect(left.spectators).toContain('Mia')
  })

  it('does not duplicate an already connected player', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const joined = joinRoomState(room, 'Mia')
    const duplicate = joinRoomState(joined, 'Mia')

    expect(duplicate.players.filter((player) => player.name === 'Mia')).toHaveLength(1)
  })

  it('keeps late joins as spectators once the room is live', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const liveRoom = { ...room, phase: 'playing' }
    const joined = joinRoomState(liveRoom, 'Mia')

    expect(joined.players.map((player) => player.name)).not.toContain('Mia')
    expect(joined.spectators).toContain('Mia')
  })

  it('reassigns the host when the host leaves', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const joined = joinRoomState(room, 'Mia')
    const left = leaveRoomState(joined, 'James')

    expect(left.hostId).toBe('mia')
    expect(left.players.find((player) => player.name === 'Mia').role).toBe('host')
    expect(left.players.find((player) => player.name === 'Mia').ready).toBe(false)
  })

  it('tracks ready state for connected players', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const joined = joinRoomState(room, 'Mia')
    const readyRoom = setPlayerReadyState(joined, 'Mia', true)

    expect(readyRoom.players.find((player) => player.name === 'Mia').ready).toBe(true)
  })

  it('updates heartbeat timestamps for connected players', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const stale = {
      ...room,
      players: room.players.map((player) => ({
        ...player,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })),
    }
    const heartbeatRoom = setPlayerHeartbeatState(stale, 'James')
    const host = heartbeatRoom.players.find((player) => player.name === 'James')

    expect(host.connected).toBe(true)
    expect(host.updatedAt).not.toBe('2024-01-01T00:00:00.000Z')
  })

  it('stores the latest input for a player', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const nextRoom = setPlayerInputState(room, 'James', {
      movementMode: 'walking',
      firing: false,
    })

    expect(nextRoom.inputs.James.movementMode).toBe('walking')
  })

  it('ignores input from a disconnected player', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const disconnected = leaveRoomState(room, 'James')
    const nextRoom = setPlayerInputState(disconnected, 'James', {
      movementMode: 'running',
    })

    expect(nextRoom.inputs.James).toBeUndefined()
  })

  it('prunes disconnected players that have been gone too long', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const disconnected = leaveRoomState(joinRoomState(room, 'Mia'), 'Mia')
    const stale = {
      ...disconnected,
      players: disconnected.players.map((player) =>
        player.name === 'Mia'
          ? { ...player, updatedAt: '2024-01-01T00:00:00.000Z' }
          : player,
      ),
    }
    const pruned = pruneDisconnectedPlayers(stale, 100000)

    expect(pruned.players.find((player) => player.name === 'Mia')).toBeUndefined()
  })

  it('marks stale connected players disconnected before room cleanup', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const stale = {
      ...room,
      players: room.players.map((player) => ({
        ...player,
        ready: true,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })),
    }
    const pruned = pruneDisconnectedPlayers(stale, 1)
    const host = pruned.players.find((player) => player.name === 'James')

    expect(host.connected).toBe(false)
    expect(host.ready).toBe(false)
    expect(shouldDestroyRoom(pruned)).toBe(true)
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

  it('starts the next round by incrementing the round and keeping the countdown phase', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const nextRound = startNextRound(room)

    expect(nextRound.phase).toBe('countdown')
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

  it('only allows a room to start when every connected player is ready', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const readyHost = setPlayerReadyState(room, 'James', true)
    const joined = setPlayerReadyState(joinRoomState(readyHost, 'Mia'), 'Mia', true)
    const disconnected = leaveRoomState(joined, 'Mia')

    expect(canStartRoom(room)).toBe(false)
    expect(canStartRoom(readyHost)).toBe(true)
    expect(canStartRoom(joined)).toBe(true)
    expect(canStartRoom(disconnected)).toBe(false)
  })

  it('destroys a room when nobody is connected or the host is gone', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const joined = joinRoomState(room, 'Mia')
    const hostLeft = leaveRoomState(joined, 'James')
    const everyoneLeft = leaveRoomState(hostLeft, 'Mia')

    expect(shouldDestroyRoom(hostLeft, { hostLeft: true })).toBe(true)
    expect(shouldDestroyRoom(everyoneLeft)).toBe(true)
  })
})
