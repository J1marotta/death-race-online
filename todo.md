# Death Race LLM Todo

This file breaks the recovered MVP into implementation tasks for future LLM agents. Do not paste implementation code into this file. Use it as the ordered work queue.

## Always Do First

- Read `progress.md`.
- Read `spec.md`.
- Read `CHAT_GAME_CONTEXT.md`.
- Read this `todo.md`.
- Run `git status --short`.
- Inspect files before editing them.
- Preserve all existing user changes.
- Do not overwrite, delete, replace, or casually refactor Defender code.
- If Defender code is discovered, document its source location before touching gameplay code.
- After each code-changing task, run `npm run lint` and `npm run build`.
- Update `progress.md` after completed work.

## Recovered MVP Summary

- Browser-playable Death Race.
- Public/private lobby with room code/link.
- Host manually starts the game.
- Host chooses number of rounds.
- Always 20 racers total; NPCs fill empty human slots.
- Human players are secretly assigned racers.
- Players infer who they are and who others are.
- Countdown is `3, 2, 1, go`.
- `Space` walks, `Left Shift` runs, mouse aims, Mouse 1 fires, no movement button stops.
- Running has no stamina/cooldown/noise UI; the risk is revealing intent.
- Each human player has exactly one bullet per round.
- Players can shoot any racer, including themselves.
- NPCs never shoot.
- All loaded player crosshairs are visible and color-coded.
- Show a single-bullet indicator.
- Hide a player's crosshair after they fire.
- Shot racers are out and leave visible bodies.
- Eliminated players spectate.
- Round ends only when there is a winner.
- NPCs can win; if they do, shame everyone and reveal player racers.
- Late joiners spectate until the next round.
- NPCs walk, stop, and occasionally run while imitating humans.
- Pixel-art style.
- 5 unique character looks repeated 4 times across 20 lanes.
- Repeated character looks are visually identical.
- Slight depth/perspective like the screenshot.
- All 20 lanes fit on one screen without scrolling.
- Main presentation targets `1200px` wide on a laptop.

## Still Ask Before Choosing

- Deployment target.
- Backend choice.
- Whether MVP must be real-time networked immediately or may begin as a local/single-browser prototype with mocked lobby UI.
- Whether mobile/tablet support matters for MVP.
- Exact Defender code location.
- Exact scoreboard point values.

## Definition Of Done For Any Task

- The task's acceptance checks are satisfied.
- The app still builds if code changed.
- The lint command still passes if code changed.
- Any new behavior is mentioned in `progress.md`.
- Any open decisions or compromises are recorded.
- The final response summarizes changed files and verification.

## Task 00: Confirm Active Workspace

Goal: make sure all future work happens in the real project folder.

Instructions for the implementing LLM:

- Confirm the current working directory is `C:\Users\James\Documents\Code\deathRace`.
- Confirm `package.json`, `src\App.jsx`, `progress.md`, `spec.md`, `todo.md`, and `CHAT_GAME_CONTEXT.md` exist there.
- Check whether `C:\Users\James\Documents\death race` still only contains the old empty repo.
- Do not move or delete the old folder unless the user explicitly asks.

Acceptance:

- Active project path is known.
- No source files are changed.
- Any mismatch is reported before implementation continues.

## Task 01: Defender Safety Search

Goal: locate any Defender-related code or confirm that none exists in this repo yet.

Instructions for the implementing LLM:

- Search filenames and file contents for `defender`, `defence`, and `defense`.
- If Defender files are found, list exact paths and likely entry points.
- If no Defender files are found, record that result in `progress.md`.
- Do not edit Defender files in this task.

Acceptance:

- Defender search result is documented.
- Existing Defender code, if found, is untouched.

## Task 02: Baseline Commit Preparation

Goal: preserve the current starter project before larger changes.

Instructions for the implementing LLM:

- Review `git status --short`.
- Run `npm run lint`.
- Run `npm run build`.
- Confirm generated output remains ignored.
- Make a baseline commit only if the user authorizes committing.

Acceptance:

- Lint result is known.
- Build result is known.
- Baseline commit either exists or the reason it was not made is documented.

