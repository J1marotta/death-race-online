# Death Race Todo

This file tracks remaining implementation work only. Design decisions live in `spec.md`; completed work lives in `progress.md`.

## Real Multiplayer

- Track the current client identity so only the host can see and use the start-game control.
- Keep ready state tied to the joined username and show ready/not-ready for every connected player.
- Replace the local-only fixed `PLAYERS`/`HUMAN_ASSIGNMENTS` gameplay setup with assignments derived from the actual room roster.
- Synchronize countdown, game start, round state, eliminations, winner, scoreboard, and next-round transitions across browsers.
- Replace polling-only room updates with a live transport or equivalent real-time update path suitable for Cloudflare.
- Make host leave/end-room behavior visible to remaining clients instead of silently falling back to local/offline state.
- Verify in two browser sessions that one host can create a lobby and another player can join the same lobby by code.

## UI Cleanup

- Remove or rewrite outdated copy in `progress.md` and `spec.md` that still describes the multiplayer flow as mocked/local.
- Review lobby controls after the networking pass and remove controls that should not be visible outside their valid state.
