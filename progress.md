# Death Race Progress

Last updated: 2026-07-07

## Current State

- Active workspace: `C:\Users\James\Documents\Code\deathRace`
- Old workspace: `C:\Users\James\Documents\death race`
- Stack: React + Vite + JavaScript modules + npm + Oxlint
- Git branch: `codex/task-01-network-scope`
- Initial commit: `45b2434 Initial Death Race project setup`
- Planning cleanup commit: `d59ecfb Clean up project planning docs`
- The app shows an initial Death Race shell with temporary state controls and a 20-lane preview.
- Dependencies are installed locally.
- Build output goes to `dist`, which is ignored by git.
- The old workspace currently contains only a `.git` folder.
- No Defender source files have been found in the active repo.
- Remote origin is `https://github.com/J1marotta/death-race-online.git`.

## Completed

- Created/moved the active project to `C:\Users\James\Documents\Code\deathRace`.
- Initialized git in the active project folder.
- Created the React + Vite project structure.
- Added npm scripts for `dev`, `build`, `lint`, and `preview`.
- Added Oxlint configuration.
- Installed dependencies.
- Recovered the concrete MVP from the attached pasted text.
- Cleaned the planning docs into separate roles:
  - `spec.md`: design source of truth.
  - `progress.md`: completed work and current state.
  - `todo.md`: remaining work.
- Replaced the default Vite README with a minimal project README.
- Removed the redundant `CHAT_GAME_CONTEXT.md` handoff after moving its useful content into the core docs.
- Recorded the `1200px` laptop presentation target.
- Recorded the Defender preservation guardrail.
- Made the initial baseline commit.
- Added GitHub remote origin.
- Replaced the default Vite starter screen with the initial Death Race app shell.
- Added explicit UI states for `menu`, `lobby`, `countdown`, `playing`, `paused`, `roundOver`, `scoreboard`, and `gameOver`.
- Added a temporary 20-lane race preview sized for the `1200px` laptop target.
- Added a local mock lobby with room code/link, privacy choice, player roster, round count host controls, start action, and late-joiner spectator display.
- Upgraded the race preview into a 20-lane playfield with five repeated pixel-art archetypes and depth styling.
- Added deterministic round setup with hidden human assignments, NPC-filled lanes, countdown gating, and reveal-only player names.
- Added keyboard movement for the local hidden racer with `Space` walking, `Left Shift` running, stop-on-release, and stale-input clearing.
- Added local NPC walk/stop/run simulation that can advance NPC racers without giving them shooting behavior.
- Added mouse aiming, visible human bullet indicators, and one-shot local firing with crosshair hiding after the shot.
- Added shot-racer elimination with visible bodies and eliminated-human spectator status while the round keeps running.
- Added finish-line winner detection with human/NPC winner flows, NPC shame copy, and post-round human reveal highlighting.

## Verification

- `npm run lint` passed on 2026-07-07 after docs cleanup.
- `npm run build` passed on 2026-07-07 after docs cleanup.
- Confirmed the active repo has baseline commit `45b2434`.
- Confirmed the old workspace currently contains only `.git`.
- Confirmed no filenames in the active repo contain `defender`, `defence`, or `defense`.

## Guardrails

- Do not overwrite, replace, delete, or casually refactor existing Defender code.
- If Defender code exists elsewhere, locate it and document its source files before changing gameplay code.
- Keep generated folders and logs out of commits unless there is a specific reason to include them.
- Keep commits small and stable after the baseline.

## Task Log

### task 01 : Decide Network Scope Before Multiplayer Code

- Decision: implement the MVP first as a local/single-browser prototype with mocked lobby UI and local simulated players.
- Reason: the playable hidden-identity loop can be built and tested without prematurely choosing backend, deployment, websocket, or persistence architecture.
- Architecture note: keep lobby/player/round state modular so a real-time transport can replace the mock/local layer later.
- Updated `spec.md` and `todo.md` to reflect the decision.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 196662, timeUsedSeconds 85.

### task 02 : Decide Backend Choice

- Decision: use no backend for the first playable loop; keep MVP state local and in-memory.
- Reason: this matches the local/single-browser prototype scope and keeps the team focused on validating the hidden-identity racing loop before selecting backend, websocket, persistence, or deployment architecture.
- Architecture note: lobby, player, and round state should still be modular so a backend transport can replace the local state layer later.
- Updated `spec.md` and `todo.md` to reflect the decision.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 206144, timeUsedSeconds 152.

### task 03 : Decide Deployment Target

- Decision: use no deployment target for the first playable loop; develop and verify locally with Vite dev/preview.
- Reason: deployment should follow the playable loop and backend/networking decisions, not lead them.
- Architecture note: keep the app as a normal Vite build so a static host or later full-stack host can be chosen without reshaping the game.
- Updated `spec.md` and `todo.md` to reflect the decision.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 212065, timeUsedSeconds 198.

### task 04 : Decide Mobile Tablet Support

- Decision: target desktop/laptop for MVP; defer mobile and tablet controls until the `1200px` laptop loop works.
- Reason: the recovered design is built around 20 no-scroll lanes, mouse aiming, visible crosshairs, `Space`, and `Left Shift`, so desktop/laptop is the cleanest first playable target.
- Updated `spec.md` and `todo.md` to reflect the decision.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 217439, timeUsedSeconds 253.

### task 05 : Decide Scoreboard Point Values

