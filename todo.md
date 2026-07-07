# Death Race Todo

This file tracks what is left to do. Design decisions live in `spec.md`; completed work lives in `progress.md`.

## Setup And Documentation

- Keep `npm run lint` passing.
- Keep `npm run build` passing.

## Defender Safety

- No Defender source was found in the active repo or old workspace.
- Do not add a Defender adapter until the user provides/identifies Defender source or approves a clean-room placeholder.
- Preserve original Defender files.

## Real Multiplayer

- Replace the mocked lobby with a real room lifecycle.
- Create room creation and join flows that work from a shareable room link.
- Persist room state on the server so friends in different browsers see the same lobby, countdown, round, and scoreboard.
- Add player identity, join/leave handling, host assignment, and reconnect behavior.
- Synchronize player readiness, round start, and round transitions across connected clients.
- Send player input to the server and broadcast authoritative game state back to everyone.
- Prevent duplicate joins, stale clients, and desynced round state.
- Add a real spectator flow for late joiners and eliminated players.
- Decide and implement the actual transport layer for the live game session.
- Add deployment wiring for the multiplayer backend so friends can access it from the same hosted room.

## Game Completion

- Replace remaining temporary/local-only UI with real room and player state where applicable.
- Add game-start validation so the host cannot start until the room is ready.
- Add match persistence only if the multiplayer design needs it after the first real online loop.
- Add mobile/tablet controls only after the desktop/laptop multiplayer loop is stable.
- Add sound only after core joining, playing, and round flow are reliable.

## Later Ideas

- Persistent accounts.
- Persistent scores across sessions.
- Advanced art pipeline.
