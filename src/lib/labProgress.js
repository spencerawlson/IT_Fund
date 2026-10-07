// Interactive-lab completion tracker: per-lab completions and times, kept in
// this browser. Mirrors the academy's localStorage-first approach
// (see src/lib/academy.js, key itfund-academy-v1); lab sessions are open to
// anonymous visitors, so per-browser history is the honest store today. A server
// adapter can replace this when lab history syncs to accounts.
//
// Shape: { [labId]: { completions, bestSeconds, lastSeconds, lastCompletedAt } }
const KEY = 'itfund-lab-progress-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: progress just won't persist.
  }
}

/** Record one completion. Returns the lab's updated record, or null if the timestamps are unusable. */
export function recordLabCompletion(labId, startedAtIso, completedAtIso) {
  if (!labId) return null;
  const start = new Date(startedAtIso).getTime();
  const end = new Date(completedAtIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const seconds = Math.round((end - start) / 1000);
  const all = load();
  const prev = all[labId] || { completions: 0, bestSeconds: null };
  const next = {
    completions: prev.completions + 1,
    bestSeconds: prev.bestSeconds == null ? seconds : Math.min(prev.bestSeconds, seconds),
    lastSeconds: seconds,
    lastCompletedAt: completedAtIso,
  };
  all[labId] = next;
  save(all);
  return next;
}

/** The whole progress map. */
export function getLabProgress() {
  return load();
}

/**
 * Aggregate server history rows into the same shape as the local map.
 * Rows: [{ lab_id, duration_seconds, completed_at }], newest first.
 */
export function aggregateServerHistory(rows) {
  const map = {};
  for (const r of rows || []) {
    const e = map[r.lab_id] || (map[r.lab_id] = {
      completions: 0, bestSeconds: null, lastSeconds: null, lastCompletedAt: null,
    });
    e.completions += 1;
    e.bestSeconds = e.bestSeconds == null ? r.duration_seconds : Math.min(e.bestSeconds, r.duration_seconds);
    // Rows arrive newest-first, so the first seen is the latest run.
    if (e.lastSeconds == null) {
      e.lastSeconds = r.duration_seconds;
      e.lastCompletedAt = r.completed_at;
    }
  }
  return map;
}

/**
 * Merge server history with the local map. The server wins per lab whenever it
 * has rows for that lab — this can never double-count a run recorded in both
 * places. Local-only labs (completed while signed out) are preserved.
 */
export function mergeProgress(localMap, serverMap) {
  const merged = { ...(localMap || {}) };
  for (const [labId, entry] of Object.entries(serverMap || {})) {
    merged[labId] = entry;
  }
  return merged;
}

/** 45 -> "45s", 750 -> "12m 30s", 3900 -> "1h 5m". Null-safe. */
export function formatDuration(totalSeconds) {
  if (totalSeconds == null) return '—';
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}
