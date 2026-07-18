# Death Race Todo

This file tracks remaining implementation work only. Design decisions live in `spec.md`; completed work lives in `progress.md`.

## Delivery Estimate

The remaining Fly.io and Colyseus migration is estimated at **26-45 agent-hours** including writing failing tests first, implementation, passing regression tests, deployment, and live multiplayer verification. Protocol, scaffold, authenticated sessions, lobby parity, and authoritative movement Tasks 01-05 are complete. With carefully divided agents, expect roughly **16-29 hours of elapsed work** because simulation, integration, deployment, and browser-to-browser testing cannot all be parallelized safely.

The first complete migration should therefore be treated as roughly **4-7 focused agent working days**, including time for at least one failed deployment or integration pass. This assumes agents are writing the code and a human is available only for Fly.io account access, billing limits, secrets, and final live acceptance testing.

Juice work is estimated separately at **10-18 agent-hours**. The remaining independent NPC timing work is estimated at **4-7 agent-hours**, or less if it is implemented directly in the new authoritative Colyseus simulation instead of being fixed twice.

## Migration To Fly.io And Colyseus

### Task 06: Make Shooting Server Authoritative

Estimate: **4-7 agent-hours**.

- Send shot intent with aim coordinates, round ID, and sequence number; do not send a claimed victim.
- Resolve hit geometry against the server's authoritative racer positions.
- Enforce one bullet, legal round phase, valid aim bounds, corpse protection, self-shot rules, and score attribution on the server.
- Broadcast a canonical shot result containing shooter, victim lane, victim type, impact position, score change, and event ID.
- Keep optimistic muzzle feedback local, but wait for the server result before applying death, score, or winner state.
- Write failing tests for fabricated hits, duplicate shots, stale-round shots, NPC kills, human kills, self-kills, corpse shots, and simultaneous shots.

### Task 07: Move NPC Simulation And Winners To The Server

Estimate: **5-8 agent-hours**.

- Implement independent per-NPC behavior state with its own mode, mode deadline, last update time, speed variation, run bias, and pause bias.
- Remove the shared `npcTick` behavior clock described in `npc_logic.md`.
- Run NPC movement in the same authoritative fixed-step simulation as humans.
- Keep seeded personalities for repeatable tests while choosing independent action durations.
- Let the server adjudicate NPC finishes so the host is no longer trusted to report an NPC winner.
- Write failing tests proving one NPC's timer cannot change another NPC's decision time, NPCs do not move in a visible shared rhythm, and NPCs can cross the finish.

### Task 08: Add Reconnection And Ordering

Estimate: **3-5 agent-hours**.

- Add exponential reconnect with jitter and a sensible retry cap.
- Resume the existing authenticated player session after a temporary disconnect.
- Include round IDs and monotonically increasing sequence numbers in input and event processing.
- Ignore duplicate, out-of-order, and stale-round messages.
- Send a complete authoritative snapshot after resume, followed by normal deltas.
- Define grace periods for temporary disconnects and deterministic behavior when the host does not return.
- Write failing tests for dropped sockets, duplicate packets, reordered packets, reconnect during countdown, reconnect during play, and reconnect after elimination.

### Task 09: Add A Client Transport Adapter

Estimate: **4-7 agent-hours**.

- Put Colyseus behind a small client adapter so React does not directly own socket lifecycle or protocol parsing.
- Expose stable operations and subscriptions for lobby actions, local input, shot intent, snapshots, events, reconnect state, and room closure.
- Keep the current Cloudflare adapter temporarily available behind a development flag for comparison and rollback.
- Remove HTTP polling from the Colyseus path.
- Ensure network updates do not force the entire React application to rerender at server tick frequency.
- Add local-racer prediction, remote-racer interpolation, and smooth correction toward authoritative positions without ordinary-latency teleporting.
- Write adapter tests with a fake transport plus React integration tests for lobby, countdown, movement, shooting, round over, and next round.

### Task 10: Deploy The Game Server To Fly.io

Estimate: **3-5 agent-hours**.

- Add a production Dockerfile, health endpoint, Fly configuration, region choice, memory limit, restart policy, and graceful shutdown handling.
- Configure TLS WebSocket access and the frontend server URL through environment configuration.
- Set explicit Fly.io spending limits and alerts before live traffic is enabled.
- Decide whether to keep one small machine running or accept cold starts. Active matches must never be stopped automatically.
- Keep Cloudflare Pages for the static frontend unless a separate decision changes frontend hosting.
- Add deployment smoke tests for health, room creation, two-client joining, reconnect, and room disposal.
- Expect and budget for at least one failed configuration or deployment iteration.

