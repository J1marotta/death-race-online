# Death Race Spec

Death Race is a browser-playable hidden-identity racing/shooting game. A lobby has up to 20 human players, with NPC racers filling empty slots so every round always has 20 racers. Each human secretly controls one racer, tries to infer which racer they are, reads other players' behavior, and uses a single bullet to eliminate suspected opponents.

## Design Goals

- Fast, readable, replayable rounds.
- Social tension from hidden identity and movement tells.
- Chaotic but fair shooting: one bullet per human player per round.
- A clean one-action next-round loop from the scoreboard.
- A polished laptop presentation at `1200px` wide.
- Preserve existing Defender code; do not overwrite, delete, or casually refactor it.

## Lobby And Match

- Players join through a shareable room code/link.
- Room codes are dashless single words (for example `DR7Q2K`) so they read cleanly and are easy to type or say out loud.
- The title screen leads with a highlighted "Join a game" card (room code field plus join action) above the "Host a game" card, because guests are the common case.
- The menu side panel fits inside its card without scrolling: no intro paragraph (the cards explain themselves) and compact card spacing.
- Laptop-height space is a primary constraint: core menu and lobby actions must remain visible without scrolling, and growing content such as a full player roster should scroll only within its own bounded region.
- Lobby control labels use sentence case, not uppercase.
- Every connected player adopts the host's round count from the room snapshot so match completion agrees on every client.
- The host enters their display name, creates a lobby, and receives the room code to share.
- Joining players enter the room code and their display name.
- Connected players can edit their own display name from the real-players roster before the round starts.
- Lobbies can be public or private.
- The host chooses the number of rounds.
- Every connected player, including the host, must ready up before the game can start.
- Only the host can start the game.
- Connected players see the same lobby, countdown, round, and scoreboard state.
- Create-lobby actions show a loading state so the user can tell the backend request is in flight.
- Room updates use a direct Colyseus WebSocket connection to the authoritative Fly.io server.
- Once a room exists, the room code, connection count, ready count, and match summary live in the top bar.
- The lobby side panel focuses on the editable real-players roster, ready/start actions, and compact host settings so the flow fits without scrolling.
- The room side panel is visible for menu, lobby, and result/scoreboard states, then hides during countdown and live play so the playfield is the focus.
- Transport sync state is internal recovery information and should not flicker as a visible UI status.
- Rooms are destroyed when the host leaves or when every client stops heartbeating.
- Rooms left idle are destroyed: heartbeats keep a player connected but do not count as activity, and a room with no meaningful action for 30 minutes is closed. Clients disconnect themselves after 20 minutes without any pointer or keyboard interaction so abandoned tabs stop generating traffic.
- Remaining clients see a closed-room state with a return-to-menu action when the host leaves or the room expires.
- Late joiners spectate until the next round.
- Player names are visible in the lobby and scoreboard.
- Player names are not attached to racers during live gameplay.
- A multi-round scoreboard is shown after each round.
- Human round winners get 3 points.
- Killing another human player's racer earns the shooter 1 point; NPC kills, corpse shots, and self-shots earn nothing.
- The scoreboard shows each player's kill count beside their score.
- NPC wins award no winner points and trigger the shame/reveal moment.
- From the scoreboard, the host can instantly start the next round.

## Round Flow

