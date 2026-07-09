# Death Race Todo

This file tracks remaining implementation work only. Design decisions live in `spec.md`; completed work lives in `progress.md`.

## Real Multiplayer

- Synchronize countdown, game start, round state, eliminations, winner, scoreboard, and next-round transitions across browsers.
- Replace polling-only room updates with a live transport or equivalent real-time update path suitable for Cloudflare.
- Make host leave/end-room behavior visible to remaining clients instead of silently falling back to local/offline state.
- Verify in two browser sessions that one host can create a lobby and another player can join the same lobby by code.

## UI Cleanup

- Review the round-over and scoreboard controls after shared round state is implemented so only valid host/player actions remain visible.
