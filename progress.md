# Death Race Progress

Last updated: 2026-07-13

## Current State

- Active workspace: `C:\Users\James\Documents\Code\deathRace`
- Old workspace: `C:\Users\James\Documents\death race`
- Stack: React + Vite + JavaScript modules + npm + Oxlint
- Git branch: `codex/task-01-network-scope`
- Initial commit: `45b2434 Initial Death Race project setup`
- Planning cleanup commit: `d59ecfb Clean up project planning docs`
- The app shows the playable Death Race shell with a 20-lane track, local controls, and a backend-backed lobby flow.
- Dependencies are installed locally.
- Build output goes to `dist`, which is ignored by git.
- The old workspace currently contains only a `.git` folder.
- No Defender source files have been found in the active repo.
- Remote origin is `https://github.com/J1marotta/death-race-online.git`.
- Cloudflare Pages is deployed for the front end.
- A separate Cloudflare Worker is deployed for room coordination.
- Realtime input/heartbeat/shot traffic runs over hibernatable WebSockets with HTTP fallback; the room state lives in Durable Object memory with batched 50ms input-delta broadcasts, and the server adjudicates human finish-line wins.
- Rendering runs at 60fps via a requestAnimationFrame movement loop with dead reckoning for remote racers.
- The front end currently syncs lobby create/join/settings/ready/countdown actions to the backend API and shows room sync status in the HUD.
- The lobby now preserves shareable room codes, rejects joins to missing rooms, tracks the current client identity, shows ready/not-ready state from the server roster, and limits starting the game to the host after every connected player is ready.
- The side panel stays visible during the round so the room code, roster, and room sync state remain inspectable while testing multiplayer.

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
- Update `spec.md`, `todo.md`, `progress.md`, and `WHY.md` alongside every commit so the docs never drift from the code.

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

### task 38 : Unhardcode Lobby Room Labels

- Made the lobby status strip and room copy display the active room code instead of a fixed default label.
- Added a room-code input so join actions can target an explicit room instead of assuming one hardcoded room.
- Kept room creation on a generated code path so new lobbies no longer reuse the same baked-in room identity.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1815200, timeUsedSeconds 3815.

### task 39 : Track Real Players And Destroy Orphaned Rooms

- Added a visible real-players panel in the lobby so the connected human roster is easy to read at a glance.
- Added room cleanup rules so the worker destroys lobbies when the host leaves or when no users remain connected.
- Added regression coverage for the room cleanup helper and the real-players UI panel.
- Verified with `npm run test`; `npm run lint`; `npm run build`.
- /usage: tokensUsed 1815200, timeUsedSeconds 3815.

### task 40 : Reject Placeholder Room Joins

- Audited the room worker and found it was creating placeholder rooms for `GET` and `join` requests before any host had created the lobby.
- Changed the worker so only the explicit `create` action can create a room; `GET` and `join` now return `Room not found` for missing rooms.
- Added worker regression tests for missing-room get/join, host-created join, and host-leave destruction.
- Added a visible room error panel so failed joins show the backend rejection instead of silently entering a fake lobby.
- Removed the completed placeholder-room and room-error items from `todo.md`.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 41 : Tighten Host Lobby Flow

- Removed prototype state-tab buttons so users can no longer jump into fake local phases from the header.
- Made lobby creation wait for the backend create response before entering the lobby.
- Preserved the requested room code in the Worker instead of using the internal Durable Object id or the `rooms` path segment.
- Kept current client identity in the UI so joined players ready up under their own username.
- Hid the start-game control from non-host players.
- Required the host identity and a fully ready roster before the Worker accepts countdown start.
- Removed the implicit lobby cleanup leave call that could destroy the host room when starting the game.
- Kept the lobby/room side panel visible while the round is running.
- Added regression tests for host-only start, ready usernames, no leave-on-start, room-code preservation, and Worker countdown validation.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 42 : Derive Gameplay Roster From Room State

