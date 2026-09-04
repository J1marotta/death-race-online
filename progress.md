# Death Race Progress

Last updated: 2026-07-14

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

### task 66 : Stop Idle Lobbies From Billing Forever

- Identified the leak: hibernation keeps idle duration near zero, but an abandoned open tab heartbeats forever, so the room, its alarms, and its storage writes never stop.
- Added `lastActivityAt` to room state, refreshed by meaningful actions (joins, ready, settings, phases, shots, inputs) but deliberately not by heartbeats, reads, or alarms.
- Server enforcement: rooms idle past 30 minutes are destroyed with `Room closed after inactivity` on the next heartbeat, read, WebSocket message, or cleanup alarm, and clients see the existing closed-room state.
- Client kill switch: after 20 minutes without any pointer or keyboard interaction, the client sends a leave beacon and shows `Disconnected after inactivity`, stopping heartbeat/input traffic at the source.
- Confirmed via the observability MCP that Workers Logs has no historical data for the earlier 60k-hit test (observability was only just enabled); the 60k figure came from dashboard request analytics, which show raw WebSocket message counts that bill at 20:1.
- Added regression coverage for idle expiry timing, idle-room destruction on heartbeat, and heartbeats not extending the idle window.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 67 : Add Kill Juice, Kill Scoring, And Fix Corpse Positions

- Rebuilt scoring: a human round win is now 3 points and killing another human player earns the shooter 1 point, adjudicated server-side. NPC kills, corpse shots, and self-shots earn nothing, so racing stays the primary objective and the 19 NPC lanes cannot be farmed.
- Added kill attribution: `recordRoomShot` resolves the victim from the freshest room inputs (a connected player whose claimed lane matches the shot lane is a human kill), stores `victimName`/`victimType` on each shot, and tracks a per-player `kills` count that survives rounds and renames and zeroes on leave.
- Fixed a corpse-position bug: `getLiveProgress` returned the lane's *starting* position for shot racers, so corpses teleported back to spawn. Dead racers now freeze at the progress captured when the hit landed (shooter captures at hit time, other clients at sync time).
- Fixed a latent staleness bug: room inputs are now cleared when a countdown or next round starts, so a stale lane claim from the previous round cannot mis-attribute a kill or mis-adjudicate a finish.
- Added juice: a bouncing `KO! <- killer` marker in the victim's lane for ~1.1s, a `down · killer` corpse tag, a corner kill feed (`killer > victim`, fades after ~4s), a big screen shake with red flash on the victim's screen, a subtle shake with white flash on the shooter's screen, a brief white flash on the victim's sprite, and a punchier gunshot (filtered noise crack plus low sine thump, with an oscillator fallback for test environments).
- All shake/bounce animations are disabled under `prefers-reduced-motion`.
- Scoreboard now shows a kills count beside each player's score; round history shows `+3` for human wins.
- Added regression coverage: kill scoring rules, kill persistence across rounds/renames/leaves, input clearing on new rounds, frozen corpse positions, KO marker lifecycle, shooter/victim shake and flash, kill feed lifecycle, and scoreboard kill counts.
- Verified with `npm test` (104 passing); `npm run lint`; `npm run build`.

### task 68 : Convert WHY.md Into An Interactive WHY.html

- Built `WHY.html`, a self-contained interactive version of `WHY.md` (no dependencies, opens directly from disk) covering every section of the document.
- Interactive features: a scroll-spy table of contents with a reading progress bar, a clickable architecture diagram, a step-through lobby flow, collapsible syntax-highlighted code panels showing the real code behind each decision, and before/after diff tabs for the corpse-teleport bug.
- Live demos: snapping vs dead reckoning side by side with an adjustable sync rate, the WebSocket billing math with player/rate/duration sliders, and the kill juice (screen shake, flash, KO bounce) using the same CSS keyframes and Web Audio gunshot synth as the game.
- Respects `prefers-reduced-motion` in the demos, mirroring the game.
- Added `why.test.js`, a jsdom smoke test that executes the page script and exercises every interactive control (highlighting, cost calculator, stepper, tabs, juice demo, dead reckoning toggle, architecture boxes).
- Verified visually with headless Edge screenshots of the rendered page and functionally via the smoke test.
- Cross-linked the docs: `WHY.md` now points to `WHY.html` (and requires keeping it in sync), and the README docs list includes both.
- Verified with `npm test`; `npm run lint`; `npm run build`.

### task 69 : Code Once-Over, Cost Cuts, And Pricing Docs

- Fixed a real netcode bug found during review: the firing input sent only playerName/movementMode/aim/firing, and because `setPlayerInputState` replaces the whole server-side entry, firing wiped the shooter's laneId and progress for up to 50ms — a window where a return shot would be misattributed as an NPC kill and a finish could not be adjudicated. The firing input now spreads the latest full snapshot, with a payload-inspecting regression test.
- Cut billable WebSocket volume with an event-driven input cadence (`src/multiplayer/inputCadence.js`): movement-mode/lane/firing changes send immediately, progress-only drift sends a 400ms correction (dead reckoning fills the gap), and the final stretch (progress 85+) runs at full 20Hz so finishes stay fair. Mid-race running traffic drops ~8x.
- Removed aim from the periodic input snapshot: nothing reads a remote player's aim between shots, and including it made every mousemove a billable message even while standing still. Aim now travels only with the shot input.
- Cleaned prototype residue: removed the fake `LATE_JOINERS` Riley spectator, deleted four no-op entries in the lane className array, and moved WIN_POINTS/KILL_POINTS into `roomState.js` exports so client display and server scoring share one source.
- Deflaked the frozen-corpse test: NPC pacing is seeded per room code, so lane 19 could legally idle through the 4s window; the test now shoots whichever NPC moved the furthest. Verified with five consecutive clean full-suite runs.
- Reviewed and deliberately skipped: batching lobby storage writes and deduplicating alarm reschedules (pennies at this scale, added risk), ticker changes (it already self-stops; the real traffic driver was aim), and remote snap-distance tuning (speculative).
- Docs: added a "How The Pricing Works" section to WHY.md and WHY.html (meters, ratios, and the mapping from each meter to what the game does), updated the netcode sections and the WHY.html cost calculator with the event-driven cadence, added "The Shot That Erased Your Lane Claim" to the bug museum, and updated the spec's input-cadence and firing-input rules.
- Verified with `npm test` (118 passing, run five times); `npm run lint`; `npm run build`.

### task 70 : Turn The Racers Into Cute Pixel Animals

