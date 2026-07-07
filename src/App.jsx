import { useMemo, useState } from 'react'
import './App.css'

const STATES = [
  'menu',
  'lobby',
  'countdown',
  'playing',
  'paused',
  'roundOver',
  'scoreboard',
  'gameOver',
]

const PLAYERS = ['James', 'Mia', 'Noah', 'Ava']
const ARCHETYPES = ['Driver', 'Runner', 'Mask', 'Coat', 'Cap']
const LANES = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  archetype: ARCHETYPES[index % ARCHETYPES.length],
}))

const STATE_COPY = {
  menu: {
    eyebrow: 'Death Race Online',
    title: 'Hidden-identity racing with one shot each.',
    body: 'Create a room, fill the grid to 20 racers, and start reading movement tells before anyone reads yours.',
    action: 'Create lobby',
    next: 'lobby',
  },
  lobby: {
    eyebrow: 'Lobby DR-2048',
    title: 'Public room, 4 humans, 16 NPCs.',
    body: 'Host chooses 5 rounds. Names stay here and on the scoreboard, never attached to racers during play.',
    action: 'Start countdown',
    next: 'countdown',
  },
  countdown: {
    eyebrow: 'Round 1',
    title: '3, 2, 1, go.',
    body: 'Assignments are secret. Movement and shooting unlock when the countdown clears.',
    action: 'Go',
    next: 'playing',
  },
  playing: {
    eyebrow: 'Live round',
    title: 'Walk, run, aim, fire once.',
    body: 'Space walks, Left Shift runs, mouse aims, Mouse 1 fires. Crosshairs remain visible until the shot is spent.',
    action: 'Declare winner',
    next: 'roundOver',
  },
  paused: {
    eyebrow: 'Paused',
    title: 'Simulation stopped.',
    body: 'The live state remains visible while action is paused.',
    action: 'Resume',
    next: 'playing',
  },
  roundOver: {
    eyebrow: 'NPC wins',
    title: 'Everyone gets shamed.',
    body: 'Human-controlled racers are revealed and highlighted before the scoreboard appears.',
    action: 'Show scoreboard',
    next: 'scoreboard',
  },
  scoreboard: {
    eyebrow: 'Scoreboard',
    title: 'Round winner earns 1 point.',
    body: 'NPC wins award no human points. Host can instantly start the next round.',
    action: 'Next round',
    next: 'countdown',
  },
  gameOver: {
    eyebrow: 'Match complete',
    title: 'Final scores are locked.',
    body: 'Return to the lobby to change players or round count.',
    action: 'Back to lobby',
    next: 'lobby',
  },
}

function App() {
  const [state, setState] = useState('menu')
  const activeState = STATE_COPY[state]

  const statusItems = useMemo(
    () => [
      ['Room', 'DR-2048'],
      ['Mode', 'Local prototype'],
      ['Rounds', '1 / 5'],
      ['Racers', '20'],
    ],
    [],
  )

  const moveToState = (nextState) => {
    setState(nextState)
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Death Race</p>
          <h1>Read the racer, hide the tell.</h1>
        </div>
        <div className="state-tabs" aria-label="Game state controls">
          {STATES.map((item) => (
            <button
              key={item}
              type="button"
              className={item === state ? 'active' : ''}
              onClick={() => moveToState(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <section className="status-strip" aria-label="Round status">
        {statusItems.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className="hero-panel" aria-labelledby="state-title">
        <div className="state-card">
          <p className="eyebrow">{activeState.eyebrow}</p>
          <h2 id="state-title">{activeState.title}</h2>
          <p>{activeState.body}</p>
          <div className="actions">
            <button type="button" onClick={() => moveToState(activeState.next)}>
              {activeState.action}
            </button>
            {state === 'playing' ? (
              <button type="button" onClick={() => moveToState('paused')}>
                Pause
              </button>
            ) : null}
          </div>
        </div>

        <div className="race-preview" aria-label="20 lane race preview">
          {LANES.map((lane) => {
            const isHuman = lane.id <= PLAYERS.length
            const isRevealed = state === 'roundOver' || state === 'scoreboard'
            return (
              <div className="lane" key={lane.id}>
                <span className="lane-number">{lane.id}</span>
                <span
                  className={`racer archetype-${lane.id % ARCHETYPES.length}`}
                  style={{ left: `${12 + (lane.id % 5) * 9}%` }}
                  title={lane.archetype}
                >
                  {lane.archetype.slice(0, 1)}
                </span>
                {isHuman && isRevealed ? (
                  <span className="reveal-tag">{PLAYERS[lane.id - 1]}</span>
                ) : null}
                {isHuman && state === 'playing' ? (
                  <span
                    className="crosshair"
                    style={{ left: `${62 + lane.id * 3}%` }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default App
