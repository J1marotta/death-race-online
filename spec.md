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
- The host enters their display name, creates a lobby, and receives the room code to share.
- Joining players enter the room code and their display name.
- Connected players can edit their own display name from the real-players roster before the round starts.
- Lobbies can be public or private.
- The host chooses the number of rounds.
- Every connected player, including the host, must ready up before the game can start.
- Only the host can start the game.
- Connected players see the same lobby, countdown, round, and scoreboard state.
- Create-lobby actions show a loading state so the user can tell the backend request is in flight.
- Room updates use a Cloudflare-compatible live transport, with polling only as a fallback.
- Once a room exists, the room code, connection count, ready count, and match summary live in the top bar.
- The lobby side panel focuses on the editable real-players roster, ready/start actions, and compact host settings so the flow fits without scrolling.
- The room side panel is visible for menu, lobby, and result/scoreboard states, then hides during countdown and live play so the playfield is the focus.
- Transport sync state is internal recovery information and should not flicker as a visible UI status.
- Rooms are destroyed when the host leaves or when every client stops heartbeating.
- Remaining clients see a closed-room state with a return-to-menu action when the host leaves or the room expires.
- Late joiners spectate until the next round.
- Player names are visible in the lobby and scoreboard.
- Player names are not attached to racers during live gameplay.
- A multi-round scoreboard is shown after each round.
- Human round winners get 1 point.
- NPC wins award no human points and trigger the shame/reveal moment.
- From the scoreboard, the host can instantly start the next round.

## Round Flow

1. Fill the race with exactly 20 racers, using NPCs for empty human slots.
2. Secretly assign each active room player to one racer.
3. Start a `3, 2, 1, go` countdown.
4. The host-owned room state advances from countdown to live play, and all clients follow that shared phase.
5. Players move, aim, infer identities, and may fire their one shot.
6. Shot racers are recorded in shared room state, eliminated for every client, and remain visible as bodies.
7. Eliminated players spectate.
8. If every human racer is eliminated while more rounds remain, the rest of the race fast-forwards.
9. The round continues until a racer wins.
10. The host records the round winner in shared room state.
11. Reveal/highlight all human-controlled racers after the winner is declared.
12. If an NPC wins, show a shame/reveal moment.
13. Show the shared scoreboard and next-round action.

## Player Controls

- `Space`: walk.
- `Left Shift`: run.
- No movement key pressed: stop.
- Mouse: aim.
- Mouse 1: fire.

Running has no stamina, cooldown, noise meter, or extra UI. The risk is behavioral: running makes intent easier to read and may draw shots.
Control reminders are visible below the playfield during the race.

## Shooting And Aiming

- Each human player gets exactly one bullet per round.
- Players can shoot any racer/lane, including themselves.
- Shooting eliminates the target.
- NPCs never shoot in the MVP.
- All loaded human players have visible crosshairs.
- Crosshairs are visible to everyone and color-coded by player.
- Before firing, show a small pixel bullet attached to the crosshair.
- Dim a player's crosshair to 50% opacity and turn it grey after they fire.

## Elimination And Winning

- If a player's assigned racer is shot, that player is out for the round.
- Eliminated players keep watching as spectators.
- Dead bodies remain visible on the track.
- The round ends only when a racer wins.
- NPCs can win.
- If an NPC wins, everyone gets shamed and all human-controlled racers are revealed.

## NPC Behavior

- NPCs fill all unused racer slots.
- NPCs walk, stop, occasionally run, and sometimes pause for extended periods.
- NPC running and stopping should feel erratic enough that NPCs do not look like they are all perfectly racing to win.
- NPCs should imitate human hesitation and intent.
- NPCs never shoot.
- NPCs must be capable of crossing the visible finish line and winning.

## Visual Direction

- Pixel-art style.
- 8 character shape variants are reused across the 20 lanes.
- Character variants keep the same hitbox even when their silhouettes differ.
- Starting lane positions and character variants are randomized enough that players cannot identify themselves from fixed ordering.
- Lanes and racer sprites are sized so all 20 racers fit in-frame without vertical scrolling.
- Lanes use slight depth/perspective like the reference screenshot.
- The finish line is straight and uses a black-and-white checkered flag treatment.
- All 20 lanes fit on one screen without vertical scrolling.
- The playfield and HUD must read well at `1200px` wide on a laptop.
- Crosshairs, bullet indicators, dead bodies, winner state, and reveal highlights should be readable at a glance.
- Light sound cues support key actions such as creating/joining lobbies, readying, starting, shooting, and saving a display name.

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
- Current networking scope: lobbies, readiness, countdown, live phase, shots, round winners, scoreboard state, and next-round state are backed by Cloudflare room state.
- MVP backend choice: server state is required for friends to join and play in the same room.
- MVP deployment target: deploy the multiplayer game so friends can reach the same hosted room.
- MVP platform target: desktop/laptop first; mobile and tablet controls are deferred until the laptop loop works.
- Keep lobby, player, and round state behind small modules so real-time networking can own the authoritative session later.
- Use the Cloudflare Durable Object room backend, Worker API, and live WebSocket transport with HTTP polling as fallback.
- Keep Cloudflare usage modest: prefer WebSocket pushes over polling, throttle heartbeat/input requests, slow fallback polling, and destroy rooms when the host leaves or everyone disconnects.
- Use a renderer that can support 20 visible pixel-art lanes, mouse crosshairs, dead bodies, and reveal highlights at the `1200px` target.
- Keep all gameplay constants easy to tune.
- Defender integration must wait until the user provides or identifies Defender source files. No Defender source was found in the active repo or old workspace.

## Open Design Decisions

- Whether Defender should connect to this game at all if the user later provides its source.
