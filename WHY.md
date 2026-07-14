# Why Death Race Works

> Prefer to explore? `WHY.html` is an interactive version of this document with live demos (dead reckoning, the WebSocket cost math, the kill juice) and highlighted code walkthroughs. Open it directly in a browser. When this file changes, update `WHY.html` to match.

Death Race is a browser game about suspicion.

On the surface, it is twenty little racers moving toward a finish line. Underneath, it is a social deduction game wearing running shoes. Every human secretly controls one racer. Nobody gets a name tag during the race. Everyone gets one bullet. The real game is not "can I go fast?" It is "can I move just naturally enough that nobody realizes which one is me?"

That is the heartbeat of the project:

- Hide in a crowd.
- Read other people's movement tells.
- Spend your one shot wisely.
- Survive long enough for your racer to cross the line.

The rest of the engineering exists to protect that feeling.

## The Plain-Language Version

Think of the game as three connected places:

1. The arcade cabinet: the React app in the browser.
2. The race office: the Cloudflare Worker API.
3. The official clipboard: one Durable Object per room code.

The browser draws the track, handles keyboard and mouse input, and shows the lobby. The Worker receives room actions like "create", "join", "ready", "start", "shot", and "next round". The Durable Object is the single source of truth for one lobby. If room `DRABCD` exists, that room has exactly one official room object coordinating it.

That matters because multiplayer games get weird when every browser invents its own truth. If one player thinks Mia is ready, another thinks she is not, and the host thinks the room started already, the game stops feeling like a game and starts feeling like a broken group chat. The Durable Object is the referee holding the clipboard.

## What We Built

The project is now a deployed multiplayer prototype, not just a local mockup.

Players can:

- Create a lobby.
- Receive a room code.
- Share that code.
- Join from another browser with a username.
- See the real connected roster.
- Ready up.
- Start only when everyone is ready.
- Enter the same countdown and playing state.
- Send live movement/input snapshots.
- Shoot once per round.
- Share shot, winner, scoreboard, and next-round state.
- See a closed-room state if the host leaves or the room expires.

The current live loop is intentionally desktop/laptop first. Touch controls, accounts, permanent profiles, and ranked play can come later. Right now the important promise is simpler: a friend can open the site, type your code, join your lobby, ready up, and play.

## The Architecture In One Picture

```text
Cloudflare Pages
  hosts the React/Vite app
        |
        v
src/multiplayer/api.js
  wraps room API calls and WebSocket URLs
        |
        v
Cloudflare Worker: workers/rooms.js
  routes requests to the right room
        |
        v
Durable Object: RoomLobbyObject
  keeps the live room in memory
  persists durable changes to storage
  validates host-only actions
  batches input broadcasts on a 50ms ticker
  adjudicates human finish-line wins
  cleans up abandoned rooms
        |
        v
All connected browsers
  receive room snapshots
  render the same lobby/game phase
```

The clean idea is this: the browser is allowed to be lively and visual, but the room state lives on the server.

## The Codebase Tour

The repo is small enough to understand without a map, but the map helps.

### Frontend

- `src/main.jsx`
  Boots React into the page.

- `src/App.jsx`
  The main game surface. It owns the visible game states: menu, lobby, countdown, playing, round over, scoreboard, and game over. It also handles local input, aiming, shooting, UI state, room sync, and rendering the 20-lane playfield.

- `src/App.css`
  The visual world: the 1200px laptop layout, lobby panels, the cute pixel-animal racers (8 species drawn entirely from CSS pseudo-elements, 5 pastel fur palettes), crosshairs, bodies, checkered finish line, countdown overlay, and responsive behavior.

- `src/index.css`
  Global theme variables and document-level styling.

### Multiplayer Helpers

- `src/multiplayer/api.js`
  The frontend's phone line to the room backend. It knows how to create, join, ready, heartbeat, submit input, start countdowns, record shots, finish rounds, and open the live room WebSocket.

  It also has an important production rule: on localhost, use `/api/rooms`; on deployed Pages hosts, call the deployed Worker at `https://death-race-rooms.james-marotta.workers.dev/api/rooms`.

- `src/multiplayer/roomState.js`
  Pure room-state logic shared by the app and Worker. This is where room rules live: creating rooms, joining rooms, readying players, pruning stale players, starting countdowns, recording shots, finishing rounds, showing the scoreboard, and deciding if a room should be destroyed.

This file is especially important because it keeps the rules from splitting into two slightly different versions. When both the client tests and Worker use the same room helper logic, the game has fewer places to lie to itself.

### Backend

- `workers/rooms.js`
  The Cloudflare Worker and Durable Object room coordinator.

  It handles:

  - HTTP room actions.
  - CORS for the deployed Pages app.
  - WebSocket live connections.
  - Durable Object storage.
  - Room broadcasts.
  - Host-only validation.
  - Heartbeats.
  - Stale player pruning.
  - Cleanup alarms.

