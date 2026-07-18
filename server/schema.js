import { MapSchema, schema } from '@colyseus/schema'

export const PlayerState = schema({
  id: 'string',
  name: 'string',
  role: 'string',
  ready: 'boolean',
  connected: 'boolean',
})

export const RacerState = schema({
  laneId: 'number',
  progress: 'number',
  movementMode: 'string',
  eliminated: 'boolean',
})

export const DeathRaceState = schema({
  roomCode: 'string',
  phase: 'string',
  privacy: 'string',
  roundCount: 'number',
  round: 'number',
  countdownEndsAt: 'number',
  winnerLaneId: 'number',
  hostPlayerId: 'string',
  players: { map: PlayerState, default: new MapSchema() },
  racers: { map: RacerState, default: new MapSchema() },
})
