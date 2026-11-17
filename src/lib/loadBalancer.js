// Load balancer simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "Load Balancer" (src/components/viz) drives this
// engine for its interactive simulator, and the guided walkthrough reuses
// the same algorithms, latency model and nginx.conf rendering so the two
// halves of the subject always agree with each other.
//
// Model (matches the thachdv.it Reel the subject is based on):
// - Requests are page views (short) or checkouts (long-lived, hold a
//   connection open several seconds).
// - A server answers while it has a free connection slot; past its capacity
//   it drops the request with a 503.
// - Latency grows with the connections already open on the chosen server, so
//   piling long-lived checkouts onto one box makes p95 climb even when the
//   request count is spread evenly.
// - Three consecutive 503s mark a server down (nginx max_fails=3); it is
//   skipped for 10 s (fail_timeout=10s) and then rejoins.

export const SERVER_CAPACITY = 8;
export const MAX_FAILS = 3;
export const FAIL_TIMEOUT_MS = 10_000;

export const ALGORITHMS = [
  { id: 'none', label: 'No balancer', blurb: 'Everything lands on the first server.' },
  { id: 'round-robin', label: 'Round robin', blurb: 'Requests go 1 → 2 → 3 → 1 … in turn.' },
  { id: 'least-connections', label: 'Least connections', blurb: 'The least busy server gets the next request.' },
  { id: 'weighted-round-robin', label: 'Weighted round robin', blurb: 'Round robin, but heavier servers get a bigger share.' },
  { id: 'ip-hash', label: 'IP hash', blurb: 'The same client IP always lands on the same server.' },
  { id: 'random', label: 'Random', blurb: 'Each request picks a healthy server at random.' },
];

export const ALGORITHM_IDS = ALGORITHMS.map((a) => a.id);

/** The nginx directive a strategy adds inside `upstream backend { … }`. */
export function algorithmDirective(algorithmId) {
  switch (algorithmId) {
    case 'least-connections':
      return 'least_conn;';
    case 'ip-hash':
      return 'ip_hash;';
    case 'random':
      return 'random;';
    default:
      return null;
  }
}

/** A fresh server pool: app1..appN, all healthy, weight 1, full speed. */
export function createServers(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `app${i + 1}`,
    name: `Server ${i + 1}`,
    host: `app${i + 1}:8080`,
    weight: 1,
    /** 1 = full speed, 0.5 = slow (answers ~3x slower, holds connections). */
    speed: 1,
    healthy: true,
    active: 0,
    completed: 0,
    failed: 0,
    consecutiveFails: 0,
  }));
}

function healthyServers(servers) {
  return servers.map((s, i) => ({ server: s, index: i })).filter(({ server }) => server.healthy);
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Pick the server for one request. `state` is caller-owned mutable routing
 * state ({ rrIndex, weights }) — the engine never keeps module state, so the
 * simulator can reset by dropping the object.
 * Returns the server index, or -1 when no server is healthy.
 */
export function pickServer(algorithmId, servers, state, request = {}) {
  const healthy = healthyServers(servers);
  if (healthy.length === 0) return -1;
  switch (algorithmId) {
    case 'none':
      return servers[0].healthy ? 0 : -1;
    case 'round-robin': {
      const start = state.rrIndex % servers.length;
      for (let n = 0; n < servers.length; n += 1) {
        const i = (start + n) % servers.length;
        if (servers[i].healthy) {
          state.rrIndex = i + 1;
          return i;
        }
      }
      return -1;
    }
    case 'least-connections': {
      let best = healthy[0];
      for (const entry of healthy) {
        if (entry.server.active < best.server.active) best = entry;
      }
      return best.index;
    }
    case 'weighted-round-robin': {
      // Smooth weighted round robin (the nginx algorithm): each server's
      // running weight grows by its weight, the highest wins, then it pays
      // back the total weight.
      const total = healthy.reduce((sum, { server }) => sum + server.weight, 0);
      let best = null;
      for (const { server, index } of healthy) {
        state.weights[server.id] = (state.weights[server.id] || 0) + server.weight;
        if (!best || state.weights[server.id] > state.weights[best.server.id]) best = { server, index };
      }
      state.weights[best.server.id] -= total;
      return best.index;
    }
    case 'ip-hash': {
      const hash = hashString(String(request.ip || '0.0.0.0'));
      return healthy[hash % healthy.length].index;
    }
    case 'random': {
      return healthy[Math.floor(Math.random() * healthy.length)].index;
    }
    default:
      return healthy[0].index;
  }
}

/** Fresh routing state for a new simulation run. */
export function createRoutingState() {
  return { rrIndex: 0, weights: {} };
}

/**
 * How long a request takes on a server, in ms. Grows with the connections
 * already open there, so an overloaded box answers slowly; a slow server
 * and a long-lived checkout both cost more. `jitter` in [0, 1) varies the
 * result ±20% — pass a fixed value in tests for determinism.
 */
export function requestLatencyMs(server, type, jitter = Math.random()) {
  const base = 24 + server.active * 26;
  const slowPenalty = server.speed < 1 ? 170 : 0;
  const checkoutCost = type === 'checkout' ? 110 : 0;
  const spread = 0.8 + jitter * 0.4;
  return Math.round((base + slowPenalty + checkoutCost) * spread);
}

/** How long a request holds its connection, in ms. */
export function requestHoldMs(type) {
  return type === 'checkout' ? 2600 + Math.random() * 2400 : 400 + Math.random() * 800;
}

/** Nearest-rank percentile of an array of numbers; 0 when there are none. */
export function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(rank, sorted.length) - 1];
}