- `wrangler.worker.jsonc`
  Worker deployment config, including the Durable Object binding.

- `wrangler.jsonc`
  Cloudflare Pages deployment config.

### Tests

- `src/App.test.jsx`
  UI and gameplay regression tests: movement, aiming, shooting, lobby controls, join flow, hidden roster derivation, side panel behavior, transport status hiding, and finish line rendering.

- `src/multiplayer/api.test.js`
  API wrapper tests: room calls, WebSocket URL creation, production API fallback, and payload behavior.

- `src/multiplayer/roomState.test.js`
  Pure state-rule tests: joins, readiness, spectators, shots, stale cleanup, round transitions, scores, and room destruction decisions.

- `workers/rooms.test.js`
  Worker behavior tests: no placeholder rooms, CORS, host leave destruction, cleanup alarms, ready requirements, WebSocket fallback, and round-event authorization.

### Docs

- `spec.md`
  The design source of truth.

- `todo.md`
  What is left to do. Currently it says none.

- `progress.md`
  The build log. This is the trail of decisions, fixes, and verification steps.

- `README.md`
  Commands, deployment notes, and manual QA.

- `WHY.md`
  This file. The story of how the pieces fit and what to learn from them.

## How A Lobby Works

Here is the exact flow we wanted:

1. Host clicks `Create lobby`.
2. The app generates a room code like `DR1JLQ`.
3. The browser sends `action: create` to the Worker.
4. The Worker routes that code to one Durable Object.
5. The Durable Object creates a room with James as host.
6. The host sees the room code and real player list.
7. A friend enters their username and the code.
8. The friend sends `action: join`.
9. The room adds them as a connected player.
10. Everyone sees the updated roster.
11. Each connected player clicks `Ready up`.
12. The Worker only allows the host to start when every connected player is ready.
13. The host starts the countdown.
14. Both browsers follow the same room phase into live play.

That last part is the difference between a fake lobby and a real lobby. A fake lobby changes only your screen. This lobby changes the shared room snapshot.

## How Live Play Works

During live play, every browser still renders its own scene. That keeps the UI fast and simple. But important events are shared through the room:

- Local movement sends input snapshots at 20Hz over the live socket.
- The latest input snapshots live in the room's memory and go out as compact 50ms deltas.
- Shots are recorded in room state.
- Shot racers are eliminated for every client.
- The room adjudicates human finish-line wins from the freshest inputs; the host reports NPC wins.
- The shared scoreboard and round history come from the room.
- The host starts the next round.

The host still drives phase transitions (countdown to playing, scoreboard, next round), but the contested moment — who crossed the line first — is decided server-side from 20Hz input data, and the first recorded winner for a round stands. NPC wins still come from the host because NPCs are simulated deterministically on every client, and the server does not run that simulation.

If this ever becomes competitive, more should move server-side, because client-owned movement and hidden assignments are easy for a determined player to inspect or tamper with, and identity is still just a player name.

For friends testing a hidden-identity party game, the current architecture is the right kind of honest: real multiplayer rooms, clear state ownership, enough synchronization to play, and not too much infrastructure too early.

## How The Netcode Stays Smooth

The screen runs at 60fps. The network does not, and never needs to.

- Local movement advances on a requestAnimationFrame delta-time loop, so your own racer moves at your display's refresh rate.
- Remote racers are dead-reckoned: each frame the client extrapolates from their last synced progress and movement mode (the speed constants are shared), easing toward the target instead of snapping once per sync. Small corrections ease; large ones snap through.
- Input sends are event-driven, not fixed-rate: movement-mode, lane, and firing changes send immediately, but while nothing changes except progress, only a correction every 400ms goes out — dead reckoning fills the gap exactly because both sides share the speed constants. The final stretch (progress 85+) runs at the full 20Hz check rate so the server adjudicates the finish from fresh data. Aim never rides the periodic snapshot; it travels only with the shot. The HTTP fallback stays rate-limited to once per second.
- The Durable Object keeps the room in memory during play and rebroadcasts inputs as compact deltas on a 50ms ticker that stops itself when traffic goes quiet, so the object can hibernate and storage is only written for durable changes.
- The sockets use Cloudflare's WebSocket hibernation API, so idle rooms cost nothing and connections survive object eviction.

The mental model: smoothness is a rendering trick layered on honest, lower-rate network state. Physical round-trip time to the room still exists; dead reckoning is what hides it.

## The Durable Object Idea

A normal serverless function is like a front desk worker who forgets every conversation after answering it. That is fine for simple requests, but awkward for a live game room.