- Replaced the 8 human silhouette variants (hats, jackets, masks) with 8 animal species drawn purely in CSS: cat (pointy ears, striped tail), bunny (tall ears, cotton tail), bear (round ears, muzzle), fox (tall triangle ears, white-tipped bushy tail), frog (eye bumps with pupils, grin), pig (floppy ears, snout with nostrils, tail nub), chick (head tuft, beak, tail feathers), and mouse (big round ears, button nose, thin tail).
- Species features hang off per-shape pseudo-elements on the same base sprite, so every variant keeps the exact same hitbox (spec requirement). Eyes moved from a background gradient to `.racer-head::before` so faces can recolor freely.
- Replaced the archetype palettes with 5 pastel fur palettes — Peach, Sky, Mint, Honey, Berry — where `--suit` is fur, `--head` is face/belly, and `--trim` is the accent (inner ears, snouts, tails).
- Kept `shape-N` class names unchanged because `npcBehavior.js` seeds NPC personalities from `shapeClass`; renaming would have silently reshuffled every NPC's pacing.
- Racer tooltips now read species and palette (e.g. `Bunny · Mint`) instead of the old archetype name.
- Iterated visually with a scratch grid page (8 species x 5 palettes plus a dead row) screenshotted via headless Edge at 3x and at the in-game 1.2x scale; fixed the pig's horn-like ears and floating tail hook, the chick's bulky tail feathers, and the fox's headband-looking two-tone face along the way.
- Deflaked two more seed-dependent tests found during verification: the shooter-shake and kill-feed tests targeted lane 19 blindly, but lane assignments are seeded per room code, so lane 19 is occasionally a human (or the local player, whose death shakes differently). Both now target a guaranteed NPC lane.
- Added a regression test asserting all 20 racers carry species-and-palette titles covering all 8 species and 5 palettes.
- Verified with `npm test` (119 passing, run four times); `npm run lint`; `npm run build`.

### task 71 : Rebind Controls And Add A Live Kbd Control Bar

- Rebound movement: `Right Arrow` walks and `Space` sprints (was Space walk / Left Shift run). Clean switch — Left Shift no longer does anything, so the UI and the bindings tell one story.
- Replaced the text control reminders below the playfield with physical-looking `<kbd>` buttons: raised by a hard drop shadow, they highlight and sink by the same travel distance while the real key is held. A mouse-shaped element shows aim/fire; its left button lights up on fire, and the whole element greys (bullet pip removed) once the shot is spent, matching the crosshair.
- The buttons are visual indicators only (not clickable), and the whole bar dims with no depress feedback whenever the player cannot act: countdown, eliminated, or outside live play.
- Fixed a latent input bug found during the rebind: the key handler called preventDefault on Space before checking game state, so players could not type spaces into the name fields. Movement keys are now ignored entirely while an input has focus, and preventDefault only applies during countdown/play.
- Updated WHY.md and WHY.html with a "How The Animal Racer CSS Works" section covering the four tricks behind the sprites: the bordered box doubling as body and hitbox, the unblurred box-shadow clone trick, clip-path polygons for pointy features, and per-shape pseudo-element slots with three palette custom properties. WHY.html renders live cat/bunny/frog sprites from a trimmed copy of the game CSS.
- Verified the bar visually via a scratch state grid (idle, held, spent, locked) screenshotted in headless Edge; fixed a specificity bug that flattened the mouse element into a landscape rectangle.
- Updated spec player controls, README QA checklist, and test coverage: rebound movement tests, kbd depress/release, countdown dimming, spent fire button, and spaces-in-inputs regression.
- Verified with `npm test` (124 passing); `npm run lint`; `npm run build`.

### task 72 : Crowd NPCs, Death And Win Logic Fixes, Title Screen, Dashless Codes

- Found and fixed the corpse-at-start-line race from playtesting: after "Next round" resets local round state, an in-flight snapshot from the finished round could re-apply old shotRacerIds, freezing corpses at the rebuilt start positions and poisoning the seen-lanes set so the new round's kill on that lane rendered at the start line with no KO. Fixes: snapshots from a round older than the client's current round are rejected whole, and death bookkeeping self-heals when a lane un-dies (seen-flag and frozen position forgotten, kill feed deduped on re-death).
- Fixed the match that refused to end: the server has no gameOver phase, so heartbeat snapshots yanked a locally-finished client back to the scoreboard; and joiners never adopted the host's roundCount, so their match-complete check disagreed with the host. The phase sync now leaves a completed match alone and every client adopts roundCount from snapshots.
- Removed the Scoreboard button: the scoreboard renders immediately alongside the winner reveal at round over, and the host's only action is Next round (or Show final scores after the last round).
- Calmed the NPCs into a crowd: sprint share in the pacing patterns drops from ~61% to ~36% of steps (a ~40% cut), averaging ~60% of a sprinting player's pace. NPCs still finish and can win when every human stalls, but committed humans outrun the pack comfortably.
- Title screen rework: a highlighted gold "Join a game" card (room code field + join button) leads above "Host a game" — the first version placed join below the fold, caught by screenshot review. Lobby control labels switched from uppercase to sentence case.
- Room codes are now dashless single words (DR7Q2K style). Codes flow client -> path -> idFromName unchanged, so old dashed links still resolve (to their own rooms).
- Regression tests: stale old-round snapshot rejection, final-scores persistence with host roundCount adoption, the prominent join card, and updated scoreboard-flow and room-code tests.
- Verified with `npm test` (127 passing, run five times); `npm run lint`; `npm run build`; title screen screenshot via headless Edge.

### task 73 : Deepen The New Bug-Museum Entries In WHY.html

- Upgraded "The Corpse That Came Back To The Start Line" from prose to a full teaching entry: a t0-t5 failure timeline showing the in-flight snapshot racing the round reset, both fixes as code panels (the stale-round version check and the self-healing death bookkeeping), and a note on why the fixes are layered rather than alternatives.
- Upgraded "The Match That Refused To End" the same way: the two stacked causes broken out, the phase-truce and roundCount-adoption fixes as code panels, and a description of how the regression test proves both at once.
- Verified with `npm test` (127 passing, includes the WHY.html smoke tests); `npm run lint`.

### task 74 : Fit The Menu Side Panel Without Scrolling

- Removed the menu intro paragraph (redundant with the join/host cards), shortened both card descriptions to one line, tightened menu-card padding and gaps, reduced input/button heights from 46px to 40px, and dropped the state-card heading from 30px to 26px.
- Verified with headless Edge screenshots at 1280x900 and 1280x720: the name field, gold join card, and host card all fit inside the side panel with no internal scrollbar at both heights.
- Verified with `npm test` (127 passing); `npm run lint`; `npm run build`.

### task 75 : Slow The Crowd Further And Fix The Frozen Countdown

- Found why the previous 40% pattern nerf barely registered: two seeded roll overrides in getNpcStep forced run on top of the patterns — 28% of long blocks (up to ~3.4 seconds of continuous forced sprint) plus 12% of short blocks — keeping effective sprint share near 59%.
- Raised the burst-roll thresholds (long 72 -> 85, short 88 -> 92) and added a sprint duty cycle: any run demand only passes during a seeded 6-tick slice of each 16-tick window, so no NPC ever sprints longer than ~0.5 seconds in a row. Effective sprint share lands under ~20% and average pace at roughly half a sprinting player.
- NPCs now hold at the start line for ~1.5 seconds after go (19 ticks plus a seeded 0-5 tick per-NPC stagger) — a crowd reacts, it doesn't launch.
- Fixed the round that froze on go (seen in playtest, round 3/5): the host set the fire-once playingRequested flag before the request resolved, so one failed playing request stranded every client on the countdown forever. The flag now clears on failure and the 100ms countdown ticker retries until the phase turns.
- Regression tests: NPCs idle for the full start hold and move afterwards, no NPC exceeds the sprint burst cap even with an all-run pattern, and a failed playing request retries into the playing phase. The bobbing-stagger test now samples movement after the start hold.
- Documented "The Round That Froze On Go" in the WHY.md and WHY.html bug museums, and updated the spec NPC behavior and round flow plus the README QA checklist.
- Verified with `npm test` (130 passing, run four times); `npm run lint`; `npm run build`.

