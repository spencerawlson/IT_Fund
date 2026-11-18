import { describe, it, expect } from 'vitest';
import {
  RATED_VA,
  RATED_WATTS,
  POWER_FACTOR,
  MODULE_VA,
  SHUTDOWN_BATTERY_PCT,
  TOPOLOGIES,
  transferTimeMs,
  sineWave,
  createUps,
  createServers,
  loadVa,
  loadPercent,
  loadWatts,
  activeModules,
  activeCapacityVa,
  isOverloaded,
  powerSource,
  runtimeMinutes,
  trySetExtraLoad,
  failModule,
  restoreModule,
  toggleServer,
  restartServers,
  hotSwapBattery,
  triggerEpo,
  stepUps,
  upsConf,
} from './ups';

describe('UPS engine', () => {
  it('starts at the lesson LCD example: 32% load, 58 min runtime', () => {
    const ups = createUps();
    expect(loadVa(ups)).toBe(720);
    expect(loadPercent(ups)).toBe(32);
    expect(runtimeMinutes(ups)).toBe(58);
    expect(ups.batteryPct).toBe(100);
    expect(powerSource(ups)).toBe('mains');
  });

  it('runtime shrinks as load rises — doubling the load roughly halves it', () => {
    const ups = createUps();
    expect(runtimeMinutes(ups)).toBe(58);
    expect(trySetExtraLoad(ups, 405)).toBe(true); // 720 + 405 = 1125 VA = 50%
    expect(loadPercent(ups)).toBe(50);
    expect(runtimeMinutes(ups)).toBe(37);
    expect(trySetExtraLoad(ups, 1530)).toBe(true); // 720 + 1530 = 2250 VA = 100%
    expect(loadPercent(ups)).toBe(100);
    expect(runtimeMinutes(ups)).toBe(18);
  });

  it('runtime follows the charge: half a battery is half the runtime', () => {
    const ups = createUps();
    ups.batteryPct = 50;
    expect(runtimeMinutes(ups)).toBe(29);
    ups.batteryPct = 0;
    expect(runtimeMinutes(ups)).toBe(0);
  });

  it('runtime is infinite when nothing draws power', () => {
    const ups = createUps();
    for (const server of ups.servers) server.on = false;
    expect(loadVa(ups)).toBe(0);
    expect(runtimeMinutes(ups)).toBe(Infinity);
  });

  it('VA vs watts uses the 0.8 power factor', () => {
    expect(POWER_FACTOR).toBe(0.8);
    expect(RATED_WATTS).toBe(1800);
    const ups = createUps();
    expect(loadWatts(ups)).toBe(576); // 720 VA x 0.8
  });

  it('transfer time: online is 0 ms, line-interactive is short, standby is longest', () => {
    expect(transferTimeMs('online')).toBe(0);
    expect(transferTimeMs('line-interactive')).toBeGreaterThan(0);
    expect(transferTimeMs('standby')).toBeGreaterThan(transferTimeMs('line-interactive'));
    expect(TOPOLOGIES).toHaveLength(3);
  });

  it('online is pure sine; standby is simulated sine', () => {
    expect(sineWave('online')).toBe('Pure sine wave');
    expect(sineWave('line-interactive')).toBe('Pure sine wave');
    expect(sineWave('standby')).toBe('Simulated sine wave');
  });

  it('overload past the 2,250 VA rating is blocked, not applied', () => {
    const ups = createUps();
    // 720 + 1700 = 2420 VA — past the rating.
    expect(trySetExtraLoad(ups, 1700)).toBe(false);
    expect(ups.extraLoadVa).toBe(0);
    expect(loadVa(ups)).toBe(720);
    // Exactly at the rating is allowed.
    expect(trySetExtraLoad(ups, 1530)).toBe(true);
    expect(loadVa(ups)).toBe(RATED_VA);
  });

  it('the battery drains on mains failure, in proportion to the load', () => {
    const ups = createUps();
    ups.mains = false;
    // 60 sim-seconds at 720 VA: 720/41760 of the charge per minute.
    stepUps(ups, 60);
    expect(ups.batteryPct).toBeCloseTo(100 - (720 / 41760) * 100, 6);
    // Double the load drains twice as fast over the same minute.
    const heavy = createUps();
    trySetExtraLoad(heavy, 1530);
    heavy.mains = false;
    stepUps(heavy, 60);
    expect(heavy.batteryPct).toBeCloseTo(100 - (2250 / 41760) * 100, 6);
  });

  it('on mains or generator power the battery recharges instead of draining', () => {
    const ups = createUps();
    ups.batteryPct = 50;
    stepUps(ups, 60);
    expect(ups.batteryPct).toBeGreaterThan(50);
    expect(ups.batteryPct).toBeLessThanOrEqual(100);
    const onGenerator = createUps();
    onGenerator.mains = false;
    onGenerator.generator = true;
    onGenerator.batteryPct = 50;
    stepUps(onGenerator, 60);
    expect(onGenerator.batteryPct).toBeGreaterThan(50);
    expect(powerSource(onGenerator)).toBe('generator');
  });

  it('graceful shutdown starts at 20% battery and powers servers off one by one', () => {
    const ups = createUps();
    ups.mains = false;
    ups.batteryPct = SHUTDOWN_BATTERY_PCT;
    const events = stepUps(ups, 1);
    expect(ups.shuttingDown).toBe(true);
    expect(events.join(' ')).toMatch(/graceful shutdown started/i);
    // Each 30 sim-seconds powers off one more server.
    stepUps(ups, 30);
    expect(ups.servers.filter((s) => s.on)).toHaveLength(6);
    stepUps(ups, 30 * 6);
    expect(ups.servers.every((s) => !s.on)).toBe(true);
    expect(ups.shutdownComplete).toBe(true);
    // The battery is preserved once the load is gone — it stops falling.
    const preserved = ups.batteryPct;
    expect(preserved).toBeGreaterThan(0);
    expect(preserved).toBeLessThanOrEqual(SHUTDOWN_BATTERY_PCT);
    stepUps(ups, 600);
    expect(ups.batteryPct).toBe(preserved);
  });

  it('a blackout from full charge reaches the shutdown and preserves charge', () => {
    const ups = createUps();
    ups.mains = false;
    let events = [];
    // Drain in 60-sim-second steps until the shutdown completes.
    for (let i = 0; i < 200 && !ups.shutdownComplete; i += 1) {
      events = [...events, ...stepUps(ups, 60)];
    }
    expect(ups.shutdownComplete).toBe(true);
    expect(ups.servers.every((s) => !s.on)).toBe(true);
    expect(ups.batteryPct).toBeGreaterThan(0);
    expect(events.join(' ')).toMatch(/battery preserved at/i);
  });

  it('power restored mid-shutdown aborts it; servers already off stay off', () => {
    const ups = createUps();
    ups.mains = false;
    ups.batteryPct = SHUTDOWN_BATTERY_PCT;
    stepUps(ups, 1);
    stepUps(ups, 30);
    expect(ups.servers.filter((s) => s.on)).toHaveLength(6);
    ups.mains = true;
    const events = stepUps(ups, 1);
    expect(ups.shuttingDown).toBe(false);
    expect(ups.servers.filter((s) => s.on)).toHaveLength(6);
    expect(events.join(' ')).toMatch(/aborted/i);
  });

  it('N+1: losing one module at 32% load changes nothing; the survivor carries it', () => {
    const ups = createUps();
    const event = failModule(ups, 'A');
    expect(activeModules(ups)).toHaveLength(1);
    expect(isOverloaded(ups)).toBe(false);
    expect(powerSource(ups)).toBe('mains');
    expect(event).toMatch(/carries the full 720 VA load/);
    expect(restoreModule(ups, 'A')).toMatch(/N\+1 redundancy back/);
    expect(activeModules(ups)).toHaveLength(2);
  });

  it('N+1: losing one module past 1,500 VA overloads the survivor', () => {
    const ups = createUps();
    expect(trySetExtraLoad(ups, 1080)).toBe(true); // 720 + 1080 = 1800 VA
    expect(activeCapacityVa(ups)).toBe(RATED_VA);
    const event = failModule(ups, 'B');
    expect(activeCapacityVa(ups)).toBe(MODULE_VA);
    expect(isOverloaded(ups)).toBe(true);
    expect(event).toMatch(/OVERLOAD/);
  });

  it('hot-swap restores the runtime to full', () => {
    const ups = createUps();
    ups.batteryPct = 19;
    expect(runtimeMinutes(ups)).toBe(11);
    expect(hotSwapBattery(ups)).toMatch(/runtime restored/);
    expect(ups.batteryPct).toBe(100);
    expect(runtimeMinutes(ups)).toBe(58);
  });

  it('EPO kills everything at once, with no graceful shutdown', () => {
    const ups = createUps();
    const event = triggerEpo(ups);
    expect(event).toMatch(/EMERGENCY POWER OFF/);
    expect(powerSource(ups)).toBe('off');
    expect(ups.servers.every((s) => !s.on)).toBe(true);
    expect(ups.shuttingDown).toBe(false);
    // The battery freezes while the UPS is off.
    ups.batteryPct = 80;
    stepUps(ups, 600);
    expect(ups.batteryPct).toBe(80);
    // No restart or hot-swap while EPO is latched.
    expect(restartServers(ups)).toBeNull();
    expect(hotSwapBattery(ups)).toMatch(/EPO is latched/);
  });

  it('a dead battery with servers on is a hard power loss, not a clean shutdown', () => {
    const ups = createUps();
    ups.mains = false;
    ups.batteryPct = 0.1;
    ups.shuttingDown = false;
    const events = stepUps(ups, 60);
    expect(ups.servers.every((s) => !s.on)).toBe(true);
    expect(ups.shutdownComplete).toBe(false);
    expect(events.join(' ')).toMatch(/Battery exhausted/);
  });

  it('restartServers brings the servers back once power is available', () => {
    const ups = createUps();
    for (const server of ups.servers) server.on = false;
    expect(restartServers(ups)).toMatch(/7 servers restarted/);
    expect(ups.servers.every((s) => s.on)).toBe(true);
    expect(restartServers(ups)).toBeNull();
  });

  it('toggling a server sheds and restores its load', () => {
    const ups = createUps();
    expect(createServers()).toHaveLength(7);
    toggleServer(ups, 'SRV-01');
    expect(loadVa(ups)).toBe(600);
    expect(toggleServer(ups, 'SRV-01')).toMatch(/powered on/);
    expect(loadVa(ups)).toBe(720);
  });

  it('upsConf prints the live setup: topology, transfer, rating, runtime', () => {
    const ups = createUps('standby');
    const conf = upsConf(ups);
    expect(conf).toContain('standby (Offline)');
    expect(conf).toContain('transfer time   10 ms');
    expect(conf).toContain('2,250 VA / 1,800 W');
    expect(conf).toContain('runtime left    58 min');
    expect(conf).toContain('N+1 (2/2 modules up');
    const online = createUps('online');
    expect(upsConf(online)).toContain('transfer time   0 ms');
  });
});