A Durable Object is different. It is more like assigning one room manager to one room code. Every request for `DR1JLQ` goes to the same coordinator. That coordinator can keep room state, schedule cleanup, and broadcast changes to connected sockets.

That is why Durable Objects fit this project:

- A room code naturally maps to one room owner.
- Multiplayer state needs one official version.
- WebSockets need a place to live.
- Cleanup should happen even when players disappear.

The Worker uses `idFromName(roomCode)` so the same room code always routes to the same Durable Object.

## WebSockets And Polling

The app uses WebSockets for live traffic in both directions and HTTP polling as a fallback.

WebSocket:

- Fast.
- Pushes updates immediately.
- Carries input, heartbeats, and shots up from clients.
- Good for lobby roster, readiness, shots, and phase changes.

Polling fallback:

- Slower.
- Less elegant.
- Extremely useful when sockets fail, tests run without socket support, or a browser/network gets fussy.

Good engineers often keep a boring backup path around. It is like having a manual door next to an automatic one. Most people use the automatic door. When it jams, the manual door keeps the building usable.

## Why React And Vite

React is good for this because the game currently has a lot of stateful UI:

- Lobby controls.
- Player rows.
- Ready states.
- Error panels.
- Scoreboards.
- Round states.
- Conditional side panels.
- Crosshairs and reveal tags.

Vite is fast and plain. It gives a tight local loop without making the project feel bigger than it is.

We did not reach for a heavy game engine because the first playable version is about proving the hidden-identity loop. A full engine can be helpful later, but early on it would mostly add ceremony. This game needed a clear track, clean input, and honest multiplayer state more than it needed a physics system.

## Why DOM And CSS Instead Of Canvas

The earliest spec allowed a 2D canvas renderer. The current implementation uses DOM and CSS for the playfield.

That was a practical choice.

The game needed:

- 20 readable lanes.
- Pixel-style racers.
- Crosshairs.
- Bodies.
- Reveal labels.
- A checkered finish line.
- A responsive 1200px layout.
- Lots of UI around the track.

CSS handles that well. It also makes testing easier because the test suite can query lanes, buttons, labels, and markers directly.

Canvas may still be useful later if animation complexity grows, if performance becomes a problem, or if the art direction becomes more elaborate. But switching to canvas should be a response to pressure, not a reflex.

## How The Animal Racer CSS Works

Every racer is three spans and zero images. The whole zoo — 8 species in 5 palettes, 40 distinct looks — is roughly 150 lines of CSS built from four tricks.

**The box is the body.** The base `.racer` element is a 22×25 bordered box whose background is the fur color. That box is also the hitbox. The `.racer-head` span is a rounded face patch, `.racer-body` is a belly patch, and `.racer-shadow` is the ground shadow. Nothing about a species changes the box, which is how the spec's "same hitbox for every variant" rule survives: a bunny with tall ears occupies exactly the same clickable area as a frog.

**The box-shadow clone trick.** A `box-shadow` with no blur is a pixel-perfect copy of the element's shape, offset by the shadow's distance. One 2×3 pixel plus `box-shadow: 5px 0 0 #111` draws both eyes from a single pseudo-element. The same trick duplicates the bear's round ears, the bunny's tall ears, the mouse's big ears, the pig's floppy ears, and the frog's eye bumps — every symmetric feature costs one element and one shadow, never two elements.

**Clip-path for the pointy bits.** Triangular features — cat and fox ears, the chick's beak and tail feathers — are `clip-path: polygon(...)` cuts on small rectangles. A single polygon like `polygon(0 100%, 20% 0, 40% 100%, 60% 100%, 80% 0, 100% 100%)` cuts both cat ears out of one strip.

**Species are pseudo-element slots.** Each `shape-N` class fills up to three slots on the shared anatomy: `.shape-N::before` is the headgear (ears, eye bumps, tuft), `.shape-N::after` is usually the tail (hanging off the left, since racers run right), and `.racer-head::after` carries the face feature (bear muzzle, pig snout, mouse nose, chick beak, frog grin). Palettes are just three custom properties — `--suit` for fur, `--head` for face and belly, `--trim` for accents — swapped by the `archetype-*` class, so any species renders in any palette with no extra rules.

Two non-obvious constraints shaped this. First, the `shape-N` class names never changed even though the silhouettes did, because `npcBehavior.js` seeds each NPC's pacing personality from its `shapeClass` string — renaming the classes would have silently reshuffled every NPC's behavior. Second, everything composes with the existing states because it is all one element tree: the dead rotation, desaturation, hit flash, and step-bob animations apply to the same box the features hang off, so corpses keep their ears.

Lesson: pseudo-elements and unblurred box-shadows are a free sprite sheet. Before reaching for image assets or canvas, check how far "one box, three vars, and a few shadows" can go.

## The Most Important Technical Decisions

