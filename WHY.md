# Why Death Race Works

Death Race is a small browser game about suspicion. The trick is not raw speed; it is trying to move like a believable nobody while reading which tiny pixel person is actually another human. Every round fills a 20-racer track, hides the human assignments, gives each human one shot, and lets the mess resolve only when a racer reaches the finish.

## What We Built

The project is now a local single-browser MVP. It has a lobby, public/private setting, round-count controls, 20 visible racers, hidden human assignments, NPC fillers, countdown, keyboard movement, mouse aiming, one-shot firing, eliminations, dead bodies, spectators, winner reveal, scoreboard, round history, and final match state.

The first important decision was restraint. We did not start with accounts, servers, persistence, WebSockets, matchmaking, mobile controls, or deployment. Those are useful later, but they would have made the first playable loop harder to feel. Good game engineering often starts by protecting the toy at the center. Here, the toy is: “Can I tell which racer is you?”

## The Architecture

The app is a React + Vite project. React owns the shell, state, lobby, controls, scoreboard, and the current rendered playfield.

The main runtime files are:

- `src/main.jsx`: boots React into the page.
- `src/App.jsx`: owns the game state and renders the full MVP.
- `src/App.css`: owns the game layout, track, pixel racers, crosshairs, bodies, reveal highlights, and panels.
- `src/index.css`: owns the base theme variables and document reset.
- `spec.md`: the design source of truth.
- `todo.md`: what remains, now mostly guardrails and future parking-lot work.
- `progress.md`: the build log and verification history.
- `README.md`: commands and manual QA.

The state is intentionally local and in-memory. That means a refresh resets the game, which is fine for this MVP. It also means the game can be understood without chasing server calls or storage layers. When networking arrives later, the important lesson is to replace the transport, not the game idea.

## The Game Loop

The loop is:

1. The lobby picks a round count and starts.
2. The round fills exactly 20 racers.
3. Humans are secretly assigned to specific lanes.
4. The countdown blocks movement and shooting until `go`.
5. The player moves with `Space` and `Left Shift`.
6. NPCs walk, pause, and sometimes run.
7. Mouse movement aims; Mouse 1 fires once.
8. Shot racers stay down.
9. The round ends only when a living racer reaches the finish.
10. Human-controlled racers are revealed.
11. Scoreboard awards 1 point for a human winner and 0 for an NPC.
12. The host starts the next round or reaches final scores.

That shape matters because it keeps the social tension intact. If the round ended when someone was shot, players would optimize around shooting. Instead, a shot is a dramatic interruption inside a race that still continues.

## Why These Technical Choices

Vite is fast and plain. React is familiar and good at stateful UI. JavaScript modules are enough for this stage. Oxlint gives a quick guardrail against common mistakes.

The playfield is DOM/CSS rather than canvas right now. Earlier planning allowed canvas, but as the UI grew, the MVP became a state-heavy prototype with panels, controls, labels, scoreboard, and simple pixel racers. CSS gets us to a readable prototype quickly. A future canvas renderer can still replace the track if animation or performance needs grow.

The constants are intentionally close to the game code: speed, tick rate, finish threshold, assignments, NPC patterns, and colors. In an early game, tuning is learning. Hiding these values behind a clever abstraction too early would make the game harder to adjust.

## Bugs And Fixes

One important bug appeared during shooting work: the aim state tried to initialize from `controlledRacerId` before that value existed. The fix was simple but instructive: define the derived constant before any state initializer that uses it. React state initializers run during render, so order matters.

Another issue came from winner detection. Oxlint warned that a hook depended on `getLiveProgress`, but the function was being recreated each render. The fix was to wrap it in `useCallback` with explicit dependencies. That made the winner detection effect honest about what it reads.

A subtler UI bug showed up in shooting: using the previous aim state during a click could fire at the last mouse position instead of the clicked lane. The fix was to calculate aim directly from the click event and use that exact result for the shot.

The asset cleanup also mattered. Starter Vite/React assets were removed so the project no longer visually or structurally felt like a template. That kind of cleanup is not vanity; it reduces confusion about what belongs to the product.

## Pitfalls To Avoid Later

Do not add networking before the local state shape is stable. Multiplayer will multiply every unclear decision.

Do not attach player names to racers during live play. That would break the core hidden-identity design.

Do not let NPCs shoot unless the design changes deliberately. The current MVP uses NPCs as movement camouflage, not active attackers.

Do not make running a stamina system by accident. The design says running is risky because people can read it, not because a meter punishes it.

Do not overwrite Defender code. No Defender source was found here, and integration is intentionally waiting for the user to identify or provide it.

## How Good Engineers Worked Here

The work moved in small commits. Each task changed one behavior surface, ran lint/build, updated progress, and pushed. That makes the history readable and reversible.

The docs stayed split by purpose. `spec.md` explains the design. `progress.md` explains what happened. `todo.md` explains what remains. When those files blur together, teams start arguing with stale notes.

The implementation followed the playable loop first. A finished small loop teaches more than a perfect architecture around an untested idea. In game terms, we built the steering wheel before designing the parking garage.

## What Comes Next

The parking lot is still real future work: accounts, persistent scores, mobile/tablet controls, sound, richer art, backend, real-time multiplayer, and deployment. Those should come after more playtesting of the current loop.

The next engineering step should probably be extracting game state helpers from `App.jsx` once the behavior stops changing every task. Right now, keeping it together made iteration fast. Later, separating state transitions, racer simulation, and UI panels will make multiplayer easier.

The next design step is to play it and watch what feels unfair. Hidden-identity games live or die on tells: how readable movement is, how tempting running feels, how often NPCs accidentally look human, and whether one bullet creates drama without ending the fun too early.

That is the heart of Death Race: not the track, not the bullets, but the moment where someone moves just a little too confidently and everyone starts wondering.
