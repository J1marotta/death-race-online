import { describe, expect, it } from 'vitest'
import {
  canStartRoom,
  createRoomState,
  finishRoomRound,
  isRoomIdleExpired,
  joinRoomState,
  leaveRoomState,
  renamePlayerState,
  setPlayerHeartbeatState,
  setPlayerReadyState,
  setPlayerInputState,
  pruneDisconnectedPlayers,
  recordRoomShot,
  serializeRoom,
  showRoomScoreboard,
  startNextRound,
  startRoomCountdown,
  startRoomPlaying,
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

  it('flags rooms idle-expired only after the inactivity window', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const idleTtlMs = 30 * 60 * 1000
    const createdAt = Date.parse(room.lastActivityAt)

    expect(isRoomIdleExpired(room, idleTtlMs, createdAt + idleTtlMs - 1000)).toBe(false)
    expect(isRoomIdleExpired(room, idleTtlMs, createdAt + idleTtlMs + 1000)).toBe(true)
    expect(
      isRoomIdleExpired(
        { ...room, lastActivityAt: undefined },
        idleTtlMs,
        Date.parse(room.updatedAt) + 1000,
      ),
    ).toBe(false)
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

  it('renames a connected player in the lobby and preserves host ownership', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const renamed = renamePlayerState(room, 'James', 'Jules')

    expect(renamed.hostId).toBe('jules')
    expect(renamed.players[0]).toMatchObject({
      id: 'jules',
      name: 'Jules',
      role: 'host',
    })
  })

  it('rejects duplicate or live player renames', () => {
    const room = joinRoomState(
      createRoomState({
        roomCode: 'DR-2048',
        hostName: 'James',
      }),
      'Mia',
    )
    const duplicate = renamePlayerState(room, 'Mia', 'James')
    const liveRename = renamePlayerState({ ...room, phase: 'playing' }, 'Mia', 'Ava')

    expect(duplicate.players.find((player) => player.name === 'Mia')).toBeTruthy()
    expect(duplicate.players.find((player) => player.name === 'James')).toBeTruthy()
    expect(liveRename.players.find((player) => player.name === 'Ava')).toBeUndefined()
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

  it('tracks shared round shots, winners, scores, and scoreboard phase', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const countdown = startRoomCountdown(room)
    const playing = startRoomPlaying(countdown)
    const shot = recordRoomShot(playing, { shooterName: 'James', laneId: 7 })
    const duplicateShot = recordRoomShot(shot, { shooterName: 'James', laneId: 8 })
    const roundOver = finishRoomRound(duplicateShot, {
      laneId: 7,
      winnerName: 'James',
      winnerType: 'human',
      finalProgress: 91,
    })
    const scoreboard = showRoomScoreboard(roundOver)

    expect(countdown.roundState.shotRacerIds).toEqual([])
    expect(playing.phase).toBe('playing')
    expect(shot.roundState.shotRacerIds).toEqual([7])
    expect(shot.roundState.shots[0]).toMatchObject({
      shooterName: 'James',
      laneId: 7,
      victimType: 'npc',
    })
    expect(duplicateShot.roundState.shotRacerIds).toEqual([7])
    expect(roundOver.phase).toBe('roundOver')
    expect(roundOver.roundState.scores.James).toBe(3)
    expect(roundOver.roundState.history[0]).toMatchObject({
      round: 1,
      winnerName: 'James',
      winnerType: 'human',
      laneId: 7,
    })
    expect(scoreboard.phase).toBe('scoreboard')
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
      roundState: {
        round: 1,
        scores: {
          James: 0,
        },
      },
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

  it('clears a leaving player score when their browser session ends', () => {
    const room = createRoomState({
      roomCode: 'DR-2048',
      hostName: 'James',
    })
    const joined = joinRoomState(room, 'Mia')
    const scored = finishRoomRound(joined, {
      laneId: 7,
      winnerName: 'Mia',
      winnerType: 'human',
      finalProgress: 93,
    })
    const left = leaveRoomState(scored, 'Mia')

    expect(scored.roundState.scores.Mia).toBe(3)
    expect(left.roundState.scores.Mia).toBe(0)
    expect(left.roundState.scores.James).toBe(0)
  })

  it('awards a point and a kill for shooting a real player lane', () => {
    const room = joinRoomState(
      createRoomState({
        roomCode: 'DR-2048',
        hostName: 'James',
      }),
      'Mia',
    )
    const playing = startRoomPlaying(startRoomCountdown(setPlayerReadyState(
      setPlayerReadyState(room, 'James', true),
      'Mia',
      true,
    )))
    const withInputs = setPlayerInputState(playing, 'Mia', {
      laneId: 7,
      progress: 40,
      movementMode: 'running',
    })
    const shot = recordRoomShot(withInputs, { shooterName: 'James', laneId: 7 })
    const roundOver = finishRoomRound(shot, {
      laneId: 12,
      winnerName: 'James',
      winnerType: 'human',
      finalProgress: 94,
    })

    expect(shot.roundState.shots[0]).toMatchObject({
      shooterName: 'James',
      laneId: 7,
      victimName: 'Mia',
      victimType: 'human',
    })
    expect(shot.roundState.scores.James).toBe(1)
    expect(shot.roundState.kills.James).toBe(1)
    expect(roundOver.roundState.scores.James).toBe(4)
    expect(roundOver.roundState.kills.James).toBe(1)
  })

  it('gives no kill credit for NPC lanes, corpse shots, or self-shots', () => {
    const room = joinRoomState(
      joinRoomState(
        createRoomState({
          roomCode: 'DR-2048',
          hostName: 'James',
        }),
        'Mia',
      ),
      'Ava',
    )
    const withInputs = setPlayerInputState(
      setPlayerInputState(startRoomPlaying(room), 'Mia', { laneId: 7, progress: 30 }),
      'James',
      { laneId: 4, progress: 25 },
    )
    const npcShot = recordRoomShot(withInputs, { shooterName: 'James', laneId: 15 })
    const humanKill = recordRoomShot(withInputs, { shooterName: 'James', laneId: 7 })
    const corpseShot = recordRoomShot(humanKill, { shooterName: 'Ava', laneId: 7 })
    const selfShot = recordRoomShot(withInputs, { shooterName: 'James', laneId: 4 })

    expect(npcShot.roundState.scores.James).toBe(0)
    expect(npcShot.roundState.kills.James).toBe(0)
    expect(humanKill.roundState.kills.James).toBe(1)
    expect(corpseShot.roundState.scores.Ava).toBe(0)
    expect(corpseShot.roundState.kills.Ava).toBe(0)
    expect(selfShot.roundState.scores.James).toBe(0)
    expect(selfShot.roundState.kills.James).toBe(0)
  })

  it('carries kills across rounds, renames, and zeroes them on leave', () => {
    const room = joinRoomState(
      createRoomState({
        roomCode: 'DR-2048',
        hostName: 'James',
      }),
      'Mia',
    )
    const withInputs = setPlayerInputState(startRoomPlaying(room), 'Mia', {
      laneId: 7,
      progress: 30,
    })
    const shot = recordRoomShot(withInputs, { shooterName: 'James', laneId: 7 })
    const nextRound = startNextRound(shot)
    const renamed = renamePlayerState({ ...nextRound, phase: 'lobby' }, 'James', 'Jules')
    const left = leaveRoomState(shot, 'James')

    expect(nextRound.roundState.kills.James).toBe(1)
    expect(nextRound.roundState.shots).toEqual([])
    expect(renamed.roundState.kills.Jules).toBe(1)
    expect(renamed.roundState.kills.James).toBeUndefined()
    expect(left.roundState.kills.James).toBe(0)
  })

  it('clears stale inputs when a new round begins', () => {
    const room = setPlayerInputState(
      startRoomPlaying(
        createRoomState({
          roomCode: 'DR-2048',
          hostName: 'James',
        }),
      ),
      'James',
      { laneId: 4, progress: 55 },
    )
    const countdown = startRoomCountdown(setPlayerReadyState(room, 'James', true))
    const nextRound = startNextRound(room)

    expect(countdown.inputs).toEqual({})
    expect(nextRound.inputs).toEqual({})
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