### task 76 : Fair Lane Shuffle And Overflowing Lane-1 Sprites

- Fixed the lane-assignment shuffle: swap indices came from `state % (index + 1)` on an LCG, whose low bits cycle with tiny periods (the lowest bit just alternates), producing patterned assignments. Swap indices now scale from the high bits, where the randomness lives.
- Added a fairness regression: 400 seeded rooms must produce every lane as the host lane with no lane dominating, players never share a lane, and the host lane must reshuffle between rounds within one room. The shuffle and assignment logic moved to `src/laneAssignments.js` so the test imports it without adding non-component exports to App.jsx.
- The playfield no longer clips its children: lane 1 racers' ears and KO markers now poke above the board edge instead of being cut flat, with a CSS regression assertion.
- Documented "The Shuffle That Favored Low Bits" in the WHY.md and WHY.html bug museums, updated spec round flow and visual direction, and extended the README QA checklist.
- Verified with `npm test` (131 passing); `npm run lint`; `npm run build`.

### task 77 : Sprint Stamina With A Juicy Meter

- Sprint is now a budgeted burst: a 2-second stamina tank drains while Space is held, empties into a hard lockout (the racer drops to walking speed even with Space held), and only re-arms once the bar refills to 100%. Refill starts after 1 second without sprinting and takes 3 seconds from empty (~40% sprint uptime held greedily). Partial drains never lock out, and sprint auto-resumes on the ready pop if Space is still held. Stamina resets each round; NPCs keep their separate burst-cap pacing.
- Stamina gates `movementMode` locally before it syncs, so remote clients render an exhausted sprinter as a walker with zero netcode changes.
- Meter juice: the stamina bar rides directly above the Space key in the control bar, its hue drains green -> amber -> red, bottoming out shakes the key and flashes the trough red, the returning fill pulses while recharging, and reaching full fires a white ready pop (keyed remount so it always replays).
- Racer juice: the controlled racer kicks up stepped dust puffs and speed lines while sprinting, and shows a sweat drip plus a slumped, desaturated winded trudge while exhausted.
- Fixed a stale test assertion from the "faster walking" commit: run speed is 1.5x walk but the run-vs-walk test still demanded 1.9x, so it failed at HEAD; the bound is now 1.4x.
- Regression tests: stamina drains and drops the racer to a walk at empty, refill waits the full rest second, tops up to 100, clears the lockout, and renders the ready pop. Stamina tests start under fake timers so the frame loop schedules against the mocked clock.
- Documented the design in spec.md (Player Controls) and "Why Sprint Costs Something" in WHY.md and WHY.html.
- Verified with `npm test` (133 passing); `npm run lint`.

### task 78 : Reign In The Crowd After The Stamina Nerf

- Sprint stamina had quietly re-raced the crowd: NPC pacing was tuned against a hold-Space-forever human (~7.5 progress/s), but a stamina-managed human tops out at ~5.8, leaving the untouched crowd at 82% of the best human pace and faster than anyone who rested.
- Measured before changing: a simulation replicating the exact NPC tick math (`.claude/npc-pace-sim.mjs`) showed the crowd at 4.76 progress/s vs the walker's 5.0. Bracketed 0.55/0.6/0.65 scales and picked `NPC_PACE_SCALE = 0.6`, which lands the pack at ~2.9 progress/s — 49% of a committed player, the original "half a sprinting player" design intent — finishing ~33s vs the human's ~16s with all burst/stop personality texture intact.
- Folded in the in-flight npcBehavior duty-cycle tuning (SPRINT_WINDOW 4 / SPRINT_BURST 2): NPC sprints are now ~160ms darts, and the stale "half a second" comment was corrected.
- Regression test: the median racer (an NPC in 18 of 20 lanes) must advance 8-26 progress over 8 seconds — an amble band well under a walking human's 40 — so future speed changes cannot silently re-race the crowd.
- Documented "The Crowd That Outran The Winded" in the WHY.md and WHY.html bug museums and updated the spec NPC behavior numbers.
- Verified with `npm test` (134 passing); `npm run lint`.

### task 79 : A Crowd That Loiters — More Stop And Idle For NPCs

- The scaled crowd never stopped moving (measured shares: 24% run, 60% walk, 16% stop, 0% idle), so a human loitering to hide stuck out against perpetual joggers. This is a hiding game; stillness must be common in the pack.
- NPC_PATTERNS moved from App.jsx into npcBehavior.js (exported, single source of truth for the app, the pace simulator, and tests) and rewrote the four personalities to mix walks, sprint darts, full stops, and idle shuffles — the previously unused idle speed (walk/3) finally earns its keep as a slow creep.
- The seeded loiter roll doubled (6% -> 12% of short blocks) and now splits stop-heavy: two-thirds full stop, one-third idle shuffle, landing off-beat from the patterns.
- Simulated result: the crowd loiters ~40% of steps (26% stop + 15% idle), pace drops from 2.85 to 2.22 progress/s (~38% of a committed player), finish ~42s vs the player's ~16s. Deliberately walks back toward the old "idled forever" territory — safe now because stamina-era players also stop, so stillness reads as strategy, not set dressing.
- Documented the follow-up in the "Crowd That Outran The Winded" museum entries (WHY.md, WHY.html) and updated the spec NPC behavior numbers.
- Verified with `npm test` (134 passing, the crowd-pace amble band holds); `npm run lint`.

### task 80 : Document Remaining NPC Shared-Clock Bug

- Added `npc_logic.md` explaining the current NPC movement path, why seeded offsets and cadence still do not create independent NPC behavior, and how to replace the shared `npcTick` model.
- Updated `todo.md` with the remaining work to implement per-NPC behavior timers.
- Updated `spec.md` to state that NPCs need independent idle/walk/run/stop timers and must not share a visible pack rhythm.
- Updated `WHY.md` to clarify that the NPC timing bug remains and that the previous changes were seeded shared-clock variations rather than true independent NPC state.

### task 81 : Keep Lobby Actions Visible On Laptop Screens

- Moved Ready/Start ahead of the real-player roster so the primary lobby flow never requires scrolling back to the top.
- Stopped the whole lobby sidebar from scrolling and bounded overflow to the growing player roster instead.
- Preserved normal document flow below the desktop breakpoint, where the sidebar becomes a stacked mobile layout.
- Recorded laptop-height efficiency as an ongoing design requirement in `spec.md`.
- Added regression coverage for lobby control ordering and overflow ownership.

### task 82 : Explain The Fly.io And Colyseus Migration

- Expanded `WHY.html` with a detailed, interactive review of what Cloudflare Durable Objects gave the project, where the model became awkward, and which authority problems a platform migration cannot solve automatically.
- Documented the current identity, client-authority, reconnection, ordering, hibernation, and trust-model weaknesses in plain language.
- Added the target Cloudflare Pages + Fly.io + Colyseus architecture, including the reasons for keeping static frontend hosting separate from the realtime game server.
- Added a staged migration plan with failing-first tests, proof gates, agent-hour estimates, rollback guidance, and a clear distinction between total effort and parallel elapsed time.
- Added the next juice backlog with authoritative event, hidden-identity, laptop-space, mute, reduced-motion, and event-deduplication constraints.
- Updated the closing mental model from a Durable Object clipboard to an authoritative referee so it remains valid before and after migration.
- Added regression coverage for the new guide sections.
- Verified the guide test file, lint, and production build. The in-app visual preview was unavailable for the final screenshot check.

