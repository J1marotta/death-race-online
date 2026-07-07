# Death Race Game Spec

This file is written for future LLM agents and human collaborators. It should be treated as the shared project brief before changing code.

## Project Location

- Active project: `C:\Users\James\Documents\Code\deathRace`
- Old workspace: `C:\Users\James\Documents\death race`
- Current stack: React + Vite, JavaScript modules, npm, Oxlint
- Current app status: default Vite starter UI is still present in `src\App.jsx`
- Git status at time of writing: repository initialized, no baseline commit yet

## Source And Confidence

Confirmed from the visible repo, visible chat context, `CHAT_GAME_CONTEXT.md`, and the attached pasted text:

- The active project is `C:\Users\James\Documents\Code\deathRace`.
- The project is currently a React + Vite app using npm and Oxlint.
- Git is initialized and there is no baseline commit yet.
- The visible app is still the default Vite starter UI.
- The user explicitly said not to override Defender code.
- Confirmed layout target: design the main game presentation to look good at `1200px` wide on a laptop.
- The attached pasted text at `C:\Users\James\.codex\attachments\2d9190c4-bb74-437b-bcd4-83988b5ed4cc\pasted-text.txt` contains the recovered MVP gameplay preferences.

Do not replace the recovered MVP preferences below with agent-authored defaults.

## MVP Preference Status

Recovered from the attached pasted text on 2026-07-07:

- Browser-playable Death Race game with lobby-based multiplayer.
- Room code/link lobby flow.
- Public and private lobbies.
- Host manually starts the game.
- Host chooses number of rounds.
- Multi-round scoreboard with an option to instantly start the next round.
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
- All 20 lanes must fit on one screen with no scrolling.
- Fast, readable, replayable feel.
- Short rounds.
- Clear feedback for score/progress.
- Avoidable threats.
- Escalating pressure.
- One-action restart loop.
- Careful Defender preservation/integration without overwriting original Defender code.
- Laptop presentation target: `1200px`.

Still not answered in the recovered text:

- Deployment target.
- Backend choice.
- Whether the first implementation must be genuinely networked in real time or may begin as a local/single-browser prototype with lobby UI.
- Whether mobile/tablet support matters for MVP.
- Exact location of the protected Defender code.

Do not implement gameplay that depends on these unanswered items without either finding a newer answer or asking the user.

## Core Game Rules

### Round Flow

1. Players join a lobby by room code/link.
2. Lobby may be public or private.
3. Empty racer slots are filled with NPCs so there are always 20 racers.
4. Host chooses the number of rounds.
5. Host starts the round manually.
6. A `3, 2, 1, go` countdown begins.
7. Each human player receives a secret racer assignment.
8. Players move, aim, infer identities, and use their single shot.
9. Eliminated players spectate while their dead racer remains on the track.
10. The round continues until a racer wins.
11. If an NPC wins, the human players are shamed and player racers are revealed.
12. After the round, the scoreboard is shown and the host can instantly start the next round.

### Player Identity

- Each human player is secretly assigned one racer at the start of a round.
- The main play tension is inference: move enough to win, but not so obviously that other players identify and shoot you.
- Player names are visible in the lobby and scoreboard.
- Player names are not attached to racers during live gameplay.
- After a winner is declared, human-controlled racers are highlighted and associated with their players.

### Movement And Controls

- `Space`: walk.
- `Left Shift`: run.
- No movement button pressed: stop.
- Mouse: aim.
- Mouse 1: fire.
- Running has no stamina/cooldown/noise UI. The downside is social/behavioral: running makes intent easier to read and may draw shots.

### Shooting And Aiming

- Each human player gets exactly one bullet per round.
- Players may shoot any racer/lane, including themselves.
- Shooting eliminates the target.
- NPCs never shoot in MVP.
- All player crosshairs are visible to everyone while that player still has a bullet.
- Crosshairs are color-coded by player.
- Show a visible single-bullet indicator.
- Once a player has fired, hide that player's crosshair.

### Elimination And Winning

- If your assigned racer is shot, you are out for the round.
- Eliminated players continue watching.
- Dead bodies remain visible on the track.
- The round only ends when there is a winner.
- NPCs are allowed to win.
- If an NPC wins, show a shame/reveal moment where all human-controlled racers are highlighted.

### Lobby And Rounds

