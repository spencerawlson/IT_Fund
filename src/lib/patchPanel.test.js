import { describe, it, expect } from 'vitest';
import {
  COPPER_MAX_M,
  CAT6_10G_MAX_M,
  STANDARDS,
  PINOUTS,
  pinout,
  maxLengthM,
  createRun,
  createRuns,
  checkRunLength,
  linkStatus,
  reterminateRun,
  reterminateBothEnds,
  updateRun,
  patchRun,
  movePatchCord,
  unpatchRun,
  nextFreeSwitchPort,
  summarizeRuns,
  terminationSchedule,
} from './patchPanel';

describe('patch panel engine', () => {
  it('T568A and T568B differ only in the green vs orange pair', () => {
    expect(STANDARDS).toEqual(['T568A', 'T568B']);
    expect(PINOUTS.T568A).toHaveLength(8);
    expect(PINOUTS.T568B).toHaveLength(8);
    // Blue (pins 4–5) and brown (pins 7–8) never move.
    for (const pin of [3, 4, 6, 7]) {
      expect(PINOUTS.T568A[pin]).toBe(PINOUTS.T568B[pin]);
    }
    // Green and orange swap places.
    expect(PINOUTS.T568A[0]).toBe('white/green');
    expect(PINOUTS.T568B[0]).toBe('white/orange');
    expect(PINOUTS.T568A[1]).toBe('green');
    expect(PINOUTS.T568B[1]).toBe('orange');
    expect(PINOUTS.T568A[2]).toBe('white/orange');
    expect(PINOUTS.T568B[2]).toBe('white/green');
    expect(PINOUTS.T568A[5]).toBe('orange');
    expect(PINOUTS.T568B[5]).toBe('green');
    expect(pinout('T568A')).toEqual(PINOUTS.T568A);
    expect(pinout('T568B')).toEqual(PINOUTS.T568B);
  });

  it('a mixed-standard run fails as a crossover until re-terminated to one standard', () => {
    const run = createRun({ port: 6, device: 'Printer', outletStandard: 'T568A', panelStandard: 'T568B', switchPort: 6 });
    expect(linkStatus(run).code).toBe('crossover');
    expect(linkStatus(run).message).toMatch(/Mixed standard/);
    // Re-terminating one end fixes it.
    expect(linkStatus(reterminateRun(run, 'panel', 'T568A')).code).toBe('pass');
    expect(linkStatus(reterminateRun(run, 'outlet', 'T568B')).code).toBe('pass');
    expect(linkStatus(reterminateBothEnds(run, 'T568B')).code).toBe('pass');
    // A run with the same standard at both ends passes.
    const good = createRun({ port: 1, device: 'PC', outletStandard: 'T568A', panelStandard: 'T568A', switchPort: 1 });
    expect(linkStatus(good).code).toBe('pass');
  });

  it('run-length checker enforces the 100 m copper max', () => {
    expect(COPPER_MAX_M).toBe(100);
    expect(maxLengthM('Cat6', 1)).toBe(100);
    expect(maxLengthM('Cat5e', 1)).toBe(100);
    expect(maxLengthM('Cat6a', 1)).toBe(100);
    const atLimit = createRun({ port: 1, device: 'PC', lengthM: 100, speedGbps: 1, switchPort: 1 });
    expect(checkRunLength(atLimit).ok).toBe(true);
    const over = createRun({ port: 1, device: 'PC', lengthM: 101, speedGbps: 1, switchPort: 1 });
    expect(checkRunLength(over).ok).toBe(false);
    expect(linkStatus(over).code).toBe('too-long');
  });

  it('Cat 6 carries 10 Gbps only to ~55 m; Cat 6a goes the full 100 m', () => {
    expect(CAT6_10G_MAX_M).toBe(55);
    expect(maxLengthM('Cat6', 10)).toBe(55);
    expect(maxLengthM('Cat6a', 10)).toBe(100);
    const cat6Long = createRun({ port: 5, device: 'Server', category: 'Cat6', lengthM: 72, speedGbps: 10, switchPort: 5 });
    expect(checkRunLength(cat6Long).ok).toBe(false);
    expect(linkStatus(cat6Long).code).toBe('too-long');
    // Same length is fine at 1 Gbps, and fine as Cat 6a at 10 Gbps.
    expect(linkStatus(updateRun(cat6Long, { speedGbps: 1 })).code).toBe('pass');
    expect(linkStatus(updateRun(cat6Long, { category: 'Cat6a' })).code).toBe('pass');
    const cat6aLong = createRun({ port: 4, device: 'AP', category: 'Cat6a', lengthM: 88, speedGbps: 10, switchPort: 4 });
    expect(linkStatus(cat6aLong).code).toBe('pass');
    const cat6Short = createRun({ port: 5, device: 'Server', category: 'Cat6', lengthM: 55, speedGbps: 10, switchPort: 5 });
    expect(linkStatus(cat6Short).code).toBe('pass');
  });

  it('Cat 5e cannot carry 10 Gbps at any length', () => {
    expect(maxLengthM('Cat5e', 10)).toBe(0);
    const run = createRun({ port: 3, device: 'Phone', category: 'Cat5e', lengthM: 10, speedGbps: 10, switchPort: 3 });
    expect(checkRunLength(run).ok).toBe(false);
    expect(linkStatus(run).code).toBe('unsupported');
  });

  it('patching and moving a device work, and the permanent run is untouched', () => {
    const run = createRun({ port: 7, device: 'Camera', switchPort: null });
    expect(linkStatus(run).code).toBe('unpatched');
    const patched = patchRun(run, 7);
    expect(patched.switchPort).toBe(7);
    expect(linkStatus(patched).code).toBe('pass');
    // Moving the device = moving one patch cord; the run itself never changes.
    const moved = movePatchCord(patched, 12);
    expect(moved.switchPort).toBe(12);
    expect(moved.port).toBe(run.port);
    expect(moved.lengthM).toBe(run.lengthM);
    expect(moved.outletStandard).toBe(run.outletStandard);
    expect(moved.panelStandard).toBe(run.panelStandard);
    expect(linkStatus(moved).code).toBe('pass');
    expect(linkStatus(unpatchRun(moved)).code).toBe('unpatched');
    // The original run object is never mutated.
    expect(run.switchPort).toBeNull();
  });

  it('nextFreeSwitchPort skips ports already in use', () => {
    const runs = createRuns();
    expect(nextFreeSwitchPort(runs)).toBe(7);
    const allPatched = runs.map((r) => patchRun(r, r.port));
    expect(nextFreeSwitchPort(allPatched)).toBe(9);
  });

  it('the shipped panel has one crossover, one too-long run and one unpatched run', () => {
    const runs = createRuns();
    expect(runs).toHaveLength(8);
    const codes = runs.map((r) => linkStatus(r).code);
    expect(codes.filter((c) => c === 'crossover')).toHaveLength(1);
    expect(codes.filter((c) => c === 'too-long')).toHaveLength(1);
    expect(codes.filter((c) => c === 'unpatched')).toHaveLength(1);
    expect(codes.filter((c) => c === 'pass')).toHaveLength(5);
    const summary = summarizeRuns(runs);
    expect(summary.total).toBe(8);
    expect(summary.passing).toBe(5);
    expect(summary.failing).toBe(2);
    expect(summary.unpatched).toBe(1);
    expect(summary.patched).toBe(7);
    // Derived metric: the longest run is the 88 m Cat 6a run to the access point.
    expect(summary.longestRunM).toBe(88);
    expect(summary.longestRun.port).toBe(4);
    expect(summary.longestRun.device).toMatch(/Access Point/);
  });

  it('termination schedule lists every run with its short link verdict', () => {
    const schedule = terminationSchedule(createRuns());
    expect(schedule).toContain('termination schedule');
    expect(schedule).toContain('PrinterOff');
    expect(schedule).toContain('X-over');
    expect(schedule).toContain('too-long');
    expect(schedule).toContain('open');
    expect(schedule).toContain('pass');
    // Every line fits the narrow controls column without wrapping.
    for (const line of schedule.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(34);
    }
  });
});
