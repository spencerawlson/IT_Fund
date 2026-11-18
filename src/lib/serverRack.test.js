import { describe, it, expect } from 'vitest';
import {
  BREAKER_RATING_W,
  DEVICES,
  createRack,
  totalDrawW,
  feedDrawW,
  poweredLoadW,
  equilibriumTempC,
  stepTemperature,
  checkBreakers,
  resetBreaker,
  breakerHeadroomW,
  bindingFeed,
  setDeviceFeed,
  setDevicePower,
  moveAllToFeed,
  splitFeeds,
  shedLoad,
  restoreFullPower,
  tempStatus,
  rackConfigText,
} from './serverRack';

describe('42U rack engine', () => {
  it('starts fully loaded on feed A: 2,575 W against a 1,840 W breaker', () => {
    const rack = createRack();
    expect(totalDrawW(rack)).toBe(2575);
    expect(feedDrawW(rack, 'A')).toBe(2575);
    expect(feedDrawW(rack, 'B')).toBe(0);
    expect(BREAKER_RATING_W).toBe(1840);
    expect(rack.tempC).toBe(38.5);
  });

  it('feed A trips on the first breaker check — the drill start', () => {
    const rack = createRack();
    expect(checkBreakers(rack)).toEqual(['A']);
    expect(rack.tripped.A).toBe(true);
    expect(rack.tripped.B).toBe(false);
    // A tripped feed is dark: its devices draw no power and make no heat.
    expect(poweredLoadW(rack)).toBe(0);
    expect(checkBreakers(rack)).toEqual([]);
  });

  it('a reset only holds once the load is under the rating', () => {
    const rack = createRack();
    checkBreakers(rack);
    // Still 2,575 W on A: the reset does not hold.
    expect(resetBreaker(rack, 'A')).toEqual({ ok: false, reason: 'still-overloaded' });
    expect(rack.tripped.A).toBe(true);
    // Split the feeds first: A 1,375 W, B 1,200 W — both under 1,840 W.
    splitFeeds(rack);
    expect(feedDrawW(rack, 'A')).toBe(1375);
    expect(feedDrawW(rack, 'B')).toBe(1200);
    expect(resetBreaker(rack, 'A')).toEqual({ ok: true });
    expect(rack.tripped.A).toBe(false);
    expect(checkBreakers(rack)).toEqual([]);
  });

  it('resetting a breaker that never tripped is a no-op', () => {
    const rack = createRack();
    expect(resetBreaker(rack, 'B')).toEqual({ ok: false, reason: 'not-tripped' });
  });

  it('shedding Server 3 + NAS drops the load to 1,575 W', () => {
    const rack = createRack();
    shedLoad(rack);
    expect(totalDrawW(rack)).toBe(1575);
    const server3 = rack.devices.find((d) => d.id === 'server-3');
    const nas = rack.devices.find((d) => d.id === 'nas');
    expect(server3.powered).toBe(false);
    expect(nas.powered).toBe(false);
  });

  it('moving everything to feed B trips B instead of A', () => {
    const rack = createRack();
    moveAllToFeed(rack, 'B');
    expect(checkBreakers(rack)).toEqual(['B']);
    expect(rack.tripped.B).toBe(true);
  });

  it('per-device feed and power controls move the load', () => {
    const rack = createRack();
    setDeviceFeed(rack, 'server-1', 'B');
    expect(feedDrawW(rack, 'A')).toBe(1975);
    expect(feedDrawW(rack, 'B')).toBe(600);
    setDevicePower(rack, 'server-1', false);
    expect(feedDrawW(rack, 'B')).toBe(0);
    expect(totalDrawW(rack)).toBe(1975);
  });

  it('restore puts the drill back to its start', () => {
    const rack = createRack();
    splitFeeds(rack);
    shedLoad(rack);
    restoreFullPower(rack);
    expect(totalDrawW(rack)).toBe(2575);
    expect(feedDrawW(rack, 'A')).toBe(2575);
    expect(rack.devices.every((d) => d.powered)).toBe(true);
  });

  it('equilibrium temperature is 38.5 C at 2,575 W and 32.4 C at 1,575 W', () => {
    const rack = createRack();
    expect(equilibriumTempC(rack)).toBeCloseTo(38.5, 1);
    shedLoad(rack);
    expect(equilibriumTempC(rack)).toBeCloseTo(32.4, 1);
  });

  it('fans off adds 6 C and messy cabling adds 3 C to the equilibrium', () => {
    const rack = createRack();
    rack.fansOn = false;
    expect(equilibriumTempC(rack)).toBeCloseTo(44.5, 1);
    rack.fansOn = true;
    rack.cablingMessy = true;
    expect(equilibriumTempC(rack)).toBeCloseTo(41.5, 1);
    rack.fansOn = false;
    expect(equilibriumTempC(rack)).toBeCloseTo(47.5, 1);
  });

  it('temperature steps toward equilibrium and never overshoots it', () => {
    const rack = createRack();
    shedLoad(rack);
    const before = rack.tempC;
    stepTemperature(rack, 1);
    expect(rack.tempC).toBeLessThan(before);
    expect(rack.tempC).toBeGreaterThan(32.4);
    for (let i = 0; i < 600; i += 1) stepTemperature(rack, 1);
    expect(rack.tempC).toBeCloseTo(32.4, 1);
  });

  it('breaker headroom is negative while overloaded and names the binding feed', () => {
    const rack = createRack();
    expect(breakerHeadroomW(rack, 'A')).toBe(-735);
    expect(bindingFeed(rack)).toEqual({ feed: 'A', headroomW: -735 });
    splitFeeds(rack);
    expect(bindingFeed(rack)).toEqual({ feed: 'A', headroomW: 465 });
  });

  it('temperature status bands are cool / warm / overheating', () => {
    expect(tempStatus(24)).toBe('cool');
    expect(tempStatus(27)).toBe('cool');
    expect(tempStatus(32.4)).toBe('warm');
    expect(tempStatus(35)).toBe('warm');
    expect(tempStatus(38.5)).toBe('overheating');
  });

  it('the cabinet spec is 42U with the lesson dimensions', () => {
    expect(DEVICES.reduce((sum, d) => sum + d.watts, 0)).toBe(2575);
    // Devices occupy 13U of the 42U cabinet, bottom-up from U1.
    expect(DEVICES.reduce((sum, d) => sum + d.units, 0)).toBe(13);
    expect(Math.max(...DEVICES.map((d) => d.startU + d.units - 1))).toBe(13);
  });

  it('the config panel reports the trip, the headroom and the temperature', () => {
    const rack = createRack();
    checkBreakers(rack);
    const text = rackConfigText(rack);
    expect(text).toContain('feed A breaker 1840 W — load 2575 W — TRIPPED');
    expect(text).toContain('feed B breaker 1840 W — load 0 W — 1840 W headroom');
    expect(text).toContain('38.5 C (overheating)');
  });
});