- One player creates a lobby and shares a code/link.
- Support private and public lobbies.
- Up to 20 human players can join.
- Racer count is always 20, with NPCs filling unused slots.
- Host manually starts each round.
- Host chooses the number of rounds.
- A scoreboard tracks multi-round results.
- Host can instantly start the next round from the scoreboard.
- Late joiners spectate until the next round.

### NPC Behavior

- NPCs walk, stop, and occasionally run.
- NPCs should imitate human-like behavior.
- NPCs should never shoot in MVP.

### Visual And Layout Direction

- Pixel-art style.
- 5 unique character looks repeated 4 times to fill 20 lanes.
- Repeated character looks are visually identical.
- Lanes should have slight depth/perspective like the screenshot.
- All 20 lanes must fit on one screen without vertical scrolling.
- Main presentation should look good at `1200px` wide on a laptop.

## Non-Negotiable Guardrails

- Do not overwrite, delete, replace, or casually refactor existing Defender code.
- If Defender code is found outside this repo, document its source path before copying, adapting, or integrating anything.
- Keep Defender logic isolated behind an adapter/module boundary so the original code can remain intact.
- Make a baseline git commit before major implementation work.
- Keep changes small and reviewable. Avoid unrelated formatting churn.
- Keep generated output such as `dist`, logs, and `node_modules` out of commits.
- After each meaningful implementation chunk, run `npm run lint` and `npm run build`.

## Game Vision

Build a browser-playable hidden-identity Death Race game for a lobby of up to 20 human players, with NPC racers filling any empty slots. Each human secretly controls one racer in a 20-lane race. Players must infer who they are, avoid revealing themselves too clearly, and spend their one bullet wisely.

The game should feel:

- Immediate controls
- Short rounds
- Clear score feedback
- Readable at a `1200px` laptop presentation
- Socially tense because movement reveals identity
- Chaotic but fair because each player has only one shot
- A restart loop that takes one action
- Careful around Defender code: preserve it and do not overwrite it

## MVP Gameplay Loop

1. Host creates or opens a public/private lobby.
2. Players join by room code/link.
3. Host chooses the number of rounds.
4. Host starts the round.
5. Game fills to 20 racers with NPCs.
6. Human players receive secret racer assignments.
7. Countdown runs: `3, 2, 1, go`.
8. Racers move across the track; humans control walk/run/stop while NPCs imitate human-like movement.
9. Players aim visible color-coded crosshairs and may fire their one bullet.
10. Shot racers are eliminated and remain as bodies.
11. Eliminated players spectate until the round ends.
12. First winning racer ends the round; NPCs are allowed to win.
13. At round end, reveal/highlight human-controlled racers.
14. Show scoreboard and allow the host to instantly start the next round.

## Core Mechanics

### Player Vehicle

- The controlled unit is a secretly assigned racer/character.
- Movement states are stopped, walking, and running.
- `Space` walks.
- `Left Shift` runs.
- Releasing movement buttons stops the racer.
- Mouse aims.
- Mouse 1 fires the player's one bullet.
- Movement should be responsive and deterministic enough that identity inference feels fair.

### Playfield

- 20 lanes must fit on one screen without scrolling.
- Lanes should use slight depth/perspective like the screenshot.
- The playfield must be readable at the `1200px` laptop target.
- The renderer is still an implementation choice, but the output must support pixel-art characters and visible crosshairs.

### NPC Racers

- NPCs fill empty player slots so there are always 20 racers.
- NPCs walk, stop, and occasionally run.
- NPCs should imitate human behavior.
- NPCs never shoot in the MVP.
- NPCs can win.

### Defender Integration

Defender code must be treated as existing protected work until proven otherwise.

Integration approach:

1. Locate Defender code source.
2. Document exact files and entry points in `progress.md` or this spec.
3. Identify reusable systems only if they are relevant to the recovered MVP, such as scoring, racer behavior, rounds, reveal states, or any existing Defender logic the user explicitly wants preserved.
4. Copy only through an explicit adapter if needed, preserving original files.
5. Add tests or manual QA around the integrated behavior.

Do not invent Defender-inspired mechanics. Use the recovered MVP preferences and the original Defender source once it is located. If the original Defender behavior conflicts with Death Race mechanics, keep the original logic intact and adapt inputs/outputs at the boundary.

## Suggested Game States

Use an explicit finite set of game states:

- `boot`: assets/config are loading
- `lobby`: room code, public/private choice, player list, round count, host controls
- `countdown`: `3, 2, 1, go`
- `menu`: title screen and start action
- `playing`: live gameplay simulation
- `paused`: simulation stopped, screen retained
- `roundOver`: winner, reveal/highlight player racers, NPC shame case
- `scoreboard`: multi-round results and instant next-round action
- `gameOver`: final match result

