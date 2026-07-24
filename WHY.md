# Why Death Race Is Built This Way

Death Race looks like twenty tiny animals shuffling toward a finish line. Underneath, it is a lesson in trust: every browser wants a responsive game, but no browser is allowed to declare its own lane, speed, hit, score, or victory.

## The Current Architecture

Cloudflare Pages serves the React/Vite frontend. The browser draws the lobby and race, reads keyboard and mouse intent, plays local audio, and presents synchronized state.

Fly.io runs one Colyseus game server. Each lobby is a `DeathRaceRoom` with an ordinary fixed-rate clock and one authoritative version of the match. It owns:

- authenticated player identities and host permissions;
- secret human-to-lane assignments;
- movement, stamina, NPC behavior, shots, winners, and scores;
- countdowns, rounds, late spectators, reconnects, and disposal.

The browser sends intent: walk, sprint, aim, shoot, ready, continue. It never sends progress, lane ownership, hits, or points as facts. This is the difference between letting a player move a chess piece and letting them announce checkmate.

## Three Kinds Of State

Public state contains everything all players may draw: racers, anonymous crosshairs, shots, phase, round, roster, and scoreboard.

Private state travels only to the authenticated connection: that player's lane, crosshair ID, stamina, exhaustion, and elimination status.

Server-only state contains the relationships a curious browser must never inspect, especially the complete player-to-lane map and authorization tables.

Hiding a name in React is not privacy. If a secret reaches browser memory, a player can read it. Privacy starts with deciding not to serialize the secret.

## Why Colyseus And Fly.io

The first working multiplayer version used a Cloudflare Worker and one Durable Object per room. That was a clever prototype: room codes mapped naturally to isolated coordinators, and Pages plus Workers deployed quickly. It also pushed the game toward runtime-specific alarms, hibernation, storage semantics, fallback polling, and split simulation ownership.

A realtime game is easier to reason about when one long-lived process owns an ordinary clock. Colyseus supplies rooms, sessions, state synchronization, and reconnect machinery. Fly.io supplies a small process close to players. Cloudflare Pages remains excellent for static files, so there was no reason to migrate the frontend merely for architectural symmetry.

The production server uses one Sydney `shared-cpu-1x` machine with 256 MB RAM, no volume, and scale-to-zero. Rooms close when the host leaves, all players leave, or meaningful activity expires. Cost control is architecture here, not a billing-page afterthought.

## Messages Survive Bad Networks

Every command carries a protocol version, room ID, round ID, and increasing sequence number. The server rejects duplicates, old rounds, future rounds, and reordered commands. It advances racers from its own clock, so client timing and fabricated progress are irrelevant.

Unexpected disconnects receive a 45-second grace window and a rotating 256-bit token. Reconnect means restoring the same player and private state, not silently creating a replacement that happens to have the same display name.

Tests simulate latency, jitter, packet loss, duplication, and reordering with a deterministic delivery schedule. A deterministic hostile network teaches more than hoping CI happens to be slow.

## The Tests Tell A Match Story

Unit tests prove rules such as one bullet, host-only start, fair assignments, stamina lockout, independent NPC timers, and stale-message rejection. React tests prove the lobby, controls, feedback, audio lifecycle, and laptop layout contracts.

The public Fly smoke test proves composition. Two clients create and join a room, reconnect one identity, ready up, score a human hit, finish three rounds, reach ten points, enter game over, leave, and prove the room code is disposed. A connection-only smoke test can stay green while the finish line, scoring, or next-round flow is broken; the complete story cannot.

## Bugs Worth Remembering

**NPCs moved as a chorus.** Random choices are not independent if every NPC shares one timer. Each server NPC now owns seeded move and idle deadlines, so one pause cannot synchronize the pack.

**Music died after round one.** A stopped Web Audio oscillator cannot restart. The client owns one audio context but builds and destroys a fresh music graph for every playing phase. Lifecycle tests exercise start, stop, and start again.

**Overlapping controls stopped movement.** Translating every keyup into `stop` fails when Right Arrow and Space overlap. The client stores the held-key set and derives one movement intent from the complete state.

**A result track mounted empty.** High-frequency state stopped before the post-round component subscribed. The transport retains the latest projected view so phase-boundary screens receive the final snapshot immediately.

**A green smoke test hid `roundId: 1`.** The harness never advanced beyond the first round, so its hardcoded round escaped detection. Extending the test to a complete match forced the harness to obey the same protocol as production clients.

**Placeholder sound changed the feel.** Immediate gun audio is local, but hit flashes and shakes wait for the authoritative event. Intent can feel instant while consequences remain true.

## Juice Without New Lies

The finished juice pass follows one rule: an effect may be immediate only when it claims something the local browser already knows. Clicking can create muzzle flash, recoil, tracer, casing motion, and the gun crack immediately. A hit spark, victim shake, near-miss cue, score change, or winner celebration waits for a unique server event because those effects claim a consequence is true.

Countdown anticipation is synchronized from the server's deadline rather than a second client timer. All racers crouch together, tones rise through 3, 2, 1, and the Go launch treatment comes from the same timestamp. An expired countdown mounts silently instead of replaying old anticipation after a late tab resume.

Winner celebration is keyed by `winnerEventId`, a room/round/server-sequence identifier. The checkered burst, short finish punch, winner bounce, and crowd chord play once. Human names then reveal in sequence while score and kill deltas animate from the round's synchronized baseline. Reduced-motion users and late mounts skip directly to final state; the host's Next round button never waits for theatre.

