# Death Race

Browser-playable hidden-identity racing/shooting game.

## Commands

```powershell
npm run dev
npm run lint
npm run build
npm run preview
npm run preview:cloudflare
npm run deploy:cloudflare
```

## Cloudflare Pages

Use Cloudflare Pages for the hosted build of `J1marotta/death-race-online`.

Dashboard setup:

- Project name: `death-race-online`
- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

CLI deploy:

```powershell
npx wrangler login
npm run deploy:cloudflare
```

## Rooms Backend

The multiplayer room state lives in the Cloudflare Worker defined by `wrangler.worker.jsonc`.

Deploy it with:

```powershell
npm run deploy:rooms
```

For a production Pages build that talks to the deployed worker, set `VITE_ROOMS_API_BASE` to the worker endpoint plus `/api/rooms`.

Example:

```powershell
$env:VITE_ROOMS_API_BASE='https://death-race-rooms.james-marotta.workers.dev/api/rooms'
npm run build
```

## Project Docs

- `spec.md`: game design and technical shape.
- `progress.md`: completed work and current state.
- `todo.md`: remaining work.
- `WHY.md`: the architecture story — how the pieces fit and what to learn from them.
- `WHY.html`: interactive version of `WHY.md` with live demos and code walkthroughs; open it directly in a browser.

## Manual QA

Run `npm run dev`, open the local Vite URL, and check:

- The title screen leads with the highlighted "Join a game" card (room code field + join button) above "Host a game".
- Room codes are dashless (e.g. `DR7Q2K`) and lobby control labels are sentence case.
- Lobby shows room code, privacy controls, player names, round count, and start action.
- Countdown blocks movement and shooting until `go`, and the control bar renders dimmed.
- `Right Arrow` walks and `Space` sprints the local hidden racer during play.
- The kbd buttons below the playfield depress and glow while their keys are held; the mouse element's left button lights up on fire.
- Mouse movement aims the local crosshair; Mouse 1 fires once, removes the bullet marker, greys the crosshair, dims it, and greys the fire button in the control bar.
- Typing spaces in the name fields works; movement keys are ignored while an input has focus.
- Firing plays a gunshot (noise crack plus low thump), not a soft chirp.
- Landing a shot briefly shakes the playfield with a white flash; getting shot shakes it harder with a red flash.
- A `KO!` marker with the killer's name bounces in the victim's lane for about a second, and the corpse tag reads `down · <killer>`.
- Corpses stay frozen exactly where the shot landed instead of snapping back to the lane start.
- A kill feed in the playfield corner shows `killer ▸ victim` and fades after a few seconds.
- The control bar stays visible below the playfield in every state.
- Shot racers stay visible as bodies and eliminated humans become spectators.
- A round ends only when a non-eliminated racer reaches the finish.
- NPCs read as a crowd: they hold at the line for ~1.5s after `go`, then mostly walk with short sprint bursts, comfortably slower than a committed human.
- The round never freezes on `go` — if the phase does not turn immediately, it recovers within moments.
- Human winners get 3 points; killing a real player earns the shooter 1 point; NPC kills and NPC winners earn nothing.
- Round over shows the winner reveal and the scoreboard together; the host's only action is Next round (or Show final scores after the last round).
- The final-scores screen stays put — later room syncs must not yank it back to the scoreboard.
- The scoreboard shows a kills count per player and the match ends after the selected round count.

## Guardrail

Do not overwrite, delete, replace, or casually refactor existing Defender code. Locate and document Defender source files before any integration work.