- Replaced the fixed local hidden-player lane mapping with deterministic assignments derived from the synced room roster.
- Seeded assignments from room code, round number, and roster order so browsers with the same room snapshot derive the same hidden lanes.
- Updated local control, crosshair color, bullet reset, NPC lane initialization, score rows, and round setup copy to use the derived human roster.
- Kept the local fallback roster for menu/offline prototype states.
- Added a regression test that confirms the round setup count comes from the backend roster instead of the old fixed four-player list.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 43 : Add Room Heartbeats And Stale Cleanup

- Added per-player heartbeat state so active clients refresh only their own connection timestamp.
- Stopped worker requests from touching every player timestamp, which had made vanished clients look alive forever.
- Made stale connected players become disconnected during prune and made rooms close when no connected host remains.
- Added Durable Object cleanup alarms so abandoned rooms can be destroyed even when no client sends another request.
- Added client heartbeat calls for active room/game states.
- Added regression tests for heartbeat updates, stale connected-player pruning, room closure, cleanup alarms, and the heartbeat API wrapper.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 44 : Sync Round Events Through Room State

- Added shared `roundState` to room snapshots for shot racer IDs, one-shot records, winners, scores, history, and phase timestamps.
- Added Worker/API actions for host-started live play, shared shots, host-recorded round-over, host-shown scoreboard, and host-started next round.
- Replaced the manual countdown advance UI with a timestamp-driven countdown where the host advances the room to `playing` and other clients follow the room snapshot.
- Sent local racer progress through the existing input snapshot so the host can evaluate winner detection against synced human progress while polling remains in place.
- Made clients adopt shared shot eliminations, round winner, scores, history, scoreboard, and next-round snapshots from the room backend.
- Fixed the round-over flow so it shows the scoreboard before next round/final scores, and hid invalid host-only progression controls from non-hosts.
- Added regression tests across room helpers, API wrappers, Worker authorization/state transitions, and React round-state behavior.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 45 : Add Live Room Transport

- Added a Cloudflare Durable Object WebSocket endpoint at the room `live` path.
- Broadcast serialized room snapshots to connected sockets after room saves, and broadcast a close message when a room is destroyed.
- Added a client live-room socket helper and React connection effect for active room/game states.
- Kept HTTP polling as fallback when the socket is unavailable, closed, or in tests.
- Added tests for live socket URL creation and Worker fallback behavior when WebSocket support is unavailable.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 46 : Show Closed Room State

- Added a shared closed-room handler in the React app for destroyed HTTP responses, 410 room-closed errors, and live socket close messages.
- Stopped heartbeat, input sync, socket reconnect, polling, countdown, and host winner detection while a room is closed.
- Added visible closed-room copy explaining that the host left or the room expired.
- Added a `Back to menu` recovery action so remaining clients can create or join a new lobby.
- Made host-leave destruction responses include `Host left the room`.
- Added regression tests for closed-room UI and host-leave response text.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 47 : Fix Production Rooms API Fallback

- Found that the deployed Pages app was calling a relative `/api/rooms` path even though the real room backend is the deployed Worker.
- Added a production fallback so non-local browser hosts use the `death-race-rooms` Worker API unless `VITE_ROOMS_API_BASE` is explicitly configured.
- Added regression coverage for local and production rooms API base selection.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 48 : Allow Pages To Call The Rooms Worker

- Found during live two-browser verification that production room creation reached the deployed Worker URL but failed the browser CORS preflight.
- Added Worker CORS headers to JSON responses and an `OPTIONS` preflight response for room routes.
- Added Worker regression tests for preflight handling and CORS headers on API responses.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 49 : Verify Live Multiplayer Lobby Flow

- Verified the deployed Pages app at `https://d26fdeba.death-race-online.pages.dev` in two isolated browser sessions.
- Confirmed the host can create a lobby, receive a shareable room code, ready up, see the guest join by code, and start only after everyone is ready.
- Confirmed the guest can enter a username and room code, join the same lobby, see the host and real-player roster, ready up, and follow the host into the playing state.
- Verified the live room reached `playing` for both sessions with room code `DR-YHI9`.
- Removed the completed live multiplayer verification item from `todo.md`.

