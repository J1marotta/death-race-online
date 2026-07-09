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
- The host creates a lobby and receives the room code to share.
- Joining players enter the room code and their username.
- Lobbies can be public or private.
- The host chooses the number of rounds.
- Every connected player, including the host, must ready up before the game can start.
- Only the host can start the game.
- Connected players see the same lobby, countdown, round, and scoreboard state.
- The room side panel stays visible during live rounds so the room code, roster, readiness, and sync status remain visible.
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
4. Players move, aim, infer identities, and may fire their one shot.
5. Shot racers are eliminated and remain visible as bodies.
6. Eliminated players spectate.
7. The round continues until a racer wins.
8. Reveal/highlight all human-controlled racers after the winner is declared.
9. If an NPC wins, show a shame/reveal moment.
10. Show the scoreboard and next-round action.

## Player Controls

- `Space`: walk.
- `Left Shift`: run.
- No movement key pressed: stop.
- Mouse: aim.
- Mouse 1: fire.

Running has no stamina, cooldown, noise meter, or extra UI. The risk is behavioral: running makes intent easier to read and may draw shots.

## Shooting And Aiming

- Each human player gets exactly one bullet per round.
- Players can shoot any racer/lane, including themselves.
- Shooting eliminates the target.
- NPCs never shoot in the MVP.
- All loaded human players have visible crosshairs.
- Crosshairs are visible to everyone and color-coded by player.
- Show a visible single-bullet indicator.
- Hide a player's crosshair after they fire.

## Elimination And Winning

- If a player's assigned racer is shot, that player is out for the round.
- Eliminated players keep watching as spectators.
- Dead bodies remain visible on the track.
- The round ends only when a racer wins.
- NPCs can win.
- If an NPC wins, everyone gets shamed and all human-controlled racers are revealed.

## NPC Behavior

- NPCs fill all unused racer slots.
- NPCs walk, stop, and occasionally run.
- NPCs should imitate human hesitation and intent.
- NPCs never shoot.
- NPCs must be capable of winning.

## Visual Direction

- Pixel-art style.
- 5 unique character looks repeated 4 times across 20 lanes.
- Repeated character looks are visually identical.
- Lanes use slight depth/perspective like the reference screenshot.
- All 20 lanes fit on one screen without vertical scrolling.
- The playfield and HUD must read well at `1200px` wide on a laptop.
- Crosshairs, bullet indicators, dead bodies, winner state, and reveal highlights should be readable at a glance.

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
- Current networking scope: the lobby is backed by Cloudflare room state; live gameplay still needs authoritative shared round state.
- MVP backend choice: server state is required for friends to join and play in the same room.
- MVP deployment target: deploy the multiplayer game so friends can reach the same hosted room.
- MVP platform target: desktop/laptop first; mobile and tablet controls are deferred until the laptop loop works.
- Keep lobby, player, and round state behind small modules so real-time networking can own the authoritative session later.
- Add a backend, realtime transport, and deployment-specific code when implementing joinable multiplayer.
- Use a renderer that can support 20 visible pixel-art lanes, mouse crosshairs, dead bodies, and reveal highlights at the `1200px` target.
- Keep all gameplay constants easy to tune.
- Defender integration must wait until the user provides or identifies Defender source files. No Defender source was found in the active repo or old workspace.

## Open Design Decisions

- Which live transport should replace polling for shared lobbies and round sync.
- Whether Defender should connect to this game at all if the user later provides its source.