### 1. Real Rooms, Not Fake UI

The project had some early local/prototype behavior. That was useful while shaping the game, but it became dangerous once the goal became "my friends can join and play."

The rule now is simple: if the UI says there is a room, the backend room should exist.

That led to fixes like:

- No placeholder room on `GET`.
- No joining a room before the host creates it.
- Room code comes from the user's requested code, not an internal object id.
- Join errors are visible instead of silently entering a fake lobby.

### 2. Everyone Ready Means Everyone

The host can only start when every connected player, including the host, is ready. That rule lives in `canStartRoom`.

This kind of rule belongs in shared state logic, not scattered button checks. Buttons are allowed to explain and reflect the rule. The backend must enforce it.

### 3. Host-Only Round Control

Only the host can start countdowns, advance live play, record round winners, show scoreboards, and start next rounds.

Without that, every client becomes a little steering wheel. One enthusiastic guest could move the room forward before everyone else is ready. Host-only control keeps the shared state calm.

### 4. Heartbeats Are Per Player

A major cleanup bug came from the wrong kind of "touch." If every room request refreshed every player, disconnected players never looked stale. The room would think everyone was still present because any activity kept everybody alive.

The fix was per-player heartbeats. Each browser refreshes only its own timestamp. That lets the room tell the difference between "Mia is still here" and "James clicked something."

### 5. Internal State Should Not Become UI Noise

The visible `Sync` status flickered between transport states like `live` and `connected`. Internally, that information helps with recovery. Visually, it was just noise.

We kept the internal state and removed the visible flicker.

This is a small lesson with a big reach: not every useful engineering detail deserves a place on screen. Users need confidence, not a networking diary.

### 6. Kills Are Scored Where The Truth Lives

When kill points arrived (a round win is 3 points, a human kill is 1, NPC kills are worth nothing), the tempting shortcut was to let the shooting client declare "I killed Mia" — it already knows the lane assignments. We did not do that. The server resolves the victim from the freshest inputs: whichever connected player last claimed that lane is the human victim, anything else is an NPC. The shooter's client still scores optimistically for instant feedback, but the authoritative number always comes back from the room.

The same change forced a cleanup: room inputs now reset when a new round starts, because a stale lane claim from the previous round could have credited a kill against a player who was no longer in that lane. Stale inputs could also have mis-adjudicated a finish, so clearing them fixed a latent bug we had not hit yet.

The design rule for the juice itself: attribution must not leak hidden identity. A killer's *name* on the KO marker and kill feed reveals nothing about which lane the killer controls, and a victim's name is only revealed once they are already dead. The tension mechanic survives intact.

## Bugs We Hit And What They Taught Us

### The Hardcoded Room Problem

At one point, the UI still behaved like the room was hardcoded. That is classic prototype residue. The screen looked interactive, but the mental model was still "local demo."

The fix was to audit the button flow against the desired real flow:

- Host creates lobby.
- Host gets code.
- Player enters code and username.
- Player joins that exact room.
- Everyone sees the same roster.
- Everyone readies up.
- Host starts.

Lesson: when a user gives you a flow, test against the flow, not against individual components. A button can work in isolation and still fail the story.

### Placeholder Rooms

The Worker originally allowed missing rooms to appear through `GET` or `join` behavior. That made the UI feel like it worked, but it was not trustworthy.

The fix was to allow only the explicit `create` action to create a room. Missing `GET` and `join` now return `Room not found`.

Lesson: fake success is worse than honest failure. A clear error gives you something to fix. A fake room lets the bug put on a nice jacket and walk around.

### Room Code Preservation

Durable Objects have internal ids, but users care about shareable room codes. We hit a path parsing issue where the room code could drift toward internal or wrong path values.

The fix was to parse the room code from `/api/rooms/:roomCode` and preserve the requested code inside the room snapshot.

Lesson: identifiers have audiences. Internal ids are for infrastructure. Room codes are for humans. Do not mix them casually.

### Production API Fallback

The deployed Pages app initially tried to call relative `/api/rooms`. That can work in local dev or with Pages Functions, but our room backend is a separate deployed Worker.

The fix was `getRoomsApiBase`:

- Localhost uses `/api/rooms`.
- Production Pages hosts use the deployed Worker URL.
- `VITE_ROOMS_API_BASE` can override it when needed.

Lesson: local paths can lie. Production has origins, routing, CORS, and deployment boundaries. Always test the deployed shape.

### CORS Preflight

After the frontend pointed at the Worker, the browser still blocked requests because the Worker did not answer CORS preflight requests.

The fix was:

- Add CORS headers to JSON responses.
- Add an `OPTIONS` response for preflight.
- Add Worker tests for both.

Lesson: Postman and unit tests are not a browser. Browsers enforce rules that server-to-server tools do not. If the app runs in a browser, verify in a browser.

