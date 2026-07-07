# Death Race Progress

Last updated: 2026-07-07

## Current State

- Active workspace: `C:\Users\James\Documents\Code\deathRace`
- Old workspace: `C:\Users\James\Documents\death race`
- Stack: React + Vite + JavaScript modules + npm + Oxlint
- Git branch: `codex/task-01-network-scope`
- Initial commit: `45b2434 Initial Death Race project setup`
- Planning cleanup commit: `d59ecfb Clean up project planning docs`
- The app shows the playable Death Race shell with a 20-lane track, local controls, and a lobby shell that now syncs room state to the backend API.
- Dependencies are installed locally.
- Build output goes to `dist`, which is ignored by git.
- The old workspace currently contains only a `.git` folder.
- No Defender source files have been found in the active repo.
- Remote origin is `https://github.com/J1marotta/death-race-online.git`.
- Cloudflare Pages is deployed for the front end.
- A separate Cloudflare Worker is deployed for room coordination.
- The front end currently syncs lobby create/settings/countdown actions to the backend API and shows room sync status in the HUD.
- The lobby now joins through the backend API, hydrates the connected roster from server state, and leaves cleanly on teardown.

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
- Added scoreboard, round history, human-only scoring, next-round flow, and game-over flow after the host-selected round count.
- Added a README manual QA checklist for the playable loop.
- Polished the 1200px presentation, Death Race favicon/title, racer/crosshair/bullet/body/reveal visuals, and removed unused Vite/React assets.
- Added a shared multiplayer room-state module for room creation, joining, leaving, settings, countdown, and next-round flow.
- Added Cloudflare Worker room backend scaffolding and deployed it.
- Added a browser API wrapper for room create/join/update/countdown/next-round calls.
- Added tests for the room-state helpers and API wrapper.

## Verification

- `npm run lint` passed on 2026-07-07 after docs cleanup.
- `npm run build` passed on 2026-07-07 after docs cleanup.
- `npm run test` passed after adding the multiplayer room helper and API tests.
- `npm run lint` passed after adding the multiplayer room helper and API tests.
- `npm run build` passed after adding the multiplayer room helper and API tests.
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

### task 16 : Build Scoreboard And Rounds

- Added current-round tracking against the host-selected round count.
- Added player score state and visible scoreboard rows with player names.
- Awarded 1 point only when a human-controlled racer wins.
- Awarded no human points when an NPC wins.
- Added round history after each round.
- Let the host advance from scoreboard to the next round with a reset countdown.
- Ended the match after the selected number of rounds and showed final scores.
- Updated `todo.md` so the completed scoreboard and rounds work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 848306, timeUsedSeconds 1933.

### task 17 : Add Manual QA Checklist

- Added a manual QA checklist to `README.md` covering lobby, countdown, movement, aiming/shooting, eliminations, winner flow, scoreboard, and match end.
- Updated `todo.md` so the completed manual QA checklist work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 890114, timeUsedSeconds 2022.

### task 18 : Polish Playable Loop

- Replaced the browser title and favicon with Death Race branding.
- Removed unused Vite/React starter assets.
- Tightened the 1200px layout so the 20-lane playfield stays visible with fixed-format lane rows.
- Improved pixel-art racers with face detail and clearer movement/dead-body states.
- Improved crosshair visibility with glow and stronger color treatment.
- Improved bullet indicators with shell-shaped chips.
- Strengthened dead body, reveal highlight, and winner lane visuals.
- Updated `todo.md` so the completed polish work is no longer listed as remaining work.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 942757, timeUsedSeconds 2198.

### task 19 : Write WHY

- Added `WHY.md` explaining the project in plain language.
- Covered the game idea, technical architecture, codebase structure, technology choices, bugs fixed, pitfalls, engineering practices, and next steps.
- Completed this after active MVP implementation tasks were done and lint/build verification passed.
- Tests run: `npm run lint`; `npm run build`.
- /usage: tokensUsed 1207926, timeUsedSeconds 2307.

### task 20 : Start Multiplayer Networking

- Added a shared room-state module to centralize room lifecycle logic.
- Added a Cloudflare Worker room backend using a Durable Object coordinator.
- Added a browser API wrapper for room operations.
- Added tests for both the room-state logic and API wrapper.
- Deployed the backend worker to `https://death-race-rooms.james-marotta.workers.dev`.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1415598, timeUsedSeconds 2438.

### task 21 : Wire Lobby To Multiplayer API

- Added client-side room API calls for create room, update settings, and countdown sync.
- Added backend sync status and room snapshot display to the HUD.
- Kept the local play loop intact while connecting the lobby controls to the shared backend room.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1473021, timeUsedSeconds 2514.

### task 22 : Add Lobby Join Control

- Added a visible join control to the lobby so another browser can enter a room through the backend API.
- Added a player-name field in the lobby and wired it to the shared room API.
- Styled the join control so it fits the existing lobby panel.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1501294, timeUsedSeconds 2588.

### task 23 : Clean Cloudflare Config And Movement Speed

