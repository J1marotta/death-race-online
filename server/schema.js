import { MapSchema, schema } from '@colyseus/schema'

export const PlayerState = schema({
  id: 'string',
  name: 'string',
  role: 'string',
  ready: 'boolean',
  connected: 'boolean',
})

export const DeathRaceState = schema({
  roomCode: 'string',
  phase: 'string',
  privacy: 'string',
  roundCount: 'number',
  round: 'number',
  hostSessionId: 'string',
  players: { map: PlayerState, default: new MapSchema() },
})