### WebSocket Runtime Differences

The Worker supports WebSockets in Cloudflare, but tests and some runtimes may not expose `WebSocketPair`.

The fix was to return a clear `501` response when live transport is unavailable, while keeping HTTP polling as fallback.

Lesson: graceful degradation is not pessimism. It is how you keep debugging from turning into archaeology.

### Host Leave And Room Destruction

Rooms needed to die when the host leaves or when everyone disconnects. Otherwise old rooms linger and confuse players.

The fix combined:

- Host-leave detection.
- `shouldDestroyRoom`.
- Per-player heartbeat timestamps.
- Durable Object cleanup alarms.
- A closed-room UI state.

Lesson: multiplayer is not only about connecting people. It is also about cleaning up after the connection disappears.

### Janky NPCs

The NPCs were disappearing, reappearing, and racing too aggressively. That broke the hidden-identity promise because they felt obviously artificial.

The fix was to make NPCs stick to lanes, calm their winning behavior, and later match their movement speed to player speed when walk/run speed increased.

Lesson: simulation bugs are design bugs. If NPCs behave strangely, players stop reading social tells and start reading implementation flaws.

### NPCs That Idled Forever

The calming went too far. Simulation showed NPCs spent about 40% of their ticks stopped or idle-crawling, with a per-lane drag handicap on top, averaging 39% of a running player's speed. The fastest NPC finished in ~47 seconds against a ~21 second running player, so NPCs read as set dressing — and anyone moving with intent was instantly identifiable as human.

The fix flipped the behavior model from "wandering extras" to "players": run-heavy pacing personalities with walk breaks and brief human-scale stops, no extended pause blocks, no idle crawl, no drag handicap. Front-runner NPCs now finish in 23-24 seconds, so committed humans win narrowly and hesitant humans can lose.

Lesson: in a hidden-identity game, NPCs are not scenery. They are the crowd you hide in, so they must be statistically similar to the players.

### Music That Sounded Like Static

The first gameplay music sustained a square-wave bass and a sawtooth drone continuously under a fast minor-key note loop. Harsh waveforms held forever read as noise, not music.

The fix replaced the drones with an elevator-style loop: soft sine pads holding a Cmaj7/Am7/Dm7/G7 progression, a gentle triangle melody at a relaxed beat, and a quiet bass note on each chord change.

Lesson: generated audio is cheap to ship and easy to get wrong. Waveform choice and envelope shape matter more than the notes.

### Corpses That Teleported Back To The Start

Eliminated racers were supposed to stay where they fell. Instead, `getLiveProgress` returned `racer.progress` — the lane's *starting* position — for any shot racer, so a corpse dropped at 60% of the track instantly teleported back to its spawn point. Nobody had noticed because most eliminations happened early, near the start positions.

The fix separates "where is this racer on the track" from "this racer is dead": the shooter's client captures the target's live progress at the moment the hit lands, every other client captures it the moment the elimination syncs in, and dead racers render from that frozen value for the rest of the round.

Lesson: a wrong value that is *usually close* to the right value can hide for a long time. The bug only became visible once we went looking at kills that landed mid-track.

### The Corpse That Came Back To The Start Line

The corpse fix above had a sequel. A playtest showed one shot NPC frozen correctly mid-track and another standing dead at the start line — timing-dependent, so it smelled like a race.

It was. When the host clicks "Next round", the client resets its round state immediately: corpse positions cleared, NPC positions rebuilt to the start line, the seen-lanes set emptied. But a room snapshot from the round that just ended can still be in flight. When it arrived after the reset, the client applied its old `shotRacerIds`, re-froze those corpses at the freshly rebuilt *start positions*, and marked the lanes as already seen — so the new round's kill on the same lane rendered at the start line with no KO.

Two layered fixes. First, snapshots from a round older than the client's current round are rejected whole. Second, the death bookkeeping self-heals: when a lane the client thought was dead is no longer reported shot, its seen-flag and frozen position are forgotten, so the next kill re-captures fresh.

Lesson: in a distributed system, messages arrive from the past. Any state reset needs a version check on incoming data, or the past will overwrite the present.

### The Round That Froze On Go

Round 3 of 5: the countdown hit "go" and nothing happened, for anyone, forever. The host's client sends the `playing` action when the countdown completes, guarded by a fire-once flag so it does not spam the server. The flag was set *before* the request resolved — so when that one request failed (a network blip, a transient error), the flag stayed set, nothing ever retried, and since only the host may advance the phase, every client in the room was stranded on "go".

The fix is two lines: clear the flag when the request fails, and let the 100ms countdown ticker retry until the phase actually turns.

Lesson: a fire-once flag is a promise to eventually fire. Set it optimistically and a single failure turns "fire once" into "fire never" — clear it on failure, or set it only on success.

