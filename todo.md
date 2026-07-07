# Death Race Todo

This file tracks what is left to do. Design decisions live in `spec.md`; completed work lives in `progress.md`.

## Setup And Documentation

- Add a manual QA checklist once gameplay exists.
- Keep `npm run lint` passing.
- Keep `npm run build` passing.

## Implementation Tasks

### Lobby

- Add create/join lobby UI with room code/link.
- Support public/private lobby choice.
- Show player names in the lobby.
- Add host controls for round count and start.
- Represent late joiners as spectators once a round is in progress.

### Playfield

- Build a 20-lane no-scroll race layout.
- Target a polished `1200px` laptop presentation.
- Add 5 pixel-art character archetypes repeated 4 times.
- Ensure repeated archetypes are visually identical.
- Add slight depth/perspective like the reference screenshot.

### Round Setup

- Fill empty slots with NPCs so each round has exactly 20 racers.
- Secretly assign one racer to each human player.
- Keep player names hidden from racers during live play.
- Store assignments for end-of-round reveal.
- Add `3, 2, 1, go` countdown.
- Disable movement and shooting before `go`.

### Movement

- Implement `Space` to walk.
- Implement `Left Shift` to run.
- Stop the racer when no movement key is pressed.
- Prevent stale input when focus changes.
- Make running faster without adding stamina, cooldown, noise UI, or extra indicators.

### NPCs

- Add NPC walk/stop/occasional-run behavior.
- Tune NPCs to imitate human hesitation and intent.
- Ensure NPCs never shoot.
- Ensure NPCs can plausibly win.

### Aiming And Shooting

- Add mouse aiming.
- Add visible color-coded crosshairs for loaded human players.
- Add single-bullet indicator.
- Implement Mouse 1 firing.
- Enforce exactly one bullet per human player per round.
- Allow shooting any racer/lane, including self.
- Hide a player's crosshair after firing.

### Elimination And Spectating

- Eliminate shot racers.
- Leave dead bodies visible.
- Put eliminated players into spectator mode until the next round.
- Keep the round running after eliminations.

### Winner And Reveal

- End the round only when a racer wins.
- Support human winner flow.
- Support NPC winner flow.
- Show NPC shame messaging if an NPC wins.
- Reveal/highlight all human-controlled racers after the winner is declared.

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
