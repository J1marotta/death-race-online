# Death Race Todo

This file tracks what is left to do. Design decisions live in `spec.md`; completed work lives in `progress.md`.

## Setup And Documentation

- Add a manual QA checklist once gameplay exists.
- Keep `npm run lint` passing.
- Keep `npm run build` passing.

## Implementation Tasks

### Scoreboard And Rounds

- Track the host-selected number of rounds.
- Award 1 point to a human round winner.
- Award no human points for an NPC win.
- Show scoreboard after each round.
- Keep player names visible in the scoreboard.
- Let the host instantly start the next round.
- End the match after the selected number of rounds.

### Polish

- Improve pixel-art racers, lanes, crosshairs, bullet indicator, dead bodies, and reveal highlight.
- Keep all 20 lanes visible without scrolling.
- Keep text and UI readable at `1200px`.
- Replace placeholder Vite/React assets with Death Race assets.

## Defender Safety

- No Defender source was found in the active repo or old workspace.
- Do not add a Defender adapter until the user provides/identifies Defender source or approves a clean-room placeholder.
- Preserve original Defender files.

## Parking Lot

- Persistent accounts.
- Persistent scores across sessions.
- Mobile/tablet controls after the desktop/laptop MVP loop works.
- Advanced art pipeline.
- Sound.
- Backend, persistence, real-time networking, and deployment work until the local/single-browser MVP loop exists.
