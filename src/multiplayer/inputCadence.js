// Event-driven input cadence: dead reckoning extrapolates remote racers from
// their last synced progress and movement mode using shared speed constants,
// so a moving racer only needs occasional progress corrections — not a fresh
// snapshot every 50ms. Mode and lane changes always send immediately because
// extrapolation depends on them, and the final stretch runs at full rate so
// the server adjudicates the finish from fresh data. Incoming Durable Object
// WebSocket messages are billed, so every suppressed send is real money.
export const PROGRESS_CORRECTION_INTERVAL_MS = 400
export const FULL_RATE_PROGRESS = 85

const inputSignature = (snapshot) =>
  `${snapshot.playerName}|${snapshot.movementMode}|${snapshot.laneId}|${snapshot.firing}`

// Decides whether the latest input snapshot is worth sending. Returns null to
// skip, or { payload, signature } for the caller to record once the send
// succeeds. `previous` is { payload, signature, sentAt }.
export function evaluateInputSend(previous, snapshot, now) {
  const payload = JSON.stringify(snapshot)
  if (payload === previous.payload) {
    return null
  }
  const signature = inputSignature(snapshot)
  const progressOnlyDrift =
    signature === previous.signature &&
    snapshot.progress < FULL_RATE_PROGRESS &&
    now - previous.sentAt < PROGRESS_CORRECTION_INTERVAL_MS
  if (progressOnlyDrift) {
    return null
  }
  return { payload, signature }
}