Transitions:

- `boot -> menu` after setup
- `menu -> lobby` on create/join
- `lobby -> countdown` when host starts
- `countdown -> playing` after countdown
- `playing -> paused` on pause
- `paused -> playing` on resume
- `playing -> roundOver` when a racer wins
- `roundOver -> scoreboard` after reveal/shame moment
- `scoreboard -> countdown` when host starts next round
- `scoreboard -> gameOver` when selected rounds are complete
- late joiners enter a spectator state until the next round

## Scoring And Loss Rules

- Each human player has one secretly assigned racer per round.
- Each human player has exactly one bullet per round.
- A shot racer is eliminated from the round.
- Eliminated players spectate until the next round.
- Dead bodies remain visible.
- The round ends only when there is a winner.
- NPCs may win. If an NPC wins, show a shame/reveal moment.
- Scoreboard must support multiple rounds.
- Exact scoreboard point values are not specified in the recovered text; do not invent them without asking or finding a newer answer.

## Suggested Technical Architecture

Use React for app shell, lobby, menus, HUD, scoreboard, and top-level state. Use a game renderer that supports a 20-lane pixel-art presentation with visible crosshairs at the `1200px` laptop target.

Suggested source layout:

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

### React Responsibilities

- Mount the game playfield view.
- Hold top-level game state such as menu, lobby, countdown, playing, paused, round over, scoreboard, and game over.
- Display room code/link, public/private choice, player names, host controls, round count, scoreboard, bullet indicators, and restart/next-round UI.
- Route user actions to the game engine.
- Avoid re-rendering React on every animation frame unless necessary.

### Engine Responsibilities

- Own the animation loop with `requestAnimationFrame`.
- Track deterministic game state.
- Process input.
- Update racers, NPC movement, aiming, bullets, eliminations, winner detection, and reveal state.
- Emit events to React for round winner, NPC win shame state, scoreboard updates, and state transitions.

### Input Responsibilities

- Normalize the confirmed control scheme into gameplay intent.
- Prevent stuck or stale input when focus or interaction state changes.
- Keep controls configurable through constants.
- MVP controls are `Space`, `Left Shift`, mouse aim, and Mouse 1 fire.

### Rendering Responsibilities

- Draw the playfield, actors, effects, and optional HUD overlays.
- Keep rendering crisp at the `1200px` laptop target.
- Render 20 lanes with slight depth/perspective and no vertical scrolling.
- Render visible color-coded crosshairs for players who still have a bullet.
- Hide a player's crosshair after they fire.
- Render dead bodies and end-of-round player highlights.
- Keep drawing functions stateless where practical.

## Suggested Visual Direction

- Arcade readability beats realism.
- Pixel-art racers should be instantly recognizable by archetype.
- The 5 repeated character looks must be visually identical across their repeats.
- Human-controlled racers are not identified during live play.
- Crosshairs, bullet indicators, dead bodies, winner state, and end-of-round reveal should be readable at a glance.
- Avoid default Vite visuals once implementation starts.
- Use real bitmap or hand-authored game assets when needed; do not rely on placeholder logos.

Suggested palette direction:

- Track/lane colors with enough contrast for 20 rows.
- Distinct crosshair colors per player.
- Clear eliminated/dead-body state.
- Clear winner/reveal highlight state.

## Suggested Asset Strategy

The MVP can begin with simple temporary pixel-art-compatible visuals only where they preserve the recovered rules and the hidden-identity readability.

After the loop works:

- Replace simple shapes with lightweight sprites.
- Keep sprites in `src/assets` or `public/assets`, consistently.
- Document asset source/licensing if downloaded or generated.
- Prefer small, readable sprites over decorative art that obscures gameplay.

## Draft Implementation Milestones

### Milestone 0: Baseline Safety

- Confirm active folder is `C:\Users\James\Documents\Code\deathRace`.
- Confirm no Defender code is being overwritten.
- Commit the current project baseline.
- Replace README template with project run notes.

Acceptance:

- `npm run lint` passes.
- `npm run build` passes.
- Baseline commit exists.

### Milestone 1: Playable Skeleton

- Replace Vite starter UI with Death Race app shell.
- Add menu, lobby, countdown, playing, round-over, scoreboard, and game-over states.
- Add a `1200px`-target playfield that fits 20 lanes with no scrolling.
- Add placeholder 20 racers with 5 repeated identical archetypes.
- Add host-start flow and `3, 2, 1, go` countdown.