### task 83 : Begin The Colyseus Migration Beside Production

- Kept the current React-to-Cloudflare Worker and Durable Object path intact and active by default.
- Added a versioned protocol contract with explicit room IDs, round IDs, sequences, server timestamps, event IDs, payload validation, and stale/duplicate ordering checks.
- Defined movement as intent only in the new protocol; client-authored progress and claimed shot victims are not part of the migration contract.
- Added an isolated `server/` tree with a Colyseus process, health endpoint, synchronized lobby schema, 20-player limit, message-rate limit, automatic disposal, and connection-session player keys.
- Added focused tests for protocol validation, ordering, room creation, host assignment, session-keyed players, leave behavior, server startup, and health.
- Added `dev:migration`, `dev:colyseus`, `start:colyseus`, and `test:colyseus` commands without changing existing development or deployment commands.
- Removed a proposed `concurrently` helper after its dependency tree reported a critical advisory; replaced it with a small repository-owned Node launcher and restored `npm audit` to zero vulnerabilities.
- Documented the migration server's inactive status and cutover safety boundary in `server/README.md` and the root README.
- Completed migration Tasks 01 and 02; Task 03, authenticated resumable sessions, is next.

### task 84 : Add Authenticated Resumable Colyseus Sessions

- Replaced connection session IDs as public player identity with random server-owned player UUIDs.
- Added a private connection-session-to-player map and bound server authentication metadata to the connection; later messages can resolve only the player attached to that connection, regardless of any forged display name in a payload.
- Upgraded Colyseus' default short reconnection token to a fresh 256-bit URL-safe token on join and every successful resume.
- Added a 45-second reconnection grace window using Colyseus' native room reservation lifecycle.
- Kept dropped players in synchronized state as disconnected during the grace window, restored them on resume, and removed them after token expiry.
- Added security and lifecycle tests for random IDs, connection-bound authorization, unique tokens, token rotation, reconnection, and expiry.
- Kept the entire implementation inside the inactive migration server; the deployed Cloudflare game remains the active production path.
- Completed migration Task 03. Task 04, Colyseus lobby parity, is next.

### task 85 : Rebuild The Lobby In Colyseus

- Added one versioned Colyseus command gate that resolves identity from the authenticated connection before validating room, round, sequence, phase, payload, and authorization.
- Added normalized active room-code reservation and collision rejection, with release on room disposal.
- Rejected case-insensitive duplicate display names while keeping names as presentation data rather than identity.
- Added connection-bound rename and ready actions; forged player names in payloads cannot redirect either action.
- Added host-only privacy and round-count settings plus host-only countdown start.
- Required every room player to remain connected and ready before the countdown can start, including players inside the reconnection grace window.
- Closed the room when the authenticated host intentionally leaves or fails to reconnect before token expiry.
- Added canonical versioned error envelopes with authoritative room, round, event ID, and server timestamp fields.
- Added lobby security and parity tests for collisions, names, self-actions, forged host settings, ready gating, guest restrictions, stale and duplicate messages, reconnect gating, unsupported commands, and host departure.
- Kept the new command channel inside the inactive migration server. The deployed frontend continues to use the existing Cloudflare lobby.
- Completed migration Task 04. Task 05, authoritative movement and stamina, is next.

### task 86 : Make Colyseus Movement Authoritative

- Added a fixed 20 Hz server simulation with the current 5 progress/second walk speed, 7.5 progress/second sprint speed, two-second sprint tank, one-second refill delay, and three-second full refill.
- Moved human progress, effective movement mode, stamina lockout, elimination state, finish crossing, and winner selection into server-owned runtime state.
- Assigned unique lanes with cryptographic server randomness. Public synchronized racer state is keyed only by lane and contains no player ID or display name; each connection can receive only its own private lane assignment.
- Gated movement until the authoritative countdown reaches Go and accepted stopped/walking/running intent only. A client-supplied progress field is ignored and cannot alter simulation state.
- Added deterministic simulation and room integration tests for legal speed, sprint exhaustion and recovery, frame-rate independence, invalid input, eliminated racers, unique lanes, hidden identity, pre-Go movement, fabricated progress, and server-owned finish detection.
- Kept the React client and Cloudflare Durable Object path unchanged. Prediction, interpolation, and correction are assigned to the future Colyseus client adapter, where they can be implemented without activating an incomplete backend.
- Completed migration Task 05. Task 06, authoritative shooting, is next.

### task 87 : Make Colyseus Shooting Authoritative

- Added server-side aim geometry using normalized coordinates and the existing 3.5-progress hit window. The server derives the target lane and checks its own racer position; claimed victims, scores, or positions in a payload are ignored.
- Made each player's one bullet server-owned and consumed it on the first valid shot, including misses. Eliminated players and duplicate shots are rejected.
- Added authoritative elimination, corpse protection, self-elimination without score, and one point/kill for a fresh human opponent takedown.
- Added canonical synchronized shot records and versioned event broadcasts with event ID, shooter name, lane, victim type/name, impact position, hit status, and scoring status.
- Kept shot resolution generic across human and NPC runtimes so Task 07 can add authoritative NPCs without a second shooting implementation.
- Added pure geometry and room-level security tests covering aim bounds, hit windows, misses, spent bullets, fabricated victims/scores, duplicate shots, self-shots, corpse shots, and server-owned scoring.
- Kept the active Cloudflare frontend and Durable Object shooting path unchanged until the client adapter and live acceptance gates are complete.
- Completed migration Task 06. Task 07, authoritative independent NPC simulation, is next.

### task 88 : Move Independent NPCs And Winners To Colyseus

- Filled every unclaimed lane to 20 racers with server-owned NPC runtimes, keeping human lane assignments secret and unique.
- Replaced the old shared `npcTick` decision model in the migration path with private per-NPC mode, mode deadline, last-update timestamp, seeded random stream, and speed variation.
- Added independent stopped, idle-creep, walking, and short-running behavior with the documented duration ranges and an individual 1.2-1.8 second reaction delay after Go.
- Advanced NPCs inside the same fixed server simulation as humans while making each decision from that NPC's own deadline. Changing one NPC timer cannot influence another NPC's state or next decision.
- Let NPCs use the shared authoritative elimination, shooting, finish threshold, and first-winner adjudication paths.
- Added deterministic tests for varied deadlines and personalities, timer isolation, partial-subset mode changes, all-lane room population, and NPC finish-line wins.
- Left the production client's shared-clock NPC code intact only as rollback code; it will disappear when the Colyseus client path passes live acceptance and the old realtime implementation is removed.
- Completed migration Task 07. Task 08, reconnect snapshots and ordering hardening, is next.

### task 89 : Complete Colyseus Resume And Ordering Semantics

