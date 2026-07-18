# Colyseus Migration Server

This directory contains the authoritative Colyseus replacement for the Cloudflare Durable Object room backend.

## Current Status

The production React frontend connects to this server over WebSockets. Cloudflare Pages serves static frontend files only; it does not own live room state.

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

The browser transport lives in `src/multiplayer/colyseusTransport.js` and the active surface in `src/ColyseusApp.jsx`. A real two-client SDK harness covers reconnect, shooting, three complete rounds, final scoring, and room disposal against Fly.io.

This is the live production game server. The browser transport, complete round progression, hosted acceptance harness, and disposal behavior are all active.

## Commands

```text
npm run dev:game        # Vite frontend plus the local Colyseus server
npm run dev:colyseus    # Colyseus server only, with file watching
npm run start:colyseus  # Colyseus server only
npm run test:colyseus   # Protocol and migration-server tests
```

The local server listens on port `2567` by default and exposes `GET /health`.

## Proven Cutover Boundary

The old Cloudflare path was removed only after all of these became true:

- movement, stamina, shooting, NPCs, scoring, and winners are server authoritative
- reconnect and message ordering tests pass
- two remote browsers complete a multi-round game on Fly.io
- production retains a tested rollback path
