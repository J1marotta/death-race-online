# Death Race Chat Context For LLMs

This file captures the game-related context visible in this Codex chat and the local project notes as of 2026-07-07. It is intended as a compact handoff for another LLM or future Codex session.

## Executive Summary

- Project name: Death Race.
- Active project folder: `C:\Users\James\Documents\Code\deathRace`.
- Old workspace folder: `C:\Users\James\Documents\death race`.
- The user prefers work to continue in the active project folder above.
- Git has already been initialized in `C:\Users\James\Documents\Code\deathRace`.
- The app is currently a React + Vite project using npm and Oxlint.
- The visible app is still the default Vite starter UI.
- Do not overwrite, delete, replace, or casually refactor the user's Defender code.
- The main game presentation should look good at `1200px` wide on a laptop.
- The user's concrete MVP gameplay preferences were recovered from the attached pasted text file on 2026-07-07 and are summarized below.

## Visible User Instructions

These are the game-related instructions visible in this chat:

> did you put it in codex cloud? I would prefer we move to C:\Users\James\Documents\Code\deathRace git init and then continue, do not overide our defender code

Current user request:

> put everything from this chat about the game into an llm friendly md file

Interpretation:

- Continue local work in `C:\Users\James\Documents\Code\deathRace`.
- Use the initialized local git repository there.
- Preserve Defender code. If Defender source exists, locate and document it before integrating or modifying anything.
- Make this file easy for another LLM to read before continuing work.

## Current Repository State

Confirmed from the local files:

- `C:\Users\James\Documents\Code\deathRace` exists.
- `.git` exists in the active project folder.
- `package.json`, `package-lock.json`, `index.html`, `vite.config.js`, `README.md`, `spec.md`, `todo.md`, and `progress.md` exist.
- `src\App.jsx`, `src\App.css`, `src\index.css`, and `src\main.jsx` exist.
- `public\icons.svg` and `public\favicon.svg` exist.
- `dist`, `node_modules`, and Vite log files exist locally.
- Git currently shows the project files as untracked, so there is no baseline commit yet.
- The old folder `C:\Users\James\Documents\death race` exists and appears to contain only a `.git` directory.

## Existing Planning Files

Before changing code, read these files in order:

1. `progress.md`
2. `spec.md`
3. `todo.md`
4. `CHAT_GAME_CONTEXT.md`

Important local docs:

- `spec.md`: high-level Death Race game spec and LLM guardrails.
- `todo.md`: ordered task queue for future implementation.
- `progress.md`: current repo status, verification, and open work.

## Confirmed Technical Stack