### The Match That Refused To End

Winning the final round showed the final scores for a heartbeat, then dumped the player back to the scoreboard. Two causes stacked. The server has no `gameOver` phase — it parks on `roundOver`/`scoreboard` — so the next heartbeat snapshot yanked the locally-final client right back into the round loop. And joiners never adopted the host's round count from the snapshot, so a guest in a 3-round match thought five rounds remained and never saw a final-scores action at all.

The fixes: the phase sync leaves a locally-completed match alone (a `gameOver` client ignores `roundOver`/`scoreboard` phases), and every client adopts `roundCount` from the room snapshot.

Lesson: purely client-side states need an explicit truce with server sync. If the server does not know a state exists, the sync code must be told not to stomp it.

### The Shot That Erased Your Lane Claim

The firing input sent only `playerName`, `movementMode`, `aim`, and `firing`. Server-side, `setPlayerInputState` replaces a player's whole input entry, so firing overwrote your `laneId` with null and your `progress` with 0. For the ~50ms until your next periodic input, the server had no idea which lane you controlled: a return shot into your lane in that window would have been attributed as an NPC kill, and a finish in that window could not be adjudicated for you.

The fix spreads the latest full snapshot into the firing input so the lane claim survives, with a regression test that inspects the actual request payload.

Lesson: when the server replaces state wholesale, every sender must send the whole truth. Partial updates against replace-semantics are silent data loss.

### Mouse Aim And Click-To-Kill

There were control bugs where the mouse felt offset, movement felt stuck, and clicking too broadly could kill. These are dangerous because a hidden-identity game needs players to trust the controls.

The fixes included:

- Calculating aim from playfield geometry.
- Matching the crosshair to the mouse more closely.
- Only eliminating a racer when the shot is near that racer.
- Adding regression tests for mouse movement and click behavior.

Lesson: input code deserves tests. When controls feel unfair, players blame the game even if the idea is good.

### Finish Line Problems

At one point, crossing the finish line did not feel reliable. Later, the finish marker itself looked angled and unclear.

The fixes were both mechanical and visual:

- Finish detection uses a clear progress threshold.
- The winner's final position is preserved.
- The finish line is now straight with a black-and-white checkered flag treatment.

Lesson: the win condition should feel obvious. A race game should not make players negotiate with the finish line.

### Sidebar Focus

During networking work, the side panel stayed visible during live rounds because it was useful for inspecting room code, roster, readiness, and sync status. Once the room flow was proven, that testing UI became clutter.

The fix was to hide the side panel during countdown and live play, then add a countdown overlay inside the playfield.

Lesson: debug-friendly UI and player-friendly UI are not always the same. Keep the debug value while you need it, then remove the training wheels from the stage.

## Tests: The Safety Net We Actually Used

This project has a useful spread of tests:

- UI tests for user-visible behavior.
- API wrapper tests for request shape and URL decisions.
- Pure state tests for room rules.
- Worker tests for backend behavior.
- Live browser smoke tests for deployment reality.

The live smoke tests caught things that unit tests could not:

- Production API routing.
- CORS.
- Actual two-browser join flow.
- Latest deployed Pages behavior.
- Live input sync from guest to host.

That is the lesson: different tests catch different lies.

Unit tests catch logic lies. Browser tests catch integration lies. Live deployment tests catch environment lies.

## Deployment Shape

The frontend is deployed to Cloudflare Pages. The room backend is deployed as a separate Cloudflare Worker.

Useful commands:

```bash
npm test
npm run lint
npm run build
npm run deploy:cloudflare
npm run deploy:rooms
```

The Pages deploy serves the static Vite build. The Worker deploy updates the Durable Object-backed room API.

When code changes only the frontend, deploy Pages. When code changes `workers/rooms.js`, deploy the Worker too.

## How The Pricing Works

Cloudflare bills this project on a handful of separate meters. Knowing which meter a feature touches is what turns "optimize the backend" from a vibe into a checklist.

- **Pages (the frontend).** Static hosting. At this scale it is effectively free: deploys and bandwidth for a small game are not a cost factor.
- **Worker and Durable Object requests.** Every HTTP room action is one billable request, on the order of $0.15 per million. Incoming Durable Object WebSocket messages are the special case: they bill at a 20:1 ratio, so 20 messages count as one request. Outgoing broadcasts, protocol pings, and `setWebSocketAutoResponse` replies are free — fan-out costs nothing.
- **Duration.** The dominant cost at scale: wall-clock time the Durable Object is active in memory, on the order of $12.50 per million GB-seconds. This is why hibernatable WebSockets matter — an idle room with open sockets costs zero duration — and why the input ticker stops itself after a second of quiet.
- **Storage.** Each persisted change bills write units (on the order of $1 per million; reads are cheaper), and setting an alarm counts as a write. The room lives in memory during play and only persists durable changes — lobby actions, phase changes, shots — never per input or per read.
- **Alarms.** Each alarm wake is a request plus a little duration. The cleanup alarm is the room's safety net, not a hot path.
- **Workers Logs.** Included volume, then per-million events. Automatic invocation logs are off because 20Hz input invocations would swamp the limits; the worker emits a handful of lifecycle events instead.