- Sent a complete versioned authoritative snapshot after successful reconnection, followed by only that player's private lane assignment.
- Verified public snapshots contain racer lanes and progress without a player-to-lane mapping, while private state contains only the reconnecting player's identity and lane.
- Preserved countdown, live progress, bullet, elimination, score, winner, and shot state throughout the existing 45-second rotating-token grace period.
- Kept strict room ID, round ID, and monotonically increasing per-player sequence checks for every command, rejecting stale, future, duplicate, and reordered input.
- Defined expiry behavior: a missing host closes the room; a missing guest is removed and replaced at the same lane and progress by an independent authoritative NPC.
- Added resume tests for full snapshots, private-state isolation, live-phase restoration, token rotation, token expiry, guest replacement, host closure, and ordering rejection.
- Assigned exponential retry and jitter to Task 09 because socket retry lifecycle belongs to the client transport adapter, not the room simulation.
- Completed migration Task 08. Task 09, the Colyseus client transport and UI integration, is next.

### task 90 : Add The Inactive Colyseus Client Transport Foundation

- Added the official `colyseus.js` browser client with a zero-vulnerability dependency audit.
- Added an isolated transport adapter for room creation, code-based joining, lobby commands, movement intent, shot intent, next round, leave, snapshots, private lane state, canonical events, errors, and connection status.
- Centralized protocol envelopes so every command carries the current protocol version, room ID, round ID, and monotonically increasing sequence number.
- Added capped exponential reconnect with jitter and rotating-token resume support, reporting reconnecting, connected, disconnected, and terminal retry errors through subscriptions.
- Added dependency injection for sockets, timers, and randomness so transport behavior is deterministic in tests.
- Added five adapter tests covering create/join, command ordering, push snapshots without polling, successful delayed resume, and retry-cap failure.
- Kept the adapter unreferenced by React and production configuration. Task 09 remains open until the UI consumes authoritative state behind the migration flag and its integration tests pass.

### task 91 : Complete The Authoritative Round Lifecycle

- Added first-winner locking with public winner lane, name, and human/NPC type for result rendering.
- Awarded three points to a human round winner while keeping NPC winner points at zero; kill scoring remains one point from the authoritative shot resolver.
- Added host-only next-round commands that increment the round, reshuffle private human lanes, refill all bullets, replace the 20-racer field, and start a fresh authoritative countdown.
- Added final-round transition to `gameOver` without accidentally creating another race.
- Fixed resumed-client ordering by preserving its monotonically increasing command sequence instead of resetting it to zero after reconnect.
- Added tests for human and NPC winner scoring, guest rejection, fresh round reset, and final match completion.
- Task 09 remains in progress; the server contract now supports every round-loop operation the transport adapter needs.

### task 92 : Add The Authoritative Client View Model

- Added a stable UI projection that converts Colyseus schema maps into sorted player, racer, shot, winner, countdown, and room views without inventing or leaking a public player-to-lane mapping.
- Merged private player ID and lane state only into the local client view.
- Added local progress prediction based only on the last authoritative movement mode and speed, bounded to the track.
- Added smooth correction for ordinary drift with a large-divergence snap threshold for recovery from stale or resumed state.
- Made the transport publish projected views from push snapshots and private-state updates without polling.
- Added tests for anonymous projection, local private-state merge, correction convergence, snap recovery, and bounded prediction.
- Task 09 remains in progress; the next substep is the feature-flagged React integration and rendering tests.

### task 93 : Add And Live-Test The Flagged Colyseus React Client

- Added a real `VITE_NETWORK_BACKEND=colyseus` React surface while keeping the existing Cloudflare `App` as the default build and rollback path.
- Implemented create/join with loading and errors, editable display name, ready state, host start gating, player roster, authoritative countdown/racers/shots, keyboard movement intent, mouse aim/fire, one-bullet display, winner scoreboard, and host next-round flow.
- Kept the lobby compact and removed lobby chrome during countdown/play. At a real 1280x720 browser viewport, all 20 racers, track, finish, and controls fit with `scrollHeight === innerHeight` and no page scrolling.
- Replaced the mismatched legacy Colyseus 0.16 browser package with the official `@colyseus/sdk` 0.17 client matching the server. This fixed the first real handshake failure found by browser testing.
- Added a private session identity message on join so the client can recognize host/self in the lobby without revealing its secret lane before countdown. Session identity and later lane assignment merge safely in either arrival order.
- Completed a real local create -> ready -> start -> Go -> 20 server-driven racers -> shoot -> bullet-spent browser flow against the running Colyseus server.
- Added React integration tests for create, lobby readiness, host gating, 20 authoritative racers, intent-only movement, result rendering, and next round.
- Task 09 remains in progress until a two-client automated run verifies join, synchronized play, and room cleanup without HTTP polling.

### task 94 : Complete The Colyseus Client Adapter And Two-Client Gate

- Added a real two-client WebSocket harness using the official SDK against an ephemeral Colyseus server.
- Proved create, join by shared code, synchronized two-player roster, both-ready gating, host start, distinct private lanes, 20 anonymous public racers, authoritative Go, server-bounded movement, and graceful cleanup.
- Split high-frequency racer views from low-frequency room metadata. Progress-only 20 Hz ticks update the track component without rerendering lobby, header, results, or connection flow.
- Added a regression proving two progress snapshots publish one metadata update, plus bounded cleanup so host room closure cannot hang the suite.
- Confirmed the Colyseus React path performs no HTTP polling and the Cloudflare app remains available behind the default build selection.
- Completed migration Task 09. Task 10, production Fly.io packaging and deployment, is next.

### task 95 : Package Colyseus For Fly.io

- Added a production Node 22 Alpine image that installs production dependencies only, copies only the server and shared protocol, drops to the unprivileged `node` user, and handles Fly's SIGTERM through the existing graceful shutdown path.
- Added a Sydney Fly configuration with HTTPS/WebSocket proxying, `/health` checks, one `shared-cpu-1x` Machine, 256 MB RAM, no volume, and connection-based scale-to-zero.
- Chose cold starts to minimize idle cost while active WebSocket connections keep a live machine busy.
- Documented that Fly has no free tier and currently offers no billing alerts, plus the exact cost boundaries, deployment commands, frontend preview variables, and Cloudflare rollback procedure.
- Added deployment configuration regression tests for production-only dependencies, non-root execution, health checks, region, memory, and scale-to-zero.
- Docker Desktop is installed but its daemon was not running, so local image construction could not be verified. Both Fly's official Windows installer and Winget download stalled; Task 10 remains open until `flyctl` installation, account authentication, remote build, and health checks succeed.

### task 96 : Add Multiplayer Network And Capacity Regression

- Added maximum-room coverage for 20 connected humans, 20 unique private lanes, no NPC substitution, and no public identity mapping.
- Added adversarial packet tests for duplicates, reordered sequences, stale/future rounds, wrong rooms, fabricated progress, and hidden lane data in snapshots and errors.
- Added an end-to-end authoritative command loop covering ready, countdown, shot, elimination, kill point, finish, three winner points, next-round reset, bullet refill, and host disconnect cleanup.
- Added disposal checks across 30 rooms, proving private session, ordering, and runtime maps are cleared and room codes are reusable.
- Added a local capacity run of ten simultaneous 20-player rooms over 200 server ticks. It completed in 21 ms on this machine with heap growth below the conservative 128 MB test ceiling.
- Fly CLI installation eventually completed through Winget, but no Fly access token is configured. Task 10 and the remote portions of Task 11 remain open pending user authentication, remote build, deployed health checks, and live latency tests.