### task 50 : Focus Live Gameplay Presentation

- Removed the visible `Sync` status item so the UI no longer flickers between transport states while room recovery still works internally.
- Increased walk, run, and matching NPC movement speeds by `3x`.
- Hid the side panel during countdown and live play so the race area becomes the focused view once the game starts.
- Added a playfield countdown overlay to preserve the start signal while the side panel is hidden.
- Replaced the angled per-lane finish marker with a straight black-and-white checkered finish line and flag.
- Updated `spec.md` to match the new live-play presentation.
- Added regression coverage for the hidden transport status, focused playfield, faster movement, and finish line.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 51 : Tune Movement And Clean Finish Line

- Increased walking speed by another `50%`.
- Doubled the current running speed so running is clearly faster than walking.
- Scaled NPC idle/walk movement with the new walking pace so NPCs keep blending into the pack.
- Removed the extra checkered flag element that was sitting on top of the finish line, leaving the straight checkered finish marker only.
- Added regression coverage for run-vs-walk speed and the cleaned finish line.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 52 : Polish Lobby Flow And NPC Variety

- Added erratic NPC pacing so simulated racers can suddenly run or pause for extended periods while keeping their hitboxes and lane assignments stable.
- Added three more character silhouette variants, bringing the racer shape set to 8 variants within the same collision footprint.
- Added a create-lobby loading state so the button reflects in-flight backend work.
- Moved room overview details into the top bar after a room exists, enlarged the join controls, and tightened the lobby side panel around real players, ready/start actions, and compact host settings.
- Made the current real-player row editable so hosts and guests can save their lobby display name before play starts.
- Added lightweight Web Audio cues for lobby actions, ready/start, shots, and name saves.
- Added shared rename support through the room state helper, browser API wrapper, and Cloudflare Worker action.
- Added regression coverage for player rename, create loading state, room overview placement, expanded synced roster behavior, and Worker/API rename handling.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 53 : Tune Crosshair Feedback And Run Speed

- Centered the crosshair on the pointer X position instead of placing its left edge on the mouse.
- Allowed crosshair aim to reach the full `0%` to `100%` playfield width.
- Kept the crosshair visible after firing and dimmed it to 50% opacity instead of hiding it.
- Increased player and NPC run speed by another `30%`.
- Added regression coverage for pointer-edge alignment, fired crosshair dimming, and the stronger run/walk speed gap.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 54 : Improve Targeting, Pace, And Runtime Cost

- Added aimed-target highlighting so racers glow when the crosshair is directly over them.
- Added bottom-of-playfield control reminders for walking, running, aiming/shooting, and the one-bullet rule.
- Added a pixel bullet marker on the crosshair before firing, then removed it and turned the spent crosshair grey at 50% opacity after firing.
- Doubled walking speed from the current value and made running exactly `200%` of walking speed for both players and NPCs.
- Made NPCs start changing behavior sooner and removed the old pre-finish cap so NPCs can cross the visible finish line.
- Aligned the logical finish threshold with the visual checkered line.
- Added a `4x` race fast-forward when every human racer is eliminated and another round remains.
- Reduced Cloudflare request pressure by slowing heartbeats, slowing fallback polling, and throttling input snapshots instead of syncing every animation tick.
- Doubled the visual lane height and racer scale so character silhouettes have more room.
- Added regression coverage for target highlighting, control reminders, bullet markers, spent crosshair feedback, NPC finish-line wins, and the new run/walk speed gap.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 55 : Restore Full-Frame Track Fit

- Removed aimed-target highlighting from lanes and racers.
- Reduced the playfield height and racer scale by `50%` so all 20 racers fit back into frame without scrolling.
- Kept the crosshair bullet marker, grey spent crosshair, control reminders, faster movement, NPC finish behavior, and Cloudflare request throttling intact.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 56 : Move Controls Below Game Window

