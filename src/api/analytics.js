// Client for the Cypher analytics endpoints (backend/analytics.py).
// Fire-and-forget: a failed event log must never surface an error to the
// learner or block the lesson — it only feeds Spencer's engagement/cost
// aggregates.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function logCypherEvent({ event, mission_id, lesson_id, meta }) {
  try {
    await fetch(`${API_BASE}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        event,
        ...(mission_id ? { mission_id } : {}),
        ...(lesson_id ? { lesson_id } : {}),
        ...(meta ? { meta } : {}),
      }),
    });
  } catch {
    // Analytics is best-effort by design.
  }
}