### Task 11: Multiplayer Regression And Network Simulation

Estimate: **5-8 agent-hours**.

- Add an automated multi-client harness that can create a lobby, join several players, ready everyone, race, shoot, finish, advance rounds, and disconnect.
- Run tests with simulated latency, jitter, duplication, packet loss, and reordered messages.
- Verify that hidden lane assignments never leak through synchronized public state, logs, errors, or browser storage.
- Verify CPU and memory behavior with multiple simultaneous 20-player rooms.
- Confirm cleanup leaves no active room timers or retained player sessions after disposal.
- Run the complete frontend, server, protocol, simulation, lint, and build suites.

### Task 12: Cut Over And Remove Cloudflare Realtime

Estimate: **2-4 agent-hours**.

- Deploy the Colyseus path behind a temporary feature flag and test it with real browsers on separate networks.
- Keep rollback available until one complete multi-round game succeeds without polling or Worker room traffic.
- Point production at Fly.io only after live acceptance passes.
- Remove the Durable Object room binding, Worker deployment scripts, fallback polling, and obsolete Cloudflare-specific tests.
- Keep Cloudflare Pages deployment for the frontend.
- Update `README.md`, `spec.md`, `progress.md`, `WHY.md`, architecture diagrams, environment examples, and deployment instructions.
- Run all tests again after removing the old path; do not count migration tests as complete while both implementations accidentally satisfy them.

## More Juice

### Juice 01: Race Start Anticipation

Estimate: **2-3 agent-hours**.

- Add escalating countdown tones, racer squash/crouch poses, a small camera push, and a shared dust release on Go.
- Drive timing from the authoritative countdown timestamp so every client sees the same sequence.
- Apply the same anticipation animation to humans and NPCs.
- Add reduced-motion behavior and tests for countdown timing, cleanup, and replay on later rounds.

### Juice 02: Shooting Feedback

Estimate: **2-4 agent-hours**.

- Add immediate local muzzle flash, crosshair recoil, pixel tracer, and casing spark.
- Add a near-miss sound without highlighting or revealing the intended target before firing.
- Reconcile optimistic firing feedback with the canonical server shot result.
- Ensure duplicate or corrected network events cannot replay gunshots, KO effects, or score animations.
- Add reduced-motion handling and event-deduplication tests.

### Juice 03: Finish And Winner Celebration

Estimate: **2-4 agent-hours**.

- Add a short finish hit-stop, checkered particle burst, winner bounce, crowd swell, and restrained camera punch.
- Keep the finish line and other racers readable during the effect.
- Trigger the celebration once from a unique authoritative winner event ID.
- Add tests for human wins, NPC wins, simultaneous finish reports, later rounds, sound mute, and reduced motion.

### Juice 04: Round Reveal And Score Movement

Estimate: **2-3 agent-hours**.

- Reveal human-controlled racers in a short sequence after the winner is locked.
- Animate earned points and kills into their scoreboard rows.
- Keep the Next round action immediately visible on laptop screens throughout the sequence.
- Allow the animation to complete instantly under reduced motion or when the tab resumes late.
- Add tests that final scores remain server state rather than animation state.

### Juice 05: Movement And Track Atmosphere

Estimate: **2-4 agent-hours**.

- Add subtle lane motion, finish-line flutter, varied dust, footsteps, sprint texture, and exhausted breathing.
- Ensure visible effects are determined by authoritative movement mode and appear equally on humans and NPCs.
- Add intensity layers to gameplay music during the final third of the race.
- Keep effects client-only so they add no game-server traffic.
- Check laptop performance, mute behavior, reduced motion, and cleanup between rounds.

## Remaining NPC Work If Migration Is Delayed

Estimate: **4-7 agent-hours**.

- Replace the shared `npcTick` and global interval behavior with per-NPC timers in the current client implementation.
- Give each NPC independent current mode, mode deadline, last update time, speed jitter, pause bias, and run bias.
- Use one render loop if helpful, but advance each NPC according to its own state and deadline.
- Write failing independence tests before implementation, including a test that changing one NPC's timer cannot affect another NPC's next decision.
- Treat this as temporary work. Prefer implementing it once in the authoritative Colyseus simulation if migration starts immediately.
- See `npc_logic.md` for the existing diagnosis and implementation guidance.