- Split the Cloudflare Worker and Pages config into the files Cloudflare expects for each deploy path.
- Removed the Pages config warning caused by the shared wrangler config shape.
- Flattened player movement speed to match NPC speed so movement is less of an identity tell.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1518420, timeUsedSeconds 2644.

### task 24 : Tighten Lobby Reconnect Flow

- Made room joins treat reconnects as reconnects, restoring connection and ready state for an existing player record.
- Switched the lobby roster display to prefer synced server room data when available.
- Added teardown leave calls so the browser tells the room backend when a player disconnects.
- Removed the duplicate Pages room function so the worker is the single backend source of truth.
- Added a reconnect regression test for room-state helpers.
- Mocked the room API in the App test so teardown leave calls do not produce jsdom URL errors.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1544800, timeUsedSeconds 2790.

### task 25 : Add Room Start Validation

- Added shared room readiness validation so a room can only start when every connected player is marked ready.
- Disabled the host start button until the backend room snapshot reports a ready room.
- Added a room-readiness panel in the lobby to show why start is blocked.
- Updated the App test harness to wait for the room join response before starting a round.
- Added a reconnect/readiness regression test in the room-state helpers.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1570200, timeUsedSeconds 2950.

### task 26 : Harden Room Identity And Lobby Labels

- Added shared room helper behavior for reconnecting existing players, reassigning the host when the host leaves, and marking joined players with timestamps.
- Updated the lobby to show the synced host name and to label connected, disconnected, ready, and left players from room state rather than hard-coded position.
- Extended the room-state regression tests to cover host reassignment.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1596200, timeUsedSeconds 3085.

### task 27 : Add Shared Room Ready Action

- Added a shared ready action in the room helpers and exposed it through the worker API and browser API wrapper.
- Tightened room start validation so every connected player must be connected, hosted, and ready before countdown can start.
- Added a lobby ready-up control that marks the current player ready through the backend.
- Added tests for the ready action and the stricter start gate.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1622200, timeUsedSeconds 3205.

### task 28 : Add Lobby Room Polling

- Added a lightweight room refresh loop in lobby and round-transition states so the client keeps reloading room state from the backend.
- Kept the existing lobby join, ready, countdown, and leave actions intact while making the room snapshot less click-driven.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1642200, timeUsedSeconds 3290.

### task 29 : Route Next Round Through Backend

- Wired the app's next-round transition through the backend room API instead of keeping it local-only.
- Added an API wrapper and tests for the next-round action.
- Added a room-state regression test for the next-round helper.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1668200, timeUsedSeconds 3365.

### task 30 : Sync Player Input Through The Backend

- Added a shared player-input action in the room helpers, worker API, and browser API wrapper.
- Sent the local player's current movement, aim, and firing state through the room backend during lobby, countdown, and play states.
- Added tests for the input action in both the room helper and browser API layers.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1694200, timeUsedSeconds 3445.

### task 31 : Prune Stale Room Clients

- Added stale-client pruning to the shared room-state helpers and worker backend.
- Touched player timestamps whenever join, leave, ready, or input state changes flow through the room.
- Added regression coverage for pruning disconnected players after they have been gone too long.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1719200, timeUsedSeconds 3525.

### task 32 : Reject Duplicate Active Joins

- Made the shared room helper ignore duplicate joins when the player is already connected.
- Prevented disconnected players from submitting input until they reconnect.
- Added regression tests for duplicate joins and disconnected-player input.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1743200, timeUsedSeconds 3600.

### task 33 : Route Late Joins To Spectators

- Made room joins become spectator-only when the room is already live instead of expanding the active player roster.
- Kept late joiners visible in the spectator list so they still show up in the room snapshot.
- Added a regression test for live-room spectator joins.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1767200, timeUsedSeconds 3670.

### task 34 : Support Shareable Room Links

- Made the app read a room code from `/join/:roomCode` and use that code for all room API calls.
- Added a regression test to confirm the app uses the room code from the join link.
- Kept the room code visible in the lobby and the link text derived from the active room code.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1791200, timeUsedSeconds 3750.

### task 35 : Document Multiplayer Deployment Wiring

- Added a documented deployment path for the Cloudflare Rooms worker and the `VITE_ROOMS_API_BASE` production override.
- Added an example env file showing the production rooms API base format.
- Kept the app's existing API override support intact while making the deployment contract explicit in the README.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1815200, timeUsedSeconds 3815.

### task 36 : Surface Synced Room Input

- Added a lobby room-sync summary that shows the latest backend input snapshot alongside the connected roster.
- Kept the join flow formatting tidy while wiring the synced room state into the lobby HUD.
- Added a regression test that confirms the lobby displays the latest synced input from the backend room snapshot.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1815200, timeUsedSeconds 3815.

### task 37 : Clear Remaining Todo Items

- Removed the last tracked todo bullets and left `todo.md` as an empty tracking file.
- Kept the remaining open design notes in `spec.md` rather than confusing them with implementation work.
- Verified the repo still passes `npm run test`; `npm run lint`; `npm run build` before the doc cleanup.
- /usage: tokensUsed 1815200, timeUsedSeconds 3815.
