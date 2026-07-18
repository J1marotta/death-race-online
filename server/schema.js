import { MapSchema, schema } from '@colyseus/schema'

export const PlayerState = schema({
  id: 'string',
  connectionId: 'string',
  name: 'string',
  role: 'string',
  ready: 'boolean',
  connected: 'boolean',
  score: 'number',
  kills: 'number',
  hasBullet: 'boolean',
})

export const RacerState = schema({
  laneId: 'number',
  progress: 'number',
  movementMode: 'string',
  eliminated: 'boolean',
  revealedName: 'string',
})

export const ShotState = schema({
  eventId: 'string',
  shooterName: 'string',
  laneId: 'number',
  victimName: 'string',
  victimType: 'string',
  impactX: 'number',
  hit: 'boolean',
  scored: 'boolean',
})

export const CrosshairState = schema({
  id: 'string',
  aimX: 'number',
  aimY: 'number',
  colorIndex: 'number',
  hasBullet: 'boolean',
})

export const DeathRaceState = schema({
  roomCode: 'string',
  phase: 'string',
  privacy: 'string',
  roundCount: 'number',
  round: 'number',
  countdownEndsAt: 'number',
  winnerLaneId: 'number',
  winnerName: 'string',
  winnerType: 'string',
  speedMultiplier: 'number',
  hostPlayerId: 'string',
  players: { map: PlayerState, default: new MapSchema() },
  racers: { map: RacerState, default: new MapSchema() },
  crosshairs: { map: CrosshairState, default: new MapSchema() },
  shots: { map: ShotState, default: new MapSchema() },
})
