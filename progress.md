# Death Race Progress

Last updated: 2026-07-07

Active workspace: `C:\Users\James\Documents\Code\deathRace`

## Current State

- Git is initialized in the active workspace, but there are no commits yet.
- The old workspace at `C:\Users\James\Documents\death race` currently contains only a `.git` folder.
- The app is a React + Vite project using npm and Oxlint.
- The app still shows the default Vite starter UI in `src\App.jsx`.
- Dependencies are installed and `node_modules` is present.
- Build output goes to `dist`, which is ignored by git.
- No files with `defender`, `defence`, or `defense` in their names were found in the active repo.

## Guardrails

- Do not overwrite, replace, or delete existing Defender code.
- If Defender code exists elsewhere, locate it and document its source files before changing gameplay code.
- Make a baseline git commit before major edits.
- Keep generated folders and logs out of commits unless there is a specific reason to include them.

## Done

- [x] Created or moved the active project to `C:\Users\James\Documents\Code\deathRace`.
- [x] Initialized git in the active project folder.
- [x] Created the React + Vite project structure.
- [x] Added npm scripts for `dev`, `build`, `lint`, and `preview`.
- [x] Added Oxlint configuration.
- [x] Installed project dependencies.
- [x] Verified `npm run lint` passes.
- [x] Verified `npm run build` passes.
- [x] Added `spec.md` and `todo.md` planning docs.
- [x] Corrected planning docs so provisional MVP defaults are not treated as confirmed user preferences.
- [x] Audited planning docs against the visible repo/context and labeled unconfirmed gameplay details as draft suggestions.
- [x] Removed references to agent-authored MVP defaults from planning docs.
- [x] Recorded the confirmed `1200px` laptop presentation target.
- [x] Checked the original `CHAT_GAME_CONTEXT.md` handoff before reading the attached pasted text.
- [x] Recovered concrete MVP gameplay preferences from the attached pasted text file.
- [x] Updated `CHAT_GAME_CONTEXT.md` so it now includes the recovered concrete MVP preferences.
- [x] Updated `spec.md` and `todo.md` with the hidden-identity 20-racer lobby MVP.
- [x] Scanned planning docs and removed stale placeholder/default MVP references.

## Needed

### Setup And Safety

- [ ] Decide whether to ignore, archive, or delete the old empty `C:\Users\James\Documents\death race` repo.
- [ ] Make the first git commit for the current baseline.
- [ ] Locate the Defender code source if it exists outside this repo.
- [ ] Document Defender entry points before touching or integrating them.
- [ ] Replace the template README with project-specific run and development notes.

### Game Direction

- [x] Confirm the exact MVP gameplay loop.
- [x] Define win, loss, shot/elimination, spectating, and restart/next-round rules.
- [x] Decide supported controls: `Space` walk, `Left Shift` run, mouse aim, Mouse 1 fire.
- [x] Confirm public/private lobby with room code/link.
- [x] Confirm host chooses round count and manually starts.
- [x] Confirm always 20 racers with NPCs filling empty slots.
- [x] Confirm secret racer assignment and end-of-round reveal.
- [x] Confirm one bullet per human player per round.
- [x] Confirm NPCs move but do not shoot and can win.
- [x] Confirm pixel-art style, 5 repeated identical character archetypes, depth perspective, and no scrolling.
- [x] Browser-playable Death Race game.
- [x] Fast, readable, replayable feel.
- [x] Short rounds.
- [x] Clear score/progress feedback.
- [x] One-action restart loop.
- [x] Target a `1200px` wide laptop-friendly presentation.
- [ ] Decide whether MVP must be genuinely real-time networked or may start as a local/single-browser prototype with mocked lobby UI.
- [ ] Decide deployment target and backend choice.
- [ ] Decide whether mobile/tablet support matters for MVP.
- [ ] Define exact scoreboard point values beyond multi-round results.
- [ ] Define how Death Race and Defender mechanics should connect, if at all, after Defender source is located.

### Implementation

- [ ] Replace the default Vite starter screen with the Death Race game screen.
- [ ] Add game state for menu, lobby, countdown, playing, paused, round over, scoreboard, and game over.
- [ ] Build public/private lobby with room code/link, player names, host round count, and host start.
- [ ] Add 20-lane no-scroll race layout at `1200px`.
- [ ] Add 5 identical repeated pixel-art character archetypes across 20 racers.
- [ ] Add secret racer assignment and NPC slot filling.
- [ ] Implement `Space` walk, `Left Shift` run, release-to-stop, mouse aim, and Mouse 1 fire.
- [ ] Add visible color-coded crosshairs and single-bullet indicators.
- [ ] Add one-shot shooting, elimination, dead bodies, and spectating.
- [ ] Add NPC walk/stop/occasional-run behavior that imitates humans.
- [ ] Add winner detection, NPC shame flow, player reveal, scoreboard, and instant next round.
- [ ] Integrate Defender code without overwriting the original logic.
- [ ] Replace placeholder Vite/React assets with Death Race assets.

### Quality

- [ ] Keep `npm run lint` passing.
- [ ] Keep `npm run build` passing.
- [ ] Add a smoke-test or manual QA checklist for lobby, countdown, assignments, controls, shooting, elimination, NPCs, reveal, scoreboard, and Defender safety.
- [ ] Commit in small, stable chunks after each milestone.

## Latest Verification

- [x] `npm run lint` passed on 2026-07-07 after recovering MVP details.
- [x] `npm run build` passed on 2026-07-07 after recovering MVP details.
- [x] Verified the active repo has no commits yet.
- [x] Verified the old workspace currently contains only `.git`.
- [x] Verified no filenames in the active repo contain `defender`, `defence`, or `defense`.

## Next Recommended Step

Make the baseline git commit, decide real-time/local prototype scope, then locate or confirm the Defender code source before replacing the starter UI.