- Decision: award 1 point to the human winner of a round; award no human points when an NPC wins.
- Reason: this keeps the scoreboard clear for the MVP while preserving the NPC shame/reveal moment as its own consequence.
- Updated `spec.md` and `todo.md` to reflect the decision.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 224730, timeUsedSeconds 323.

### task 06 : Locate Defender Source

- Searched active repo filenames for `defender`, `defence`, and `defense`: no source files found.
- Searched active repo contents for `defender`, `defence`, and `defense`: only planning/documentation references found.
- Checked old workspace `C:\Users\James\Documents\death race`: it contains only `.git`.
- Searched `C:\Users\James\Documents` filenames for Defender/defence/defense terms: only an unrelated `X-Morph Defense` folder was found.
- Decision: no protected Defender source is currently available in this project; Defender integration waits until the user provides or identifies its source.
- Updated `spec.md` and `todo.md` to reflect the result.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 232934, timeUsedSeconds 384.

### task 07 : Build App Shell And State Model

- Replaced the default Vite starter UI with a Death Race shell.
- Added temporary state controls for `menu`, `lobby`, `countdown`, `playing`, `paused`, `roundOver`, `scoreboard`, and `gameOver`.
- Added an initial 20-lane race preview with placeholder racer archetypes, reveal tags, and loaded-player crosshairs for the relevant states.
- Kept the shell constrained to the `1200px` laptop target.
- Updated `todo.md` so the completed app shell work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 254163, timeUsedSeconds 592.

### task 08 : Build Lobby UI

- Added local create/join lobby details with room code `DR-2048` and a mock room link.
- Added public/private lobby selection.
- Added visible player names in the lobby with host/ready labels.
- Added host round-count controls and a start-round action.
- Added late joiner handling by showing a spectator list once a round is in progress.
- Updated `todo.md` so the completed lobby work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 381154, timeUsedSeconds 777.

### task 09 : Build Playfield

- Replaced the temporary race preview with a named 20-lane playfield.
- Added deterministic lane progress/depth values so all 20 lanes fit in one compact track.
- Added five CSS pixel-art racer archetypes: driver, runner, mask, coat, and cap.
- Ensured repeated archetypes reuse the same class and visual parts so matching looks are identical.
- Added stronger finish markers, lane striping, and depth offsets for the laptop-width presentation.
- Updated `todo.md` so the completed playfield work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 467280, timeUsedSeconds 908.

### task 10 : Build Round Setup

- Added deterministic local round setup that fills all 20 lanes with either a hidden human assignment or an NPC.
- Secretly assigned each human player to a racer lane and stored the assignment for reveal states.
- Kept player names hidden from live racers and only showed them during `roundOver` and `scoreboard`.
- Added a `3, 2, 1, go` countdown panel.
- Locked the playfield visually and withheld crosshairs during countdown before `go`.
- Updated `todo.md` so the completed round setup work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 500440, timeUsedSeconds 1009.

### task 11 : Build Movement

- Added global keyboard handling for `Space` walk and `Left Shift` run during the `playing` state.
- Moved the local player's secretly assigned racer forward while movement keys are held.
- Stopped the racer when movement keys are released.
- Cleared movement on non-playing states, window blur, and visibility changes to prevent stale input.
- Made running faster than walking without adding stamina, cooldown, noise UI, or extra indicators.
- Updated `todo.md` so the completed movement work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 616955, timeUsedSeconds 1107.

### task 12 : Build NPC Behavior

- Added deterministic NPC behavior patterns with walk, stop, and occasional run states.
- Advanced NPC racers during `playing` so they can plausibly reach the finish in later winner logic.
- Reused movement animation classes so NPC hesitation and running are visible on the track.
- Added a live NPC summary that states NPCs never shoot.
- Kept NPCs out of all crosshair and shooting affordances.
- Updated `todo.md` so the completed NPC work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 657097, timeUsedSeconds 1205.

### task 13 : Build Aiming And Shooting

- Added mouse-relative aiming over the playfield during `playing`.
- Kept color-coded crosshairs visible for loaded human-controlled racers.
- Added visible bullet indicators for every human assignment.
- Implemented Mouse 1 firing for the local player.
- Enforced one local bullet per round and reset bullets when a new countdown starts.
- Allowed the shot target to be any lane, including the local player's own lane.
- Hid the local player's crosshair after firing.
- Updated `todo.md` so the completed aiming and shooting work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 690184, timeUsedSeconds 1352.

### task 14 : Build Elimination And Spectating

- Fixed the controlled-racer initialization order so the app can safely initialize aim state.
- Marked the aimed lane as eliminated when the local player fires.
- Stopped eliminated racers from moving and hid their crosshairs.
- Left eliminated racers visible as dead bodies on the track.
- Moved any human whose racer was shot into the spectator list until the next round reset.
- Kept the round in `playing` after eliminations.
- Updated `todo.md` so the completed elimination and spectating work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 735190, timeUsedSeconds 1527.

### task 15 : Build Winner And Reveal

- Replaced the manual live-round winner shortcut with finish-line detection.
- Ended the round only when a non-eliminated racer reaches the finish threshold.
- Added human winner copy and NPC winner shame copy.
- Preserved the winner's finish position after the app transitions to `roundOver`.
- Revealed and highlighted all human-controlled racers after the winner is declared.
- Added a winner panel and winner lane marker.
- Fixed the hook dependency warning in winner detection by stabilizing live progress calculation.
- Updated `todo.md` so the completed winner and reveal work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 793749, timeUsedSeconds 1751.
