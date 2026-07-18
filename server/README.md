# Colyseus Migration Server

This directory is the side-by-side replacement for the Cloudflare Durable Object room backend.

## Current Status

The server is intentionally inactive in the production game. The React frontend still uses `src/multiplayer/api.js`, the Cloudflare Worker, and the Durable Object room implementation. Nothing in `server/` is imported by the active frontend.

The migration server currently provides:

- a Colyseus process and health endpoint
- an isolated `DeathRaceRoom`
- synchronized lobby state
- a 20-player room limit
- random server-owned player IDs bound privately to connection sessions
- 256-bit rotating reconnection tokens with a 45-second expiry window
- versioned lobby commands with round and sequence validation
- unique room codes and display names
- self-service naming and readiness
- host-only settings and countdown start
- all-connected/all-ready start gating
- host-departure room closure
- secret server-assigned lanes disclosed only to their owning connection
- a fixed 20 Hz authoritative movement simulation
- server-owned walking, sprint stamina, elimination, progress, and finish detection
- authoritative aim-based shooting with one server-owned bullet per player
- canonical shot events, corpse protection, self-shot rules, and human kill scoring
- 20 total racers with server-filled NPC lanes
- independent seeded NPC modes, decision deadlines, speed variation, pauses, and finish adjudication
- complete resume snapshots followed by the reconnecting player's private lane state
- deterministic guest-to-NPC replacement after grace expiry and room closure after host expiry
- automatic empty-room disposal
- protocol validation and ordering helpers in `src/multiplayer/protocol.js`

It does not yet provide round progression or a frontend transport, so it is not a playable game. Do not point production at it until the migration tasks in `todo.md` reach cutover.

## Commands

```text
npm run dev:migration   # Current Vite frontend plus the inactive Colyseus server
npm run dev:colyseus    # Colyseus server only, with file watching
npm run start:colyseus  # Colyseus server only
npm run test:colyseus   # Protocol and migration-server tests
```

The local server listens on port `2567` by default and exposes `GET /health`.

## Safety Boundary

Keep the Cloudflare path intact until all of these are true:

- movement, stamina, shooting, NPCs, scoring, and winners are server authoritative
- reconnect and message ordering tests pass
- two remote browsers complete a multi-round game on Fly.io
- production retains a tested rollback path