Track atmosphere remains local and cheap. Authoritative movement mode chooses footsteps, dust cadence, and exhaustion breathing; authoritative progress increases music intensity in the final third. The client sends no new messages for any of it. Public movement effects stay identical for humans and NPCs, preserving hidden identity.

Layout is part of correctness. Every particle is absolutely positioned and every motion uses transforms or opacity, so the 1200px playfield and 720px laptop viewport do not gain scrollbars when the game becomes more expressive.

The visual pass also caught a Windows tooling bug: current Node rejected direct `npm.cmd` spawning with `EINVAL`. The combined local launcher now invokes the fixed `npm run dev` command through `cmd.exe` without enabling a general argument shell, and QA starts through `npm run dev:game` so the documented path is tested rather than bypassed.

The first browser countdown also showed “3” over an empty track. The full snapshot arrived before React mounted the race component, while ordinary metadata deliberately omitted racers. The active track now initializes from the transport's retained full view, and its regression reproduces the real full-view-then-metadata ordering rather than the easier test-only order.

The first result screenshot caught a visual regression too: finish-line flutter had added a separate checkered block above the straight line. The final version moves the checker pattern within the line itself, preserving atmosphere without reviving an element the design had already rejected.

Moving simulation authority to the server also quietly cost the landing page its charm. The old client ran the whole race locally, so it could paint a living playfield behind the menu; the authoritative client has no room state before a player joins, so the menu became a bare form. The fix was not to revert the migration but to add a client-only decorative preview: a looping crowd of racers that reuses the real racer markup, needs no server, and stays firmly on the presentation side of the authority boundary. A migration can strip a feature that was only ever incidental to the old architecture — restore it in a way that respects the new one.

The same menu also exposed a quieter class of bug: styling that only works by accident. The tab buttons had no background of their own, so they borrowed the browser's default light control, and the active tab's cream label promptly vanished against it. The fix was to stop relying on the default — give the buttons the dark theme explicitly — and then the selected state has somewhere legible to live. While there, the host-only options now stay mounted and merely disable when joining, because mounting and unmounting a block to switch tabs makes the whole form jump; disabling keeps the layout still.

Two runtime-feel bugs told the same story from the other direction: a default that happened to work until it didn't. The crosshair had one smoothing transition applied to every crosshair, which is right for remote players whose aim arrives at the throttled network cadence but wrong for your own hand — a 50ms lag on your own cursor reads as jank. Split the two cases: the local crosshair tracks the pointer directly, remote ones keep the glide. The audio had a similar accidental balance: shots were mixed at ten to fifty times the level of the music and footsteps, so the loud thing worked and everything else was inaudible, and the context was never explicitly resumed when music began. Raising the quiet voices and resuming on start fixed both halves of "really quiet or not working." The lesson repeats: when one path is loud enough or fast enough to seem fine, check whether the quiet, slow paths were ever actually working.

Adding a volume slider then forced the graph to grow up. Sounds had each been wired straight to the destination, which is fine until you want one knob to move all of them at once — including a pad that is already sounding. The fix was a single master output gain that every voice connects through, so the slider moves live and the sustained chords dip with it. The one constraint was a test that pinned the music-intensity gain to the first `createGain` call, so the master node is created second, on first connect, rather than eagerly — the architecture improved without rewriting what the test was really protecting. Music also now spans the landing page, lobby, countdown, and play from one continuous source, because starting and stopping it at phase boundaries is both audible and wasteful. Extending it to the landing page cost almost nothing once the master bus existed: add the menu to the set of phases that play music and reuse the same controls component, so there was one place to change rather than a second copy to keep in sync.

## How Good Engineers Approach This

1. Write down the product invariant before choosing the implementation. Hidden identity means player-to-lane mappings must never enter public state.
2. Put authority where cheating or disagreement matters. The UI may disable Start, but the room still rejects a guest who sends the command manually.
3. Test the bug's mechanism, not its screenshot. Independent timers need per-NPC deadline assertions; audio needs a second-round lifecycle test.
4. Preserve a working boundary during migration. The old game stayed deployable while Colyseus grew behind a preview build.
5. Name the rollback artifact before cutover. The pre-cutover frontend remains at `https://40288567.death-race-online.pages.dev`.
6. Delete obsolete paths only after production proof. Two implementations that accidentally satisfy different tests are more dangerous than one clear source of truth.
7. Keep documentation beside the change. `spec.md` says what the game should be, `progress.md` says what happened, `todo.md` says what remains, and `why.html` explains what each step taught us.

## Where To Read Next

- `server/DeathRaceRoom.js`: authoritative room lifecycle and command handling.
- `server/simulation.js`: player movement, stamina, finish adjudication, and secret assignments.
- `server/npcSimulation.js`: independent seeded crowd behavior.
- `server/remoteSmoke.js`: the full hosted match proof.
- `src/multiplayer/protocol.js`: message validation and ordering contract.
- `src/multiplayer/colyseusTransport.js`: browser connection, reconnect, and public/private projection.
- `src/ColyseusApp.jsx`: active React lobby, race, results, input, and feedback.
- `why.html`: the interactive, chronological guide with demos and migration field notes.

The architecture matters because it makes the rules feel inevitable and then gets out of the way. Players should be thinking, “which animal is James?”, not “which machine owns the truth?”