/** Average / p95 / p99 of completed-request latencies, rounded to whole ms. */
export function summarizeLatencies(latencies) {
  if (latencies.length === 0) return { count: 0, avg: 0, p95: 0, p99: 0 };
  const sum = latencies.reduce((a, b) => a + b, 0);
  return {
    count: latencies.length,
    avg: Math.round(sum / latencies.length),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  };
}

/** The live nginx.conf for the current setup — the panel the subject shows. */
export function nginxConf(algorithmId, servers) {
  const lines = ['upstream backend {'];
  const directive = algorithmDirective(algorithmId);
  if (directive) lines.push(`    ${directive}`);
  if (algorithmId === 'round-robin') lines.push('    # round robin is the default');
  if (algorithmId === 'weighted-round-robin') lines.push('    # weights below make this weighted');
  for (const server of servers) {
    const parts = [`server ${server.host}`];
    if (server.weight !== 1) parts.push(`weight=${server.weight}`);
    parts.push(`max_fails=${MAX_FAILS} fail_timeout=10s`);
    if (!server.healthy) parts.push('down');
    lines.push(`    ${parts.join(' ')};`);
  }
  lines.push('}');
  return lines.join('\n');
}

// ---- Guided walkthrough: the four beats from the source Reel --------------
// Each step scripts the diagram (which servers hold how many connections,
// the headline numbers, the caption and the config on screen). The
// walkthrough animates requests continuously inside the step; the numbers
// below are the step's steady state, not live measurements.

export const WALKTHROUGH_STEPS = [
  {
    id: 'one-server',
    title: 'Step 1 · One server, too much traffic',
    caption: 'One server. It is already dropping requests.',
    p95: 950,
    errors503: 15,
    healthy: '1/1',
    servers: [{ conns: 8, status: 'overloaded' }],
    algorithm: 'none',
    conf: 'upstream backend {\n    server app1:8080;\n}\n# everything lands on one box',
  },
  {
    id: 'round-robin',
    title: 'Step 2 · Round robin',
    caption: 'A load balancer hands them out: 1 → 2 → 3. But every checkout lands on server 3.',
    p95: 428,
    errors503: 16,
    healthy: '3/3',
    servers: [{ conns: 1, status: 'ok' }, { conns: 1, status: 'ok' }, { conns: 7, status: 'overloaded' }],
    algorithm: 'round-robin',
    conf: 'upstream backend {\n    server app1:8080;\n    server app2:8080;\n    server app3:8080;\n}',
  },
  {
    id: 'least-conn',
    title: 'Step 3 · Least connections',
    caption: 'least_conn: the least busy server gets it. The slow box stops drowning.',
    p95: 118,
    errors503: 16,
    healthy: '3/3',
    servers: [{ conns: 2, status: 'ok' }, { conns: 3, status: 'ok' }, { conns: 3, status: 'ok' }],
    algorithm: 'least-connections',
    conf: 'upstream backend {\n    least_conn;\n    server app1:8080;\n    server app2:8080;\n    server app3:8080;\n}\n# fewest open connections wins',
  },
  {
    id: 'server-dies',
    title: 'Step 4 · A server dies',
    caption: 'Server 2 dies. 3 fails → it is skipped. Spread the load. Skip the dead.',
    p95: 200,
    errors503: 16,
    healthy: '2/3',
    servers: [{ conns: 4, status: 'ok' }, { conns: 0, status: 'down' }, { conns: 6, status: 'ok' }],
    algorithm: 'least-connections',
    conf: 'upstream backend {\n    least_conn;\n    server app1:8080 max_fails=3;\n    server app2:8080 max_fails=3;\n    server app3:8080 max_fails=3;\n}\n# 3 fails -> skip it for 10 s',
  },
];