Acceptance:

- A host can start a round from a lobby.
- The game shows 20 lanes/racers at the laptop target width.
- The round can move through countdown, playing, round-over, and scoreboard states.
- No Vite starter content remains on screen.
- `npm run lint` and `npm run build` pass.

### Milestone 2: Movement And Hidden Identity

- Add secret player-to-racer assignment.
- Add `Space` walk, `Left Shift` run, release-to-stop controls.
- Add NPC walk/stop/occasional-run behavior that imitates humans.
- Keep player names visible in lobby/scoreboard but hidden from live racers.

Acceptance:

- Human players can control their assigned racers.
- Other racers do not reveal which ones are human-controlled during live play.
- NPCs fill empty slots and move plausibly.
- Movement states are readable but not overly revealing through UI.

### Milestone 3: One-Shot Shooting And Elimination

- Add mouse aiming.
- Add color-coded visible crosshairs for players who still have a bullet.
- Add one bullet per human player per round.
- Add Mouse 1 firing at any lane/racer, including self.
- Hide crosshair after firing.
- Eliminate shot racers and leave dead bodies visible.

Acceptance:

- A player can fire exactly once per round.
- Firing can eliminate any racer.
- Eliminated players spectate until next round.
- NPCs never shoot.
- Dead bodies remain visible.

### Milestone 4: Win, Reveal, Scoreboard

- End the round only when a racer wins.
- Allow NPCs to win.
- If an NPC wins, show the shame/reveal moment.
- Highlight all human-controlled racers after the winner is declared.
- Add multi-round scoreboard.
- Let the host instantly start the next round.
- Late joiners spectate until next round.

Acceptance:

- Winner flow works for human and NPC winners.
- Scoreboard supports the host-selected number of rounds.
- Player identities are revealed only after the round ends.
- Next-round flow works without page reload.
- Build and lint pass.

### Milestone 5: Defender Safety And Polish

- Locate and document Defender code if it exists outside this repo.
- Add a Defender adapter only if the user asks to integrate protected Defender behavior.
- Improve pixel art, lane depth, crosshair colors, bullet indicators, dead bodies, and reveal highlights.
- Add a manual QA checklist.

Acceptance:

- Original Defender source remains preserved.
- Pixel-art presentation remains readable at `1200px`.
- All 20 lanes fit with no scrolling.
- Build and lint pass.

## Manual QA Checklist

Run this after each gameplay milestone:

- App loads without console errors.
- Lobby can be created with public/private mode and room code/link.
- Host can choose round count.
- Host start begins `3, 2, 1, go`.
- 20 racers appear with no scrolling at `1200px`.
- Empty slots are filled by NPCs.
- Secret assignments are not revealed during live play.
- `Space` walks, `Left Shift` runs, release stops, mouse aims, Mouse 1 fires.
- Each human player has exactly one shot.
- Crosshairs are color-coded, visible while loaded, and hidden after firing.
- NPCs move but never shoot.
- Shot racers are eliminated and dead bodies remain.
- Eliminated players spectate.
- NPCs can win and trigger shame/reveal.
- Human-controlled racers are highlighted after round end.
- Scoreboard and instant next-round flow work.
- `npm run lint` passes.
- `npm run build` passes.

## LLM Working Instructions

Before editing:

- Read `progress.md`.
- Read this `spec.md`.
- Run `git status --short`.
- Inspect relevant files before changing them.

When implementing:

- Prefer small modules over one huge `App.jsx`.
- Preserve existing user changes.
- Do not delete unknown files.
- Do not overwrite Defender code.
- Keep all game constants named and centralized where practical.
- Make behavior easy to tune with numbers in `constants.js`.
- Keep React state and frame-loop state separate.
- Use clear names for entities, systems, and transitions.

When done:

- Run lint and build.
- Update `progress.md` with completed work and verification.
- Summarize changed files and remaining decisions.

## Open Decisions

- Exact Defender source location and integration target.
- Deployment target.
- Backend choice.
- Whether MVP must be genuinely real-time networked or may start as a local/single-browser prototype with mocked lobby UI.
- Whether mobile/tablet support matters for MVP.
- Exact scoreboard point values beyond supporting multiple rounds.

## Current Best Next Step

Make the baseline git commit, then replace the default Vite starter with the Milestone 1 lobby/playfield skeleton. Do not touch Defender integration until its source files are located and documented.