1. Fill the race with exactly 20 racers, using NPCs for empty human slots.
2. Secretly assign each active room player to one racer via a seeded Fisher-Yates shuffle over all 20 lanes (seeded by room code, round, and roster; drawn from the generator's high bits so assignments are fair), reshuffled every round.
3. Start a `3, 2, 1, go` countdown.
4. The host-owned room state advances from countdown to live play, and all clients follow that shared phase. If the host's playing request fails, the countdown ticker retries until the phase turns, so a round can never freeze on go.
5. Players move, aim, infer identities, and may fire their one shot.
6. Shot racers are recorded in shared room state, eliminated for every client, and remain visible as bodies.
7. Eliminated players spectate.
8. If every human racer is eliminated while more rounds remain, the rest of the race fast-forwards.
9. The round continues until a racer wins.
10. The room backend adjudicates human finish-line wins from live input; the host records NPC winners in shared room state. The first recorded winner for a round stands.
11. Reveal/highlight all human-controlled racers after the winner is declared.
12. If an NPC wins, show a shame/reveal moment.
13. The scoreboard shows immediately alongside the winner reveal — no extra host click. The host's only action is starting the next round, or showing final scores after the last round.
14. Late snapshots from a finished round are rejected client-side so they cannot resurrect old shot state or pull a finished match out of the final-scores screen.

## Player Controls

- `Right Arrow`: walk.
- `Space`: sprint.
- No movement key pressed: stop.
- Mouse: aim.
- Mouse 1: fire.

Sprinting is a budgeted burst, not a held key:

- The stamina tank holds 2 seconds of sprint. Holding `Space` drains it; at empty the racer drops to walking speed even with `Space` still held.
- Emptying the tank is a hard lockout: sprint stays unavailable until the bar refills to 100%. If `Space` is still held when it tops up, sprinting resumes automatically.
- Refill starts only after 1 second without sprinting and takes 3 seconds from empty, so sprint uptime is roughly 40% when held greedily.
- Partial drains never lock out: release `Space` above empty and you can sprint again immediately.
- Stamina resets to full at the start of every round. NPCs keep their own separate burst-cap pacing (see NPC Behavior).
- Beyond the meter, the risk stays behavioral: sprinting makes intent easier to read and may draw shots.

The stamina meter rides directly above the `Space` key in the control bar. Its fill hue tracks the tank (green → amber → red), bottoming out jolts the key with a shake and a red flash then pulses the returning fill while locked out, and reaching full fires a bright ready pop. On the track, the controlled racer kicks up dust puffs and speed lines while sprinting, and shows a sweat drip with a slumped, desaturated trudge while exhausted.

The bar below the playfield renders the controls as physical-looking `<kbd>` buttons: they highlight and visually depress while the real key is held, the mouse element's left button lights up on fire and greys out once the bullet is spent (with the bullet pip removed), and the whole bar dims whenever the player cannot act (countdown, eliminated, or outside live play). The buttons are indicators only — they are not clickable.

Movement keys never hijack typing: while an input field has focus they are ignored entirely, and default browser behavior (spaces in name fields) is preserved.

## Shooting And Aiming

- Each human player gets exactly one bullet per round.
- Players can shoot any racer/lane, including themselves.
- Shooting eliminates the target.
- NPCs never shoot in the MVP.
- All loaded human players have visible crosshairs.
- Crosshairs are visible to everyone and color-coded by player.
- Before firing, show a small pixel bullet attached to the crosshair.
- Dim a player's crosshair to 50% opacity and turn it grey after they fire.
- Every shot is attributed: the room records who shot which lane and whether the victim was a human or an NPC, resolved server-side from live inputs.
- Kill attribution is visible without exposing the shooter's lane: killer names appear on the KO marker, the corpse tag, and the kill feed, preserving the hidden-identity mechanic.

## Juice And Feedback

- Firing plays a punchy gunshot: a filtered noise crack layered over a low bass thump.
- When a kill lands, a `KO! ← killer` marker bounces in the victim's lane for about a second, visible to every client.
- The victim's own screen takes a big shake with a red flash; the shooter's screen takes a short, subtle shake with a white flash. Other players see only the lane KO.
- The victim's sprite flashes briefly when the hit lands.
- A kill feed in the playfield corner shows `killer ▸ victim` entries that fade after a few seconds; human victims are named, NPC victims show as `NPC <lane>`.
- All shake and bounce animations are disabled under `prefers-reduced-motion`.

## Elimination And Winning

- If a player's assigned racer is shot, that player is out for the round.
- Eliminated players keep watching as spectators.
- Dead bodies remain visible on the track, frozen at the position where the shot landed, with a `down · killer` tag once the killer is known.
- The round ends only when a racer wins.
- NPCs can win.
- If an NPC wins, everyone gets shamed and all human-controlled racers are revealed.

## NPC Behavior

- NPCs fill all unused racer slots.
- NPCs are the crowd, not the competition: they walk, dart, and — about 40% of the time — loiter (full stops plus slow idle shuffles), because this is a hiding game and a human standing still must look at home in the pack. All NPC speeds are scaled to 60% of player speeds; the pack averages ~2.2 progress/s (~38% of a committed, stamina-managed player's ~5.8), finishing around 42 seconds against the player's ~16.
- NPCs hold at the start line for about 1.5 seconds after go (plus a small seeded per-NPC stagger) before moving — a crowd reacts, it doesn't launch.
- No NPC sprints longer than ~160ms at a time: every sprint demand passes through a seeded duty cycle that downgrades the rest of its window to a walk, so sprints read as darts, not races.
- A committed human comfortably outruns the pack, but NPCs still finish and can win a round when every human stalls.
- Each NPC has a seeded pacing personality (burst-heavy or walk-heavy mixes) so the pack does not race identically.
- Each NPC needs its own independent behavior timer for idle, walk, run, stop, and long-stop phases.
- NPCs must not share a visible pack-level rhythm where all NPCs move, pause, and move again together.
- NPC running and stopping should feel erratic enough that NPCs do not look like they are all perfectly racing to win.
- NPCs should imitate human hesitation and intent.
- NPCs never shoot.
- NPCs must be capable of crossing the visible finish line and winning.

## Visual Direction

- Pixel-art style.
- Racers are cute pixel animals: 8 species (cat, bunny, bear, fox, frog, pig, chick, mouse) are reused across the 20 lanes.
- 5 pastel fur palettes (Peach, Sky, Mint, Honey, Berry) color the species; palettes are cosmetic and shared by humans and NPCs alike.
- Species features (ears, tails, snouts, beaks) are CSS pseudo-elements hanging off the same base sprite, so every variant keeps the same hitbox even when silhouettes differ.
- Starting lane positions and character variants are randomized enough that players cannot identify themselves from fixed ordering.
- Lanes and racer sprites are sized so all 20 racers fit in-frame without vertical scrolling.
- Racer sprites may overflow the board edges (lane 1 ears and KO markers poke above the top) instead of being clipped flat.
- Lanes use slight depth/perspective like the reference screenshot.
- The finish line is straight and uses a black-and-white checkered flag treatment.
- All 20 lanes fit on one screen without vertical scrolling.
- The playfield and HUD must read well at `1200px` wide on a laptop.
- Crosshairs, bullet indicators, dead bodies, winner state, and reveal highlights should be readable at a glance.
- Light sound cues support key actions such as creating/joining lobbies, readying, starting, and saving a display name; firing gets the heavier gunshot treatment described in Juice And Feedback.
- Live gameplay plays mellow elevator-style generated background music: soft sine-pad seventh chords, a gentle triangle melody, and a quiet bass note per chord change, with a mute toggle.

## Suggested State Model

- `boot`: load config/assets.
- `menu`: entry screen.
- `lobby`: room code, privacy, player list, round count, host controls.
- `countdown`: `3, 2, 1, go`.
- `playing`: live round.
- `paused`: stopped simulation if pause is supported.
- `roundOver`: winner plus player reveal/NPC shame.
- `scoreboard`: multi-round results and next-round action.
- `gameOver`: final match result after the selected rounds.

## Technical Shape

- Current app stack is React + Vite + JavaScript + npm + Oxlint.
- React should own shell UI, lobby, scoreboard, and top-level state.
- High-frequency gameplay should be isolated from ordinary React UI rendering where practical.
- Current networking scope: lobbies, readiness, countdown, live phase, shots, round winners, scoreboard state, and next-round state are owned by one authoritative Colyseus room.
- MVP backend choice: server state is required for friends to join and play in the same room.
- MVP deployment target: deploy the multiplayer game so friends can reach the same hosted room.
- MVP platform target: desktop/laptop first; mobile and tablet controls are deferred until the laptop loop works.
- Keep lobby, player, and round state behind small modules so real-time networking can own the authoritative session later.
- Use the Colyseus room backend on Fly.io with Cloudflare Pages retained only for static frontend hosting.
- Clients send authenticated intent such as movement mode, aim, shot, ready, and next round. They never send lane ownership, progress, hits, winners, or scores as facts.
- The room runs a fixed 20Hz authoritative simulation and synchronizes public racer state; connection-private messages carry only the local lane, crosshair identity, stamina, exhaustion, and elimination state.
- Every command carries protocol, room, round, and increasing sequence identifiers so stale, duplicated, reordered, or replayed messages are rejected.
- Unexpected disconnects have a 45-second rotating-token reconnection window. Host departure closes the room; browser and server inactivity limits dispose abandoned rooms.
- Rendering targets 60fps: local movement advances on a requestAnimationFrame delta-time loop, and remote racers are dead-reckoned from their last synced progress and movement mode, easing toward the extrapolated target instead of snapping per sync.
- Keep hosting cost modest with one 256 MB shared Fly machine, scale-to-zero, no volume, bounded room size, and aggressive room disposal. Cloudflare Pages serves hashed static assets without realtime Worker traffic.
- Observability comes from Fly health checks, structured room lifecycle logs, deterministic network regressions, and the public three-round SDK smoke test.
- Use a renderer that can support 20 visible pixel-art lanes, mouse crosshairs, dead bodies, and reveal highlights at the `1200px` target.
- Keep all gameplay constants easy to tune.
- Defender integration must wait until the user provides or identifies Defender source files. No Defender source was found in the active repo or old workspace.

## Open Design Decisions

- Whether Defender should connect to this game at all if the user later provides its source.