- Moved the control reminder strip out of the playfield so it no longer overlays the game window.
- Kept the reminder visible directly below the race area.
- Added regression coverage that confirms the controls are outside `.playfield`.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 57 : Restore Between-Round Sound And Trim Round UI

- Resumed suspended Web Audio contexts before scheduling sounds so cues keep working after browser audio suspension.
- Played the start cue when the host begins the next round, not only on the first game start.
- Removed repeated room-status and round-setup cards from round-over and scoreboard states because the top bar already shows room and round context.
- Added regression coverage for next-round audio resume/playback and the trimmed between-round panel.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 58 : Enlarge Racers And Layer Finish Line Behind Them

- Increased racer silhouettes by `20%` using the shared racer scale so every character variant grows consistently.
- Lowered the finish-line stacking layer and raised lane content above it so the checkered line sits behind racers instead of covering them.
- Allowed the playfield to expand only during focused gameplay, capped by viewport space, so larger racers get more room without forcing scrolling.
- Added regression coverage for the racer scale, finish-line layering, and focused-only playfield height.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 59 : Stabilize Audio, Session Scores, And NPC Timing

- Reworked Web Audio handling so player gestures unlock/resume audio, closed contexts are recreated, and sounds are scheduled only after a context is ready.
- Added a session-end leave path that uses `sendBeacon` with a keepalive fallback and resets local score/round state when the browser session ends.
- Cleared a leaving player's shared score in room state so stale disconnected sessions cannot rejoin with old points.
- Moved NPC timing logic into a helper module and gave each NPC seeded cycle lengths and offsets for base movement, short pauses, long pauses, and initial delay.
- Added regression coverage for post-start audio recovery, session-end leave beacons, score clearing on leave, and staggered NPC cycle timing.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 60 : Add Gameplay Music And Stagger NPC Motion

- Added generated Web Audio background music that starts during live gameplay and stops outside the round.
- Added a clear top-right `Mute sound` / `Unmute sound` button outside the game area.
- Made mute stop both background music and short sound effects.
- Added per-NPC movement cadence and phase so NPC progress changes no longer all land on the same visible interval.
- Made every live NPC bob, including idle and stopped NPCs, with staggered animation delay and duration.
- Added regression coverage for the sound toggle, gameplay music, all-NPC bobbing, and staggered NPC movement cadence.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 61 : Rebuild Netcode For 60fps Play

- Reviewed the network path end to end and found remote racers updated once per second over HTTP POST, local simulation ticked at 12.5Hz, every message rewrote Durable Object storage and rebroadcast the full room, and the host adjudicated winners from stale data.
- Replaced the 80ms local movement interval with a requestAnimationFrame delta-time loop so local movement renders at display refresh rate, with a 16ms timeout fallback for test environments.
- Added dead reckoning for remote human racers: each frame extrapolates from the last synced progress and movement mode using the shared speed constants, easing toward the target instead of snapping once per sync, with snap-through for large corrections and per-round reset.
- Added a short linear CSS transition so stepped NPC movement glides between 80ms ticks while the frame-driven controlled racer stays exempt.
- Moved the Durable Object to the WebSocket hibernation API with handler-based messages, automatic ping/pong response, and player identity attached to each socket.
- Sent input, heartbeat, and shot messages over the live socket with automatic fallback to the existing HTTP actions when the socket is down.
- Kept the room in Durable Object memory; storage writes now happen only for durable changes, and GET reads no longer rewrite storage or rebroadcast to sockets.
- Batched input broadcasts on a 50ms server ticker that sends compact input deltas and stops itself when traffic goes quiet so the object can still hibernate.
- Raised client input sends to 20Hz over the socket, deduped when nothing changed, with the HTTP fallback rate-limited to the old one-second cadence.
- Added server-side adjudication of human finish-line wins from the freshest inputs, carried the controlled lane in input snapshots, and made finishRoomRound first-writer-wins so a late host round-over cannot overwrite the recorded winner. NPC wins still arrive from the host, which simulates NPCs deterministically.
- Added regression coverage for live-socket message handling, batched input deltas, ticker shutdown, eviction-safe stale-room cleanup, server adjudication, and late round-over protection; the suite grew from 85 to 89 tests.
- Deployed the worker (`npm run deploy:rooms`) and the Pages front end (`npm run deploy:cloudflare`).
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 62 : Make NPCs Race Like Players

