# Death Race Todo

This file tracks remaining implementation work only. Design decisions live in `spec.md`; completed work lives in `progress.md`.

## Delivery Estimate

The remaining Fly.io and Colyseus migration is estimated at **1-2 agent-hours** for post-cutover proof and obsolete realtime cleanup. Tasks 01-11 and the production routing portion of Task 12 are complete.

The first complete migration should therefore be treated as roughly **4-7 focused agent working days**, including time for at least one failed deployment or integration pass. This assumes agents are writing the code and a human is available only for Fly.io account access, billing limits, secrets, and final live acceptance testing.

Juice work is estimated separately at **10-18 agent-hours**. The remaining independent NPC timing work is estimated at **4-7 agent-hours**, or less if it is implemented directly in the new authoritative Colyseus simulation instead of being fixed twice.

## Migration To Fly.io And Colyseus

### Task 12: Cut Over And Remove Cloudflare Realtime

Estimate: **2-4 agent-hours**.

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
