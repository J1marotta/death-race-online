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
- automatic empty-room disposal
- protocol validation and ordering helpers in `src/multiplayer/protocol.js`

It does not yet provide a playable game. Do not point production at it until the migration tasks in `todo.md` reach cutover.

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

- lobby behavior reaches parity
- movement, stamina, shooting, NPCs, scoring, and winners are server authoritative
- reconnect and message ordering tests pass
- two remote browsers complete a multi-round game on Fly.io
- production retains a tested rollback path