- Reviewed NPC behavior after the report that NPCs idle forever: simulation showed NPCs spent ~40% of ticks stopped or idle-crawling and averaged 39% of a running player's speed, so the fastest NPC finished in ~47s against a ~21s running player and never looked like a participant.
- Replaced the walk/stop/idle behavior patterns with run-heavy player-like pacing personalities that mix running, walk breaks, and brief stops.
- Removed the extended long-block stop override and the idle crawl from step selection, keeping short human-scale hesitations and run bursts.
- Removed the per-depth laneDrag speed handicap so NPCs move at player speeds with only seeded jitter variance.
- New simulated distribution: 73% run, 14% walk, 13% stop, averaging 79% of a running player's speed with front-runner NPCs finishing in 23-24s, so committed humans still win narrowly while hesitant humans can lose to NPCs.
- Updated the spec NPC behavior section to describe player-like pacing and competitive finishes.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 63 : Replace Gameplay Music With Elevator-Style Loop

- Reviewed the gameplay music after the report that it sounded like static: a square-wave bass and sawtooth drone sustained non-stop under a fast minor-key note loop.
- Removed the square/sawtooth drones and replaced them with three soft sine pads that hold a mellow seventh-chord progression (Cmaj7, Am7, Dm7, G7), retuned on each chord change.
- Added a gentle triangle melody that arpeggiates the current chord at a relaxed 350ms beat with soft attack/release envelopes.
- Added a quiet sine bass note on each chord change and slowed the master fade-in.
- Kept the existing mute toggle, audio unlock/resume handling, and music start/stop lifecycle intact.
- Updated the spec visual direction section to describe the elevator-style gameplay music.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 64 : Keep All Docs Updated With Every Commit

- Adopted the guardrail that `spec.md`, `todo.md`, `progress.md`, and `WHY.md` are updated alongside every commit.
- Refreshed `WHY.md`, which had gone stale since task 19: the architecture picture now shows memory-first room state, batched input deltas, and server adjudication; live play describes 20Hz socket input and server-decided human finishes; a new netcode section explains 60fps rendering over 20Hz sync with dead reckoning and hibernation.
- Added bug-museum entries for the NPCs that idled forever and the gameplay music that sounded like static.
- Updated the prototype-shaped caveats to reflect server adjudication and the name-only identity limitation.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 65 : Add Worker Observability And Verify WebSocket Costs

- Investigated the 8-player test that showed ~60k worker hits: at 20Hz input per player (160 messages/second), 60k messages is roughly 6 minutes of active play, and Cloudflare bills incoming Durable Object WebSocket messages at a 20:1 ratio, so 60k raw messages bill as ~3k requests (~$0.0005). Analytics show raw counts; billing applies the ratio.
- Confirmed from Cloudflare pricing docs: outgoing WebSocket broadcasts are free, protocol pings and setWebSocketAutoResponse replies are free, and duration (not requests) is the dominant Durable Object cost, which hibernation and the self-stopping input ticker already control.
- Enabled Workers Logs on the rooms worker with automatic invocation logs disabled, because per-invocation logs at 20Hz input would generate ~576k events/hour for one 8-player room and swamp log limits.
- Added low-volume structured lifecycle logEvent calls: room_created, room_destroyed, socket_opened, socket_closed, socket_error, input_ticker_started, input_ticker_stopped, and round_adjudicated.
- Noted a future cost lever: event-driven input sends (mode changes plus ~2Hz progress corrections, full rate near the finish) would cut message volume ~90% if player counts grow.
- Verified with `npm test`; `npm run lint`; `npm run build`.