How each meter is handled, in one table:

| Meter | What would burn it | What the game does |
| --- | --- | --- |
| Requests | Fixed-rate 20Hz input from every client | Event-driven sends: immediate on mode/lane/firing changes, 400ms progress corrections otherwise, full rate only in the final stretch; aim never rides the periodic snapshot |
| Duration | Objects staying hot for idle rooms | WebSocket hibernation plus a self-stopping input ticker |
| Storage | Persisting per input or per read | Memory-first room; storage writes only for durable changes |
| Alarms | Polling-style wakeups | One cleanup alarm horizon (~46s) that also enforces the 30-minute idle TTL |
| Logs | Per-invocation logging at 20Hz | Lifecycle events only |

The prices above are order-of-magnitude from the Workers paid plan; check Cloudflare's current pricing page before relying on exact numbers. The ratios (20:1 messages, free egress, duration dominance) are the part worth remembering.

## What The WebSockets Actually Cost

An 8-player playtest showed ~60k worker hits, which looked alarming. It is not, once you know how Cloudflare counts:

- Analytics show raw message counts, but billing applies a 20:1 ratio to incoming Durable Object WebSocket messages. 60k raw messages bill as ~3k requests — about $0.0005.
- Outgoing broadcasts are free, so the 20Hz delta fan-out to every socket costs nothing.
- Protocol pings and `setWebSocketAutoResponse` replies are free.
- Duration, not requests, is the dominant Durable Object cost at scale. Hibernatable sockets and the self-stopping input ticker keep idle rooms at zero duration.

That playtest predates the event-driven input cadence. The same session today sends far less: a racer holding the run key changes nothing but progress, so they emit ~2.5 corrections per second instead of 20 snapshots — roughly an eighth of the mid-race message volume — and a player standing still moving their mouse sends nothing at all, because aim no longer rides the periodic snapshot.

Observability follows the same cost discipline: Workers Logs is enabled, but automatic invocation logs are off, because logging every 20Hz input invocation would produce ~576k log events per hour for one busy room. The worker instead emits a handful of structured lifecycle events — room created/destroyed, sockets opened/closed, ticker started/stopped, rounds adjudicated — which is what you actually query when something goes wrong.

Lesson: measure before optimizing, and know which meter you are reading. The scary number was a raw analytics count; the billable number was 20x smaller and the real cost lever (duration) was already handled.

The remaining leak was abandonment: an open tab heartbeats forever, keeping its room, alarms, and storage writes alive indefinitely. Two layers close it. The client disconnects itself after 20 minutes without any pointer or keyboard interaction, which stops the traffic at the source. The server is the guarantee: heartbeats keep a player connected but deliberately do not count as room activity, and a room with no meaningful action for 30 minutes is destroyed on its next heartbeat, read, socket message, or alarm.

Lesson: liveness and activity are different signals. A heartbeat proves the tab exists, not that anyone is playing. Timeouts should key off intent, and the server, not the client, must own the final cutoff.

The production app currently talks to:

- Pages frontend: the latest `death-race-online.pages.dev` deployment.
- Rooms Worker: `https://death-race-rooms.james-marotta.workers.dev`.

## What Is Still Prototype-Shaped

The game is real enough for friends to join and play, but it is not hardened like a competitive production game.

Important caveats:

- The client still renders and participates heavily in gameplay simulation, including all NPC simulation.
- Hidden assignments are deterministic and client-derived, which is fine for friendly testing but not secure against inspection.
- Human finishes are adjudicated server-side, but identity is still just a player name, so it is not hardened against impersonation or competitive cheating.
- No accounts or persistent player identity exist yet.
- Mobile and tablet controls are deferred.
- Defender integration is still waiting on actual Defender source files or a clear integration plan.

That is not a failure. It is an honest stage. The project is now past fake multiplayer and into real playtest territory.

## How Good Engineers Think Through This Project

### They Protect The Core Experience

The core experience is not "use WebSockets" or "deploy to Cloudflare." The core experience is hidden-identity racing with one shot.

Good engineering keeps asking: does this change make that experience clearer, fairer, faster, or easier to test?

### They Separate Design Truth From Work Logs

The docs have distinct jobs:

- `spec.md` says what the game is supposed to be.
- `todo.md` says what remains.
- `progress.md` says what happened.
- `WHY.md` explains why the project is shaped this way.