## Task 03: Replace Template README

Goal: make the README describe this project instead of the Vite starter.

Instructions for the implementing LLM:

- Replace starter documentation with Death Race project notes.
- Include install, dev server, build, lint, and preview commands.
- Include the active project path.
- Include the Defender guardrail.
- Link or mention `spec.md`, `todo.md`, `progress.md`, and `CHAT_GAME_CONTEXT.md`.
- Summarize the recovered MVP in a short section.

Acceptance:

- README no longer reads like a Vite template.
- README tells a new LLM or developer how to run the project.
- No gameplay code is changed.

## Task 04: Decide Network Scope Before Multiplayer Code

Goal: avoid accidentally building the wrong lobby/network architecture.

Instructions for the implementing LLM:

- Ask or recover whether the first implementation must be real-time networked or can start as a local/single-browser prototype with mocked lobby UI.
- Ask or recover backend/deployment expectations before adding server code.
- Do not invent a backend or hosting stack.

Acceptance:

- Network scope is documented in `progress.md`.
- Implementation plan matches the chosen scope.

## Task 05: Build App Shell And State Model

Goal: replace the Vite starter with the Death Race shell and explicit states.

Instructions for the implementing LLM:

- Add states for menu, lobby, countdown, playing, paused, round over, scoreboard, and game over.
- Remove visible Vite starter content.
- Keep the app readable at the `1200px` target.
- Do not implement full gameplay yet.

Acceptance:

- App opens to a Death Race entry screen.
- State transitions can be exercised with temporary controls.
- No Vite starter content is visible.
- Lint and build pass.

## Task 06: Build Lobby Flow

Goal: represent the room, host, players, and round setup.

Instructions for the implementing LLM:

- Add create/join lobby UI with room code/link.
- Support public/private lobby choice.
- Show player names in the lobby.
- Add host controls for round count and start.
- Treat late joiners as spectators once a round is in progress.

Acceptance:

- Lobby shows room code/link, privacy mode, players, host, and round count.
- Host can start a round.
- Late join behavior is represented.
- Lint and build pass.

## Task 07: Build 20-Lane Playfield

Goal: create the race surface that supports the visual MVP.

Instructions for the implementing LLM:

- Show exactly 20 lanes/racers.
- Fit all lanes on one screen without vertical scrolling.
- Target a polished `1200px` laptop presentation.
- Use slight depth/perspective like the screenshot.
- Use 5 character archetypes repeated 4 times.
- Repeated archetypes should be visually identical.

Acceptance:

- 20 racers are visible at once.
- No vertical scrolling is needed for the playfield.
- The layout remains readable at `1200px`.
- Lint and build pass.

## Task 08: Add Secret Assignment

Goal: give each human player a hidden racer identity.

Instructions for the implementing LLM:

- Assign one racer secretly to each human player at round start.
- Fill remaining slots with NPCs.
- Do not attach player names to racers during live gameplay.
- Keep player names visible in lobby and scoreboard.
- Store enough data to reveal identities after the round.

Acceptance:

- Human assignments exist and are hidden during play.
- NPC slots fill unused racers.
- Player identity reveal can happen after the round.
- Lint and build pass.

## Task 09: Add Countdown And Round Start

Goal: start each round with the required countdown.

Instructions for the implementing LLM:

- Add `3, 2, 1, go`.
- Disable movement/shooting before `go`.
- Reset per-round state at countdown start.

Acceptance:

- Host start triggers countdown.
- Gameplay begins only after `go`.
- Round state resets cleanly.
- Lint and build pass.

## Task 10: Add Human Movement Controls

Goal: implement the exact recovered controls.

Instructions for the implementing LLM:

- `Space` makes the assigned racer walk.
- `Left Shift` makes the assigned racer run.
- No movement key means stop.
- Running should be faster but should not add stamina, cooldown, noise UI, or other extra UI.
- Prevent stale input when focus changes.

Acceptance:

- Assigned racer can stop, walk, and run.
- Release-to-stop works.
- Running reads as more revealing through behavior, not extra UI.
- Lint and build pass.

## Task 11: Add NPC Movement

