# Death Race

Browser-playable hidden-identity racing/shooting game.

## Architecture

The playable frontend is hosted on Cloudflare Pages and connects directly to the authoritative Colyseus game server on Fly.io. The server owns authenticated players, hidden lane assignments, movement, stamina, NPCs, shots, scores, rounds, reconnects, and room disposal.

Run the local frontend and Colyseus server together:

```powershell
npm run dev:migration
```

Run server and protocol tests with `npm run test:colyseus`, and the complete hosted three-round match proof with `npm run smoke:fly`. See `server/README.md` for the authority and deployment boundaries.

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

## Game Server

The multiplayer room state lives in the Colyseus `DeathRaceRoom` deployed as `death-race-online-game` on Fly.io.

Deploy it with the Fly CLI:

```powershell
C:\Users\James\.fly\bin\flyctl.exe deploy --remote-only
```

Production builds default to `wss://death-race-online-game.fly.dev`. Override the endpoint for another environment with `VITE_COLYSEUS_URL`.

Example:

```powershell
$env:VITE_COLYSEUS_URL='wss://another-game-server.example'
npm run build
```

The pre-cutover Cloudflare-realtime build remains available for rollback at `https://40288567.death-race-online.pages.dev` until the obsolete Worker code is removed from the repository.

## Project Docs

- `spec.md`: game design and technical shape.
- `progress.md`: completed work and current state.
- `todo.md`: remaining work.
- `WHY.md`: the architecture story — how the pieces fit and what to learn from them.
- `why.html`: interactive version of `WHY.md` with live demos and code walkthroughs; served at `/why.html`.

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
- Lane 1 racers' ears and KO markers overflow above the board edge instead of being clipped.
- Your assigned lane varies between rounds and between rooms.
- A round ends only when a non-eliminated racer reaches the finish.
- NPCs read as a crowd: they hold at the line for ~1.5s after `go`, then mostly walk with short sprint bursts, comfortably slower than a committed human.
- The round never freezes on `go` — if the phase does not turn immediately, it recovers within moments.
- Human winners get 3 points; killing a real player earns the shooter 1 point; NPC kills and NPC winners earn nothing.
- Round over shows the winner reveal and the scoreboard together; the host's only action is Next round (or Show final scores after the last round).
- The final-scores screen stays put — later room syncs must not yank it back to the scoreboard.
- The scoreboard shows a kills count per player and the match ends after the selected round count.

## Guardrail

Do not overwrite, delete, replace, or casually refactor existing Defender code. Locate and document Defender source files before any integration work.
