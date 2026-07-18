# NPC Logic Notes

Last updated: 2026-07-18

This note explains how NPC movement currently works, why the visible bug still exists, and what the next implementation should do.

## What The NPCs Should Feel Like

NPCs should look like uncertain human players. Each NPC should have its own private rhythm:

- idle for its own random duration
- walk for its own random duration
- sometimes run for its own random duration
- sometimes pause for a longer suspicious duration
- decide its next action independently from the other NPCs

The important part is not just random speed. The important part is independent timing. If every NPC receives a new decision from the same global clock, players can still see the pattern even when the numbers are different.

## Current Code Path

The current NPC logic lives in two places:

- `src/npcBehavior.js`
- `src/App.jsx`

`src/npcBehavior.js` builds a deterministic profile for each NPC:

- `cycleTicks`
- `cycleOffsetTicks`
- `longCycleTicks`
- `longCycleOffsetTicks`
- `shortCycleTicks`
- `shortCycleOffsetTicks`
- `moveCadenceTicks`
- `movePhaseTicks`
- `speedJitter`
- bob animation timings

`getNpcStep(racer, tick, seedParts)` then uses a shared `tick` number to decide whether that NPC is currently in `idle`, `stop`, `walk`, or `run`.

In `src/App.jsx`, there is still one shared interval:

```js
const intervalId = window.setInterval(() => {
  setNpcTick(current => {
    const nextTick = current + 1
    setNpcProgressByLane(...)
    return nextTick
  })
}, TICK_MS)
```

Inside that one interval, every NPC is evaluated together. The latest change added `moveCadenceTicks` and `movePhaseTicks`, so not every NPC advances every tick. But the whole pack still wakes up from the same shared loop every `TICK_MS`.

That is the core bug.

## Why The Last Attempts Did Not Fix It

### Commit `bced46b`: Enlarge racers and tuck finish line behind them

This did not change NPC decision logic. It only changed visuals:

- racer size
- finish line layering
- playfield height tests

It has no bearing on the synchronized NPC movement bug.

### Commit `519de5b`: Stabilize audio sessions and NPC timing

This created `src/npcBehavior.js` and moved NPC step selection into a helper. It added per-NPC seeded values such as cycle lengths and offsets.

That was an improvement, but it still used a shared input: `npcTick`.

The shape became:

```txt
one global clock -> every NPC asks "what should I do at this tick?"
```

That can create variation on paper, but it does not create truly independent behavior. The visible result can still be:

```txt
pack moves -> pack pauses -> pack moves again
```

because every NPC is still being reconsidered by the same global metronome.

### Commit `275f908`: Add gameplay music and stagger NPC motion

This added two NPC-facing changes:

- per-NPC movement cadence and phase
- bob animation for every live NPC

The cadence change means some NPCs only update progress every 1, 2, 3, or 4 global ticks. The code then multiplies movement by cadence so they do not fall too far behind.

That still does not create a private timer for each NPC. It only skips some shared ticks.

The bobbing change made idle NPCs less visually frozen, but it did not solve synchronized decisions. Bobbing is animation; it is not behavior.

## The Actual Fix

The next implementation should replace `npcTick`-driven decision making with per-NPC behavior state.

Each NPC should carry state like this:

```js
{
  mode: 'idle' | 'walk' | 'run' | 'stop',
  modeEndsAt: 123456.78,
  lastUpdatedAt: 123000.12,
  speedMultiplier: 0.93,
  nextLongPauseChanceAt: 124200.00
}
```

Then each NPC decides independently:

```txt
for each NPC:
  elapsed = now - npc.lastUpdatedAt
  if now >= npc.modeEndsAt:
    choose that NPC's next mode
    choose that NPC's next duration
  if mode moves:
    progress += speed * elapsed
  npc.lastUpdatedAt = now
```

The app can still use one `requestAnimationFrame` loop to update React state. That is normal and efficient. The key is that the loop should not mean one shared behavior clock. The loop only asks each NPC, "given your own timer, what do you do now?"

## Recommended Durations

Good starting values:

- idle: `350ms` to `2200ms`
- walk: `500ms` to `3500ms`
- run: `250ms` to `1400ms`
- long stop: `1600ms` to `5200ms`

Suggested probabilities when choosing the next mode:

- from `idle`: 65% walk, 20% stop, 10% run, 5% long stop
- from `walk`: 45% walk, 25% idle, 15% stop, 15% run
- from `run`: 45% walk, 35% idle, 20% stop
- from `stop`: 60% walk, 25% idle, 10% run, 5% long stop

Add seeded personality per NPC:

- `hesitationBias`
- `runBias`
- `speedJitter`
- `longPauseBias`

This makes some NPCs naturally cautious and others twitchier, without making them all coordinate.

## Implementation Shape

Recommended state:

```js
const [npcStatesByLane, setNpcStatesByLane] = useState(() =>
  createNpcStates(roundRacers, performance.now())
)
```

Replace:

```js
const [npcTick, setNpcTick] = useState(0)
```

with state that stores each NPC's own timers.

Recommended loop:

```js
useEffect(() => {
  if (state !== 'playing') {
    return undefined
  }

  let frameId = 0

  const update = now => {
    setNpcStatesByLane(current =>
      updateNpcStates(current, roundRacers, now, npcSeedParts)
    )
    frameId = requestAnimationFrame(update)
  }

  frameId = requestAnimationFrame(update)
  return () => cancelAnimationFrame(frameId)
}, [state, roundRacers, npcSeedParts])
```

Important: `updateNpcStates` should return one updated object that includes both `progress` and `mode`. The render should read the NPC mode from that object, not recalculate it from a global `npcTick`.

## What Tests Should Prove

The current tests were too weak because they checked that staggered values existed, not that NPCs behaved independently over time.

Better regression tests:

- Given 10 NPCs at the same `now`, their `modeEndsAt` values are not all equal.
- After advancing time by `500ms`, only some NPCs change mode.
- After advancing time by `1500ms`, a different subset changes mode.
- Two NPCs can be in the same mode but have different remaining durations.
- A stopped NPC still has a bob animation class.
- There is no single `npcTick` controlling all NPC decisions.

The most important test is conceptual:

```txt
Changing one NPC's timer should not change when another NPC makes its next decision.
```

That is the behavior we do not have yet.