### task 97 : Restore Late-Join And Human-Elimination Parity

- Made players joining an active round explicit spectators: they receive lobby identity and public race state but no private lane, runtime, movement, or shot authority.
- Promoted connected spectators into the next round automatically, assigning a fresh private lane without making the between-round host flow wait for a Ready control that is no longer visible.
- Added the requested 4x authoritative NPC fast-forward when every human racer is eliminated and more rounds remain; the final round keeps normal speed.
- Published the speed multiplier in synchronized state and made the flagged client show a dimmed `Spectating` control bar instead of a misleading active bullet.
- Added server and React tests for late joining, next-round promotion, private lane assignment, gameplay-input suppression, and 4x NPC progress.
- Fly authentication is still the external deployment gate; the migration goal remains active.

### task 98 : Restore The Agreed Lobby And Countdown Flow

- Made lobby codes optional for hosts and generated six-character codes from an unambiguous uppercase alphabet; joining players still must enter the shared code.
- Fixed the flagged lobby's display-name field so edits remain visible and submit through the authenticated rename command on blur.
- Extended the authoritative countdown to three seconds and replaced the static migration overlay with a synchronized visible 3-2-1 sequence driven by the server deadline.
- Added focused tests for deterministic code generation and editable authenticated names; existing create/join and countdown integration remains green.
- Kept these changes behind the Colyseus flag while Fly authentication remains pending.

### task 99 : Deploy Colyseus To Fly.io And Smoke-Test Public WebSockets

- Installed and authenticated Fly CLI, created `death-race-online-game`, and validated `fly.toml` with Fly's current CLI.
- Completed a remote Docker build from the restricted context: the production image is 57 MB and `npm ci --omit=dev` reported zero vulnerabilities.
- Deployed one 256 MB `shared-cpu-1x` Machine in Sydney with scale-to-zero, shared IPv4, dedicated IPv6, HTTPS, graceful SIGTERM, and no volume.
- Verified Fly reports one passing `/health` check and confirmed `https://death-race-online-game.fly.dev/health` returns the Colyseus service identity.
- Added and ran `npm run smoke:fly` against `wss://death-race-online-game.fly.dev`, proving two public SDK clients can create, join by shared code, ready, receive distinct private lanes, start, synchronize 20 racers, and move authoritatively.
- Replaced the timing-sensitive private session-on-join message with a synchronized public connection ID matched against the SDK's own session ID. Identity remains presentation state; server authorization still uses its private connection map, and no lane mapping is exposed.
- Completed migration Task 10. Task 11 remote network and browser acceptance is next.

### task 100 : Harden Fly Startup And Remote Network Regression

- Removed the duplicate application-owned shutdown handlers and let Colyseus own its graceful SIGTERM lifecycle on Fly.
- Increased the Fly health-check grace period to cover a cold Node/npm startup while retaining scale-to-zero for low idle cost.
- Extended the public WebSocket smoke test to force an unexpected client disconnect, resume through the rotating reconnect token, and verify the same authenticated player returns connected.
- Added a deterministic adverse-network regression with latency, jitter, duplication, reordering, and packet loss. The server accepts each monotonically newer command at most once and never trusts client timing or progress.
- Task 11 remains open until this expanded suite passes against Fly and the flagged browser build completes its final laptop acceptance pass.

### task 101 : Restore Persistent Gameplay Audio In The Colyseus Client

- Added a client-only Web Audio engine to the flagged migration UI, keeping all music and shot feedback off the network and Fly bill.
- Added low-volume gameplay music that starts from authoritative `playing` state, stops between rounds, and creates a fresh graph when a later round begins.
- Added immediate local shot audio and a clear Sound on/Sound off control in the top bar outside the game area.
- Reused one browser audio context, resumed it from real keyboard or pointer gestures, and cleaned up every oscillator and the context when the app unmounts.
- Added a regression for the previous failure mode: music must stop after a round and restart in the next one, while mute remains visible outside the track.

### task 102 : Make The Interactive Learning Guide Part Of Every Migration Step

- Consolidated the interactive guide into one canonical lowercase `why.html` source instead of maintaining a tested root file and a stale deployed public copy.
- Configured Vite as a multi-page build so the canonical guide is transformed and published beside the game on every deployment.
- Added a regression that rejects a second `public/why.html` source and verifies the canonical page remains a configured build entry.
- Added migration field notes explaining token-based reconnect continuity, deterministic adverse-network tests, restartable Web Audio lifecycles, and why hosted browser acceptance is part of the test surface.
- Established `why.html` updates as a required part of each remaining migration commit so architecture decisions and bug lessons are recorded while their evidence is fresh.

### task 103 : Restore Authoritative Crosshairs, Stamina, And Kill Feedback

- Added anonymous per-round crosshair state synchronized by Colyseus: every client sees aim position, color, and bullet status without receiving a player name or controlled-lane mapping.
- Added a bounded `aim` protocol command; the server derives crosshair ownership from the authenticated connection and the browser throttles mouse updates to 20 Hz.
- Extended connection-private state with the local lane, crosshair ID, stamina fraction, exhaustion, and elimination status, including complete restoration after reconnect.
- Kept high-frequency racers, crosshairs, and private stamina out of the ordinary React metadata projection so only the isolated track subtree rerenders during play.
- Added a physical stamina meter, loaded bullet pip, shared color-coded crosshairs, persistent KO labels, and an authoritative kill feed to the flagged client.
- Added protocol, privacy, reconnect, and rendering regressions, including proof that public crosshair serialization contains no player ID, player name, or controlled lane.
- Updated the interactive learning guide with the public/private/server-only state model and fixed its live caching policy while retaining immutable caching for hashed game assets.

### task 104 : Restore Pixel Animals, Random Starts, And Join-First Entry

- Replaced the migration placeholder geometry with all eight specified pixel-animal species and five pastel palettes, rendered from CSS pseudo-elements around one equal-sized hitbox.
- Derived appearance from room, round, and lane only, ensuring humans and NPCs share the same visual vocabulary while every 20-racer field contains all species and palettes.
- Added walk, idle, run, exhausted, dust, sweat, and corpse treatments driven only by authoritative movement and private local exhaustion state.
- Randomized authoritative starting progress inside a narrow 1.5-3.5% band near the left edge so the field does not stack without creating a large starting advantage.
- Changed the entry screen to open on Join lobby and put Host a game second because guests using a shared code are the common path.
- Reworked movement regressions to assert legal server-derived progress deltas from randomized starts instead of assuming every racer starts at zero.
- Added the appearance, fairness, and test-design lessons to `why.html` in the same commit.

### task 105 : Restore Authoritative Human Reveal And Side-By-Side Results

- Added an initially empty public `revealedName` field to racers and populated it for human-controlled lanes only after the authoritative winner is locked.
- Kept the player-to-lane relationship absent throughout countdown and live play, making the reveal an explicit server-owned phase transition instead of a client-derived guess.
- Retained the transport's latest full projected view so a result track mounted after simulation stops cannot miss the final 20-racer snapshot.
- Added a frozen reveal track beside the scoreboard, with human/NPC result copy and the host's Next round or Show final scores action visible in the same laptop-height layout.
- Disabled movement, aiming, shooting, crosshairs, and the controls strip on the result track while retaining bodies, KO attribution, finish state, and revealed names.
- Added server and React regressions for post-win reveal timing, all 20 result racers, winner naming, and next-round availability.
- Added the phase-boundary and retained-snapshot lessons to `why.html` in the same commit.

