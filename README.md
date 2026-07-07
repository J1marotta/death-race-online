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

## Manual QA

Run `npm run dev`, open the local Vite URL, and check:

- Lobby shows room code, privacy controls, player names, round count, and start action.
- Countdown blocks movement and shooting until `go`.
- `Space` walks and `Left Shift` runs the local hidden racer during play.
- Mouse movement aims the local crosshair; Mouse 1 fires once and hides it.
- Shot racers stay visible as bodies and eliminated humans become spectators.
- A round ends only when a non-eliminated racer reaches the finish.
- Human winners get 1 point; NPC winners get 0 human points.
- Scoreboard can start the next round and the match ends after the selected round count.

## Guardrail

Do not overwrite, delete, replace, or casually refactor existing Defender code. Locate and document Defender source files before any integration work.
