import { describe, it, expect } from 'vitest';
import {
  ALGORITHMS,
  SERVER_CAPACITY,
  MAX_FAILS,
  createServers,
  createRoutingState,
  pickServer,
  requestLatencyMs,
  percentile,
  summarizeLatencies,
  nginxConf,
  WALKTHROUGH_STEPS,
} from './loadBalancer';

describe('load balancer engine', () => {
  it('round robin cycles 1 → 2 → 3 and skips a down server', () => {
    const servers = createServers(3);
    const state = createRoutingState();
    expect([0, 1, 2, 3].map(() => pickServer('round-robin', servers, state))).toEqual([0, 1, 2, 0]);
    servers[1].healthy = false;
    expect([0, 1, 2].map(() => pickServer('round-robin', servers, state))).toEqual([2, 0, 2]);
  });

  it('no balancer always uses the first healthy server, -1 when none are healthy', () => {
    const servers = createServers(2);
    const state = createRoutingState();
    expect(pickServer('none', servers, state)).toBe(0);
    servers[0].healthy = false;
    expect(pickServer('none', servers, state)).toBe(-1);
  });

  it('least connections picks the least busy server', () => {
    const servers = createServers(3);
    servers[0].active = 5;
    servers[1].active = 1;
    servers[2].active = 3;
    expect(pickServer('least-connections', servers, createRoutingState())).toBe(1);
  });

  it('weighted round robin gives the heavier server a bigger share', () => {
    const servers = createServers(2);
    servers[0].weight = 3;
    servers[1].weight = 1;
    const state = createRoutingState();
    const counts = [0, 0];
    for (let i = 0; i < 40; i += 1) counts[pickServer('weighted-round-robin', servers, state)] += 1;
    expect(counts[0]).toBe(30);
    expect(counts[1]).toBe(10);
  });

  it('ip hash pins one client to one server', () => {
    const servers = createServers(3);
    const state = createRoutingState();
    const first = pickServer('ip-hash', servers, state, { ip: '203.0.113.7' });
    for (let i = 0; i < 5; i += 1) {
      expect(pickServer('ip-hash', servers, state, { ip: '203.0.113.7' })).toBe(first);
    }
  });

  it('latency grows with open connections and with a slow server', () => {
    const [server] = createServers(1);
    const idle = requestLatencyMs(server, 'page', 0.5);
    server.active = SERVER_CAPACITY;
    const loaded = requestLatencyMs(server, 'page', 0.5);
    expect(loaded).toBeGreaterThan(idle * 3);
    server.active = 0;
    server.speed = 0.5;
    expect(requestLatencyMs(server, 'page', 0.5)).toBeGreaterThan(idle * 3);
    expect(requestLatencyMs(server, 'checkout', 0.5)).toBeGreaterThan(requestLatencyMs(server, 'page', 0.5));
  });

  it('percentiles and summary match the textbook definitions', () => {
    expect(percentile([], 95)).toBe(0);
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 95)).toBe(100);
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 50)).toBe(50);
    expect(summarizeLatencies([100, 100, 100, 100, 200])).toEqual({ count: 5, avg: 120, p95: 200, p99: 200 });
  });

  it('nginx.conf names the strategy and marks down servers', () => {
    const servers = createServers(3);
    servers[1].healthy = false;
    servers[2].weight = 2;
    const conf = nginxConf('least-connections', servers);
    expect(conf).toContain('least_conn;');
    expect(conf).toContain('server app2:8080 max_fails=3 fail_timeout=10s down;');
    expect(conf).toContain('server app3:8080 weight=2 max_fails=3 fail_timeout=10s;');
    expect(conf).toContain(`max_fails=${MAX_FAILS}`);
    expect(nginxConf('round-robin', createServers(2))).toContain('# round robin is the default');
  });

  it('every algorithm has a label and a routing path', () => {
    expect(ALGORITHMS.map((a) => a.id)).toEqual([
      'none',
      'round-robin',
      'least-connections',
      'weighted-round-robin',
      'ip-hash',
      'random',
    ]);
    const servers = createServers(3);
    for (const { id } of ALGORITHMS) {
      expect(pickServer(id, servers, createRoutingState(), { ip: '10.0.0.1' })).toBeGreaterThanOrEqual(0);
    }
  });

  it('the walkthrough tells the Reel story in four beats', () => {
    expect(WALKTHROUGH_STEPS.map((s) => s.id)).toEqual(['one-server', 'round-robin', 'least-conn', 'server-dies']);
    for (const step of WALKTHROUGH_STEPS) {
      expect(step.caption.length).toBeGreaterThan(0);
      expect(step.conf).toContain('upstream backend');
      expect(step.p95).toBeGreaterThan(0);
    }
    // The lesson lands in the numbers: round robin leaves p95 high while a
    // checkout piles onto one box; least_conn brings it back down.
    expect(WALKTHROUGH_STEPS[1].p95).toBeGreaterThan(WALKTHROUGH_STEPS[2].p95);
    expect(WALKTHROUGH_STEPS[3].servers[1].status).toBe('down');
  });
});