### task 106 : Close Abandoned Rooms And Explain Intentional Shutdown

- Added a server-owned 30-minute meaningful-activity deadline that closes a room even when network connections remain technically alive.
- Added a browser-owned 20-minute pointer/keyboard inactivity timer that voluntarily leaves abandoned sessions and resets only on real user interaction.
- Unified host departure and idle expiry through one versioned `closed` protocol event carrying a stable reason and user-facing message.
- Prevented the Colyseus transport from treating an intentional server closure as a dropped connection and retrying a room that no longer exists.
- Added a Room closed screen with the server reason and one visible Return to menu action.
- Added room, transport, and React regressions for idle expiry, no reconnect after closure, browser timeout cleanup, reason display, and menu recovery.
- Added the liveness-versus-activity lesson to `why.html` in the same commit.

### task 107 : Make Overlapping Controls Deterministic

- Replaced independent keydown/keyup commands with a held-key state model: Space requests sprint, otherwise Right Arrow requests walk, otherwise movement stops.
- Prevented releasing one movement key from stopping a racer while the other key remains held, and suppressed duplicate commands when the derived movement mode does not change.
- Kept movement listeners inactive outside live play, for spectators, and while form controls own the keyboard.
- Drove the physical control-bar pressed states from the same held-key set and dimmed the mouse control after the authoritative bullet is spent.
- Added a brief `Go!` label derived from the authoritative countdown deadline after the synchronized 3, 2, 1 sequence.
- Added regressions for walk-to-sprint-to-stop and walk-to-sprint-back-to-walk key chords.
- Added the input-state-machine lesson to `why.html` in the same commit.

### task 108 : Prove A Complete Hosted Match

- Expanded the Fly.io smoke harness from a connection check into a complete three-round private match against the public WebSocket endpoint.
- Proved guest reconnection preserves authenticated identity before the match begins.
- Fired an authoritative shot at the guest's private lane, verified elimination, and confirmed the host earned exactly one kill point.
- Ran all three rounds to human victories, advanced through the between-round flow, and verified the final game-over score is ten points.
- Made every command use the live authoritative round number so the harness detects stale-round protocol errors after round one.
- Made both clients leave and verified the old room code cannot be joined after disposal.
- Kept deterministic latency, jitter, duplication, reordering, and packet-loss regressions alongside the hosted match proof.
- Added the end-to-end test-story lesson to `why.html` in the same commit.

### task 109 : Restore Authoritative Shot Impact And Music Character

- Replaced the migration's placeholder sawtooth shot chirp with the specified filtered-noise crack and low sine thump.
- Replaced the square-wave gameplay drone with quiet sine-pad seventh chords, a triangle melody voice, and a bass voice that change together during play.
- Kept immediate shot audio local for responsiveness while making shooter and victim screen feedback wait for the authoritative hit event.
- Added a short white flash and restrained shake for the shooter, plus a longer red flash and stronger shake for the victim.
- Disabled all new flash and shake animation under reduced-motion preferences.
- Added React and audio-graph regressions for authoritative event ownership, effect roles, instrument types, and restartable later-round music.
- Added the immediate-versus-authoritative feedback lesson to `why.html` in the same commit.

### task 110 : Cut Production Routing Over To Colyseus

- Made `ColyseusApp` the only production entry instead of selecting the old Cloudflare client through a build flag.
- Made production builds default to the public Fly.io WebSocket endpoint while local development continues to default to `ws://127.0.0.1:2567`.
- Updated the spec and deployment guides to describe Colyseus authority, private state, protocol ordering, reconnection, disposal, and scale-to-zero costs.
- Recorded `https://40288567.death-race-online.pages.dev` as the immutable pre-cutover rollback build.
- Kept the old React, Worker, Durable Object, and fallback code in the repository for this cutover commit; removal follows only after the new default production URL passes live acceptance.
- Added the rollback-boundary lesson to `why.html` in the same commit.

### task 111 : Remove The Retired Cloudflare Realtime Path

- Removed the old React game surface, polling API, client-owned room state, input cadence, browser NPC/lane helpers, Durable Object Worker, Worker tests, and Worker binding configuration after production proof passed.
- Removed obsolete Worker development and deployment scripts while retaining Cloudflare Pages as the static frontend host.
- Kept the pre-cutover immutable Pages artifact as the executable historical rollback instead of preserving two contradictory source implementations.
- Moved the small appearance hash into the active client after confirming the retired NPC helper had no authoritative server ownership.
- Rewrote `WHY.md` around the current Colyseus/Fly architecture and changed the interactive guide's first-screen architecture, code tour, and deployment status to current truth.
- Preserved the Durable Object material in `why.html` as explicitly labeled migration history.
- Added the rollback-artifact-versus-dead-source lesson to `why.html` in the same commit.

### task 112 : Complete The Planned Juice Pass

- Added escalating authoritative countdown tones, synchronized crouch poses, a restrained camera build, and a shared launch treatment derived from `countdownEndsAt`.
- Added immediate muzzle flash, crosshair recoil, pixel tracer, casing motion, authoritative hit sparks, and a two-tone near-miss cue with shot-event deduplication.
- Added a server-generated winner event ID and used it to trigger one finish punch, checkered particle burst, winner bounce, and generated crowd chord per result.
- Added sequential human reveals and animated per-round score/kill deltas measured from the server-state baseline; final values remain canonical synchronized state and Next round never waits for animation.
- Added subtle moving lane texture, varied per-lane dust, finish-flag flutter, local footsteps, exhausted breathing, and progressive music intensity in the final third.
- Kept all atmosphere client-only and driven by authoritative movement mode so humans and NPCs share the same public visual language without extra Fly traffic.
- Added reduced-motion collapse behavior, mute/later-round cleanup, expired-countdown silence, event deduplication, and laptop-height constraints.
- Added focused React, audio-graph, state-projection, and server winner-event regressions.
- Removed the inaccurate agent-hour estimates and completed juice backlog from `todo.md`.
- Updated `spec.md`, `WHY.md`, and `why.html` with the finished behavior and the authority/lifecycle/layout lessons.
- Fixed the Windows local-game launcher uncovered during visual QA so `npm run dev:game` can spawn Vite under current Node versions.
- Fixed countdown phase-boundary mounting to consume the transport's retained full snapshot, preventing all racers from disappearing until the next state patch.
- Kept the finish treatment as one straight checkered line by animating its internal pattern instead of reintroducing the previously removed extra flag block.
- Extended the public three-round Fly smoke test to require a distinct authoritative winner event for every round.

### task 113 : Turn The Interactive Guide Into A Program Course

- Added a current production technical reference covering browser, server, simulation, deployment, trust, privacy, ordering, reconnect, and persistence boundaries.
- Added eight end-to-end code-path maps for lobby creation, ready/start, movement, shooting, NPC decisions, finishing, reconnect, and deployment.
- Added a seven-part tutorial that teaches how to recover the architecture from entry points, trace commands, identify authority, distinguish schema from runtime, and diagnose by ownership.
- Added an eight-question interactive infrastructure and program-flow quiz with immediate explanations, scoring, and reset behavior.
- Preserved the full Cloudflare Worker and Durable Object material, and labeled retired interactive traces as historical so readers can compare both architectures without mistaking them for production.

