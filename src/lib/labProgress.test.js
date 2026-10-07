import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordLabCompletion, getLabProgress, aggregateServerHistory, mergeProgress, formatDuration } from './labProgress';

describe('labProgress', () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    });
  });

  it('records a completion with duration and best time', () => {
    const r = recordLabCompletion('py-basics-001', '2026-10-07T10:00:00Z', '2026-10-07T10:12:30Z');
    expect(r.completions).toBe(1);
    expect(r.lastSeconds).toBe(750);
    expect(r.bestSeconds).toBe(750);
  });

  it('keeps the best time across runs', () => {
    recordLabCompletion('py-basics-001', '2026-10-07T10:00:00Z', '2026-10-07T10:12:30Z');
    const r = recordLabCompletion('py-basics-001', '2026-10-07T11:00:00Z', '2026-10-07T11:05:00Z');
    expect(r.completions).toBe(2);
    expect(r.bestSeconds).toBe(300);
    expect(r.lastSeconds).toBe(300);
    const slower = recordLabCompletion('py-basics-001', '2026-10-07T12:00:00Z', '2026-10-07T12:20:00Z');
    expect(slower.bestSeconds).toBe(300);
    expect(slower.lastSeconds).toBe(1200);
  });

  it('rejects unusable timestamps', () => {
    expect(recordLabCompletion('x', 'bogus', '2026-10-07T10:00:00Z')).toBeNull();
    expect(recordLabCompletion('x', '2026-10-07T11:00:00Z', '2026-10-07T10:00:00Z')).toBeNull();
    expect(getLabProgress()).toEqual({});
  });

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(750)).toBe('12m 30s');
    expect(formatDuration(3900)).toBe('1h 5m');
    expect(formatDuration(null)).toBe('—');
  });

  it('aggregates server rows newest-first', () => {
    const agg = aggregateServerHistory([
      { lab_id: 'a', duration_seconds: 300, completed_at: '2026-10-07T12:00:00Z' },
      { lab_id: 'a', duration_seconds: 600, completed_at: '2026-10-07T10:00:00Z' },
      { lab_id: 'b', duration_seconds: 120, completed_at: '2026-10-07T11:00:00Z' },
    ]);
    expect(agg.a.completions).toBe(2);
    expect(agg.a.bestSeconds).toBe(300);
    expect(agg.a.lastSeconds).toBe(300);
    expect(agg.b.completions).toBe(1);
  });

  it('merges with server winning per lab, local-only labs preserved', () => {
    const local = {
      a: { completions: 5, bestSeconds: 999, lastSeconds: 999, lastCompletedAt: 't' },
      c: { completions: 1, bestSeconds: 60, lastSeconds: 60, lastCompletedAt: 't' },
    };
    const server = {
      a: { completions: 2, bestSeconds: 300, lastSeconds: 300, lastCompletedAt: 't2' },
    };
    const merged = mergeProgress(local, server);
    expect(merged.a.completions).toBe(2); // server wins: never double-counts
    expect(merged.c.completions).toBe(1); // local-only lab preserved
  });
});