Goal: make NPCs plausibly imitate humans.

Instructions for the implementing LLM:

- NPCs walk, stop, and occasionally run.
- NPCs should vary timing enough to imitate human hesitation and intent.
- NPCs should never shoot.
- Tune behavior so NPCs can plausibly win.

Acceptance:

- NPCs move without direct player input.
- NPCs sometimes stop, walk, and run.
- NPCs never fire.
- Lint and build pass.

## Task 12: Add Aiming And Crosshairs

Goal: make aiming visible and social.

Instructions for the implementing LLM:

- Mouse controls aim.
- Every loaded human player has a visible crosshair.
- Crosshairs are visible to everyone.
- Crosshairs are color-coded by player.
- Hide a player's crosshair after they fire.
- Show a single-bullet indicator.

Acceptance:

- Crosshairs are visible and color-coded while bullets remain.
- Bullet state is visible.
- Crosshair disappears after firing.
- Lint and build pass.

## Task 13: Add One-Shot Firing

Goal: implement the one bullet rule.

Instructions for the implementing LLM:

- Mouse 1 fires.
- Each human player has exactly one shot per round.
- Players can shoot any racer/lane, including themselves.
- A hit eliminates the target.
- Do not let NPCs shoot.

Acceptance:

- A player can fire once and only once per round.
- Any racer can be targeted.
- Self-shooting is possible.
- Hit racers are eliminated.
- Lint and build pass.

## Task 14: Add Elimination And Spectating

Goal: keep eliminated players in the round as viewers.

Instructions for the implementing LLM:

- If a player's assigned racer is shot, that player is out.
- Dead bodies remain visible on the track.
- Eliminated players spectate until the next round.
- Round continues after eliminations.

Acceptance:

- Shot racers become bodies.
- Eliminated players cannot keep controlling/firing.
- Eliminated players can watch the rest of the round.
- Lint and build pass.

## Task 15: Add Winner And NPC Shame Flow

Goal: end rounds according to the recovered rules.

Instructions for the implementing LLM:

- Round ends only when there is a winner.
- NPCs are allowed to win.
- If an NPC wins, show shame messaging.
- At round end, highlight/reveal all human-controlled racers.

Acceptance:

- Human winner flow works.
- NPC winner flow works.
- Human racer reveal happens after winner is declared.
- Lint and build pass.

## Task 16: Add Multi-Round Scoreboard

Goal: support host-selected multi-round play.

Instructions for the implementing LLM:

- Track the host-selected number of rounds.
- Show scoreboard after each round.
- Let host instantly start the next round.
- Keep player names visible in scoreboard.
- Do not invent complex point values without user confirmation; simple round result tracking is acceptable until point values are confirmed.

Acceptance:

- Scoreboard appears after round end.
- Host can start next round without page reload.
- Match can complete after selected rounds.
- Lint and build pass.

## Task 17: Pixel Art Polish Pass

Goal: make the MVP look intentional and readable.

Instructions for the implementing LLM:

- Improve pixel-art racers, lanes, crosshairs, bullet indicator, dead bodies, and reveal highlight.
- Preserve 5 identical repeated archetypes across 20 lanes.
- Preserve no-scroll 20-lane layout.
- Keep all text and UI readable at `1200px`.

Acceptance:

- The screen reads as a pixel-art hidden-identity race.
- All gameplay roles/states are visually clear.
- Lint and build pass.

## Task 18: Manual QA Checklist

Goal: make repeated testing easy.

Instructions for the implementing LLM:

- Add or update a manual QA checklist in `README.md` or `progress.md`.
- Cover lobby, host start, countdown, assignments, controls, NPCs, aiming, shooting, elimination, spectating, winner, NPC shame, reveal, scoreboard, and next round.

Acceptance:

- QA checklist reflects the actual MVP.
- Checklist is easy to find.

## Parking Lot

Do not start these until the MVP loop is working or the user confirms them:

- Real backend or deployment if not yet chosen.
- Persistent accounts.
- Persistent scores across sessions.
- Mobile/tablet controls.
- Advanced art pipeline.
- Sound.
- Defender integration beyond preserving and documenting source.