### task 114 : Restore The Ambient Landing Preview

- Diagnosed that the landing page lost its animated race preview during the Colyseus cutover: the old client ran the whole simulation locally and could paint a live playfield behind the menu, while the authoritative client has no room state before joining and rendered only the form.
- Added a client-only `MenuPreview` that loops decorative racers across the full 20-lane track on the menu, reusing the existing `PixelRacer` markup and `migration-*` CSS so the landing sells the game again without any Fly.io traffic.
- Drove preview motion deterministically from a lane/tick function (no shared server state), remounting each racer on wrap so the CSS `left` transition never plays a reverse slide.
- Made the preview `aria-hidden`, non-interactive, and reduced-motion aware (static field, no interval), and laid the menu out as a two-column preview-plus-form grid that collapses on narrow screens.
- Added a React regression asserting the menu renders the ambient preview with a full lane field.
- Fixed the disappearing selected-tab label by giving the shell buttons an explicit dark theme instead of relying on the browser's default light control, so the active tab's cream text no longer vanished against a light background.
- Gave buttons soft corners (`corner-shape: squircle` with a 10px radius), inset the native select chevron off the right edge with a custom arrow, and tinted the active tab with the accent background.
- Kept the host-only privacy and rounds options mounted in both modes and disabled them when joining, removing the layout jank that came from mounting and unmounting the options block when switching tabs.

### task 115 : Smooth Aiming And Fix The Audio Mix

- Removed the 50ms position transition from the local player's own crosshair so it tracks the pointer one-to-one, while keeping the smoothing on other players' crosshairs where it hides the throttled network cadence.
- Coalesced pointer-move handling into a single requestAnimationFrame update so fast mouse movement no longer re-renders the 20-lane track faster than the screen refreshes, and cancelled the pending frame on unmount.
- Rebalanced the audio mix: the sine-pad chords, triangle melody, bass, footsteps, exhausted breathing, countdown, near-miss, and finish cues were all 10-50x quieter than the gunshot and effectively inaudible, so their gains were raised to sit clearly under the shot.
- Resumed the audio context when the music starts so a phase change into play without a fresh user gesture no longer leaves the game silent.

### task 116 : Add Lobby Music And A Volume Control

- Routed every sound (music pad, footsteps, breathing, gunshot, and cues) through a single lazily-created master output gain so a volume control can scale the whole mix live, including the sustained pad.
- Added a volume slider beside the existing mute toggle in the room top bar, driving a 0-1 master level; the slider is disabled while muted and the top bar (and therefore both controls) already shows in the lobby.
- Extended the music phases from playing-only to lobby, countdown, and playing so the lobby has ambient music and the track never stops and restarts the music at the start of a race.
- Kept the music-intensity master gain created first inside `startMusic` so the master output node is created second, and updated the countdown regression to assert the beat tone by its distinct 330 Hz frequency now that chord voices also play during the countdown.
- Added a React regression covering lobby music and the volume slider driving the master gain.

### task 117 : Bring Audio To The Landing Page

- Added `menu` to the music phases so the ambient landing preview also plays the background music; because of browser autoplay rules it begins on the first click or keypress, which the existing gesture-unlock already handles.
- Extracted the mute toggle and volume slider into a shared `AudioControls` component and placed it in the landing page header as well as the room top bar, so both controls exist on every screen that has sound.
- Added a React regression asserting the landing page exposes the mute and volume controls.

### task 118 : Authoritative Race Bug Sweep And Regression Pinning

- Fixed the NPC 4x fast-forward clock: scaled time was stored in `lastUpdatedAt`, so the next tick ran backwards. NPCs now advance by the scaled delta and reset the clock to real time; verified stable across consecutive ticks.
- Fixed winner selection: the tick loop broke on the first finisher in Map order (host-biased ties). The server now syncs all racers first, then declares the furthest progress past the finish.
- Capped lobbies at 20: lobby joins beyond the lane count now throw `The room is full`, with a defensive `room-full` guard in `startCountdown`.
- Unblocked next rounds: `startNextRound` prunes disconnected players instead of stranding the host for the 45s grace window; initial countdown still requires the full roster.
- Implemented the spec's seeded lane shuffle (FNV-1a + LCG from high bits, seed `roomCode:round:sortedIds`): deterministic per round, reshuffles by round, fair across 400 rooms.
- Hardened the transport: fresh-room attach resets round/sequence/state, reconnect rejects missing tokens and parallel attempts, and leave survives a dead socket.
- Fixed client glitches: local aim defaults to `y: 50`, rAF aim re-checks phase/role, miss effects clear pending hit timers, join normalizes the code field, winner sounds reset per match, and idle reset covers pointermove/wheel.
- Gave all 20 racers unique crosshair colors (`index % 20` plus 12 new CSS hues) instead of 8 recycled ones.
- Throttled `updateAtmosphere` to intensity-band changes and gave connection-lifecycle commands an explicit `use-connection` error.
- Added 9 regression tests (multi-tick fast-forward, furthest winner, room-full, next-round prune, seeded determinism/fairness, reconnect guards, fresh-room reset); suite is 118 passing with lint/build clean.
- Layer 4: eliminated victims now lose their bullet and dim their crosshair server-side (previously a dead player who never shot kept a bright loaded crosshair); pinned with a victim-dimming regression. `reconcileProgress`/`predictLocalProgress` remain tested utilities but are not wired into rendering — remote racers render authoritative state with CSS glide, so no change made there.

### task 119 : Reconnect Window And Zombie-Reattach Guard

- Found the client quit retrying after ~15s (5 attempts) while the server holds the 45s grace window, stranding manual rejoiners on `Player name is not available`. Raised `MAX_RECONNECT_ATTEMPTS` to 8 so backoff covers ~63s past the grace window; pinned with a delay-sum regression.
- Found a pending `reconnect()` could `attach()` after `leave()`, resurrecting a room the user closed. Added a `sessionGeneration` counter bumped on fresh-room attach and leave; the loop aborts when stale and leaves stray rooms it won too late. Pinned with a leave-during-reconnect regression.
- Verified layer 5 needs no changes: 10-room × 20-human × 200-tick simulation stays in budget, smoke sequencing is per-player ordered, and the spawn-vs-hit-window boundary is inclusive-safe. Suite is 121 passing with lint/build clean.

### task 120 : Wall-Clock Tick And Stall Caps

- Found humans advanced on fixed-interval `deltaMs` while NPCs advanced on wall-clock elapsed, so an event-loop stall permanently short-changed humans; uncapped NPC elapsed also teleported the pack after long stalls (a new regression test caught the unscaled path at +83 progress).
- `advanceSimulation` now derives human `dt` from the wall clock (`lastTickAt`, clamped 0–1000ms) and caps NPC elapsed at 1000ms on both the scaled and unscaled paths, never rewinding clocks on skew. `lastTickAt` resets on countdown start, Go, and dispose.
- Extended the 20-human regression with a 20-unique-crosshair assertion. Suite is 122 passing with lint/build clean.