- Frontend: React.
- Build tool: Vite.
- Language: JavaScript modules.
- Package manager: npm.
- Linting: Oxlint via npm script.
- Current scripts are expected to include:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run preview`

## Confirmed Guardrails

- Do not overwrite Defender code.
- Do not delete or replace unknown files.
- Do not make broad unrelated refactors.
- Do not treat agent-authored placeholder MVP ideas as user decisions.
- Do not implement Defender integration until the Defender source path and entry points are known.
- If Defender code is found outside the active repo, document exact source paths before copying, adapting, or integrating anything.
- Keep Defender logic isolated behind an adapter/module boundary if integration is needed.
- Make a baseline git commit before major implementation work.
- Keep generated output such as `dist`, logs, and `node_modules` out of commits.
- After meaningful code changes, run `npm run lint` and `npm run build`.

## Confirmed Game Direction

The game should be a browser-playable Death Race game.

Confirmed design/experience notes:

- It should feel fast, readable, and replayable.
- It should support short rounds.
- It should have clear feedback for score/progress.
- It should have avoidable collisions or threats once confirmed.
- It should have escalating pressure once core mechanics exist.
- It should have a one-action restart loop.
- It should preserve or integrate Defender mechanics carefully, without overwriting original Defender code.
- It should be visually readable at a `1200px` laptop presentation width.

## MVP Preferences Status

Recovered concrete MVP details:

- Lobby-based multiplayer game with room code/link.
- Support public and private lobbies.
- Host manually starts the game.
- Host chooses number of rounds.
- Always 20 racers total; NPCs fill empty human slots.
- Human players are secretly assigned a racer/character each round.
- Players infer which racer they control and shoot who they think other players are.
- Countdown start: `3, 2, 1, go`.
- Controls: `Space` walks, `Left Shift` runs, mouse aims, Mouse 1 fires, no movement button stops the character.
- Running has no stamina/cooldown/noise UI; the downside is that it reveals intent and may draw shots.
- Each human player gets exactly one bullet per round.
- Players can shoot any racer/lane, including themselves.
- NPCs do not shoot.
- All player crosshairs are visible to everyone while that player still has a bullet.
- Crosshairs are color-coded.
- A visible single-bullet indicator is shown.
- A player with no bullet should no longer show a crosshair.
- If your assigned racer is shot, you are out for the round.
- Dead bodies remain visible on the track.
- Eliminated players keep watching/spectating.
- The round continues until there is a winner.
- NPCs can win; if an NPC wins, everyone gets shamed and all human-controlled racers are highlighted/revealed.
- Late joiners spectate until the next round.
- NPCs walk, stop, and occasionally run.
- NPCs should imitate human behavior.
- Visual style: pixel art.
- Character set: 5 unique character looks repeated across 20 lanes.
- Repeated character looks are visually identical.
- Perspective: slight depth/perspective like the screenshot, not perfectly flat lanes.
- All 20 lanes should fit on one screen without scrolling.

Still ask before choosing:

- Deployment target.
- Backend choice.
- Whether the first implementation must be genuinely real-time networked or may begin as a local/single-browser prototype with mocked lobby UI.
- Whether mobile/tablet support matters for MVP.
- Exact Defender code location.
- Exact scoreboard point values.

## Suggested Game States

The current spec suggests these MVP states:

- `boot`
- `menu`
- `lobby`
- `countdown`
- `playing`
- `paused`
- `roundOver`
- `scoreboard`
- `gameOver`

## Suggested Architecture

Use React for the app shell, lobby, HUD, scoreboard, menus, and top-level state. Keep high-frequency gameplay simulation separate from React rendering where practical.

Suggested source layout from `spec.md`:

```text
src/
  App.jsx
  App.css
  index.css
  game/
    constants.js
    PlayfieldView.jsx
    engine.js
    input.js
    hitDetection.js
    entities/
      player.js
      racer.js
      npc.js
      bullet.js
      crosshair.js
      lobbyPlayer.js
    systems/
      lobby.js
      secretAssignments.js
      countdown.js
      npcBehavior.js
      shooting.js
      scoring.js
      rounds.js
      defenderAdapter.js
    render/
      drawWorld.js
      drawHud.js
```

Do not add `defenderAdapter.js` until Defender source is located or the user approves a clean-room placeholder.

## Recommended Next Steps

1. Confirm the active workspace is `C:\Users\James\Documents\Code\deathRace`.
2. Read `progress.md`, `spec.md`, `todo.md`, and this file.
3. Run `git status --short`.
4. Search for Defender source by filename and content using terms like `defender`, `defence`, and `defense`.
5. Run `npm run lint` and `npm run build`.
6. Make a baseline commit if the user has authorized commits.
7. Decide whether MVP starts as real-time networked or local/single-browser prototype with mocked lobby UI.
8. Replace the default Vite starter UI with the first playable Death Race lobby/playfield shell.

## Current Open Questions

- Where is the protected Defender code?
- Must MVP be genuinely real-time networked immediately, or can it start as a local/single-browser prototype?
- What is the deployment target?
- What backend, if any, should be used first?
- What exact scoreboard point values should be used?
- How exactly should Death Race and Defender mechanics connect?

## Notes For Future LLMs

- Treat this file as a handoff, not a replacement for the full docs.
- If this file conflicts with a newer user instruction, follow the newer user instruction.
- If this file conflicts with the actual repo, inspect the repo and update the docs.
- Keep the user looped in before making irreversible choices.
- The most important user constraint is: do not override the Defender code.