That split prevents stale plans from masquerading as current truth.

### They Replace Fake Features With Honest Features

Prototype buttons are useful while exploring. They become liabilities when they pretend to be product.

The lobby work improved when we stopped accepting "looks like a lobby" and demanded "a second browser can join this lobby by code."

### They Make Bugs Pay Rent

Every serious bug became a regression test:

- Missing rooms stay missing.
- Host-only start is enforced.
- CORS is covered.
- Production API fallback is covered.
- Mouse click shooting is covered.
- Side panel hiding is covered.
- Finish line rendering is covered.

A bug without a test is a story you might have to relive.

### They Verify Where The Risk Lives

For local logic, run unit tests.

For UI behavior, use React Testing Library.

For Cloudflare behavior, test the Worker and deploy it.

For "friends can join", open two browser sessions against the deployed URL.

That last one matters. The user's real requirement was not "the join function returns a room." It was "I can open another browser and join my lobby." We verified the requirement at that level.

## Lessons To Carry Forward

### Multiplayer Is Mostly State Discipline

The hard part is not opening a socket. The hard part is deciding who is allowed to change what, when, and how everyone else learns about it.

In Death Race:

- The room owns the roster.
- The room owns readiness.
- The host controls phase transitions.
- The room records shots and winners.
- Clients render and send input.

That boundary is what keeps the game understandable.

### The Backend Should Enforce The Rules

A disabled button is nice. A backend check is necessary.

The UI can hide `Start game` from guests, but the Worker still rejects non-host countdown requests. That is the right layering. Frontend constraints help honest users. Backend constraints protect the state.

### Deployment Is Part Of The Product

The game did not work for friends until the deployed Pages app, deployed Worker, CORS, production API base, and room flow all lined up.

"It works locally" is a useful checkpoint, not the finish line.

### UI Should Earn Its Space

The `Sync` label was useful while debugging. Then it became flicker. The sidebar was useful while proving multiplayer. Then it got in the way of the race.

Good UI changes as the product matures. First it exposes mechanics. Later it hides machinery.

### Small Modules Beat Grand Architecture

`roomState.js` is a good example of the right abstraction size. It is not a grand framework. It is just the shared room rules in one place.

That kind of module pays off quickly:

- Easy to test.
- Easy to import in the Worker.
- Easy to reason about.
- Harder for frontend and backend rules to drift apart.

### Write Tests For The Behavior You Fear Losing

The best regression tests here came directly from scary bugs:

- "Clicking anywhere gets a kill."
- "Room is still hardcoded."
- "Join lobby button does not work."
- "Host leaves but room still exists."
- "Production cannot reach Worker."
- "CORS blocks the browser."
- "The sidebar hides when play starts."

Those are not abstract correctness tests. They are memory aids. They say: this hurt once, do not let it hurt again.

## Future Pitfalls And How To Avoid Them

### Cheating And Hidden Information

Right now, hidden identity is presentation-level secrecy. For casual play, that is fine. For competitive play, move hidden assignments and authoritative simulation deeper into the backend.

Avoid future pain by deciding the trust model early:

- Friendly party game: current approach is acceptable.
- Competitive game: server authority and secret assignment handling become mandatory.

### Latency And Fairness

If players are far apart geographically, shots and movement can feel unfair. A future version may need server timestamps, reconciliation, or clearer rules around when a shot counts.

Do not solve this before real playtests demand it. But do not forget it exists.

### Room Cleanup

Disconnected players, abandoned tabs, sleeping laptops, and closed browsers are normal. Heartbeats and cleanup alarms are the first layer. Future work may need stronger reconnection behavior and clearer "rejoin as same player" flows.

### UI Overflow

The game targets up to 20 humans. The current sidebar and roster have been shaped for laptop play, but large real lobbies will still need careful scanning, grouping, and maybe compact states.

### State Explosion

As more features arrive, `App.jsx` can become too crowded. That is normal for a fast prototype, but not something to ignore forever.

Likely future extractions:

- Gameplay simulation helpers.
- Round transition hooks.
- Input synchronization hooks.
- Lobby panel components.
- Scoreboard components.

Extract when the behavior has settled enough that the new boundary is obvious.

## The Best Mental Model

Death Race is a party game with a race track, a room clipboard, and a radio.

The track is what players see.

The clipboard is the Durable Object holding the official room state.

The radio is the WebSocket telling everyone when the clipboard changes.

When the game feels good, players should forget the clipboard and radio exist. They should only feel the tension of twenty racers, one secret identity, one bullet, and a finish line that suddenly feels much too far away.

That is why the architecture matters. Not because Cloudflare is shiny. Not because WebSockets are exciting. Because the technology gets out of the way just enough for the suspicion to breathe.
