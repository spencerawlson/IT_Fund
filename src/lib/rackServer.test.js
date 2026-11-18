import { describe, it, expect } from 'vitest';
import {
  DRIVE_BAYS,
  PSU_COUNT,
  FAN_COUNT,
  REBUILD_MS,
  BOOT_MS,
  THERMAL_LIMIT_C,
  STANDBY_W,
  createRackServer,
  onlineDrives,
  workingPsus,
  workingFans,
  powerDrawW,
  targetTempC,
  thermalHeadroomC,
  healthStatus,
  tick,
  failDrive,
  pullDrive,
  insertDrive,
  failPsu,
  replacePsu,
  failFan,
  replaceFan,
  bmcPowerOn,
  bmcPowerOff,
  restartOs,
  bmcConsole,
} from './rackServer';

describe('rack server engine', () => {
  it('starts powered on with the OS up, 8 drives online, 2 PSUs and 4 fans', () => {
    const state = createRackServer();
    expect(state.power).toBe('on');
    expect(state.os).toBe('up');
    expect(state.drives).toHaveLength(DRIVE_BAYS);
    expect(onlineDrives(state)).toBe(8);
    expect(state.psus).toHaveLength(PSU_COUNT);
    expect(workingPsus(state)).toBe(2);
    expect(state.fans).toHaveLength(FAN_COUNT);
    expect(workingFans(state)).toBe(4);
    expect(healthStatus(state)).toBe('healthy');
  });

  it('hot-swap: a failed drive pulls out and its replacement rebuilds to online', () => {
    const state = createRackServer();
    expect(failDrive(state, 2)).toContain('FAILED');
    expect(state.drives[2].status).toBe('failed');
    expect(healthStatus(state)).toBe('critical');
    expect(pullDrive(state, 2)).toContain('keeps serving');
    expect(state.drives[2].status).toBe('empty');
    expect(insertDrive(state, 2)).toContain('rebuild started');
    expect(state.drives[2].status).toBe('rebuilding');
    expect(healthStatus(state)).toBe('degraded');
    // Halfway through the rebuild it is still rebuilding.
    expect(tick(state, REBUILD_MS / 2)).toEqual([]);
    expect(state.drives[2].status).toBe('rebuilding');
    const events = tick(state, REBUILD_MS / 2);
    expect(state.drives[2].status).toBe('online');
    expect(events.join(' ')).toContain('finished rebuilding');
    expect(healthStatus(state)).toBe('healthy');
    // Serving never stopped: requests were served throughout.
    expect(state.served).toBeGreaterThan(0);
  });

  it('failing a drive that is not online is a no-op', () => {
    const state = createRackServer();
    pullDrive(state, 0);
    expect(failDrive(state, 0)).toBeNull();
    expect(insertDrive(state, 1)).toBeNull();
    expect(pullDrive(state, 0)).toBeNull();
  });

  it('one PSU failure is carried by the redundant PSU; the second kills power', () => {
    const state = createRackServer();
    expect(failPsu(state, 0)).toContain('redundant PSU carries');
    expect(workingPsus(state)).toBe(1);
    expect(state.power).toBe('on');
    expect(state.os).toBe('up');
    expect(healthStatus(state)).toBe('degraded');
    expect(failPsu(state, 1)).toContain('lost power');
    expect(state.power).toBe('off');
    expect(state.os).toBe('down');
    expect(healthStatus(state)).toBe('off');
  });

  it('replacing the failed PSU restores redundancy', () => {
    const state = createRackServer();
    failPsu(state, 1);
    expect(replacePsu(state, 1)).toContain('redundancy restored');
    expect(workingPsus(state)).toBe(2);
    expect(healthStatus(state)).toBe('healthy');
    expect(replacePsu(state, 1)).toBeNull();
  });

  it('the BMC can power the server on while the OS is down, and refuses with no PSU', () => {
    const state = createRackServer();
    expect(bmcPowerOff(state)).toContain('BMC: power off');
    expect(state.power).toBe('off');
    expect(state.os).toBe('down');
    expect(powerDrawW(state)).toBe(STANDBY_W);
    expect(bmcPowerOn(state)).toContain('out-of-band');
    expect(state.power).toBe('on');
    expect(state.os).toBe('booting');
    expect(tick(state, BOOT_MS)).toContain('OS is up — services are serving again.');
    expect(state.os).toBe('up');

    const dead = createRackServer();
    failPsu(dead, 0);
    failPsu(dead, 1);
    expect(bmcPowerOn(dead)).toContain('no working PSU');
    expect(dead.power).toBe('off');
    replacePsu(dead, 0);
    expect(bmcPowerOn(dead)).toContain('power on');
  });

  it('restarting the OS boots again while the power stays on', () => {
    const state = createRackServer();
    expect(restartOs(state)).toContain('restarting');
    expect(state.power).toBe('on');
    expect(state.os).toBe('booting');
    expect(restartOs(state)).toBeNull();
    tick(state, BOOT_MS);
    expect(state.os).toBe('up');
  });

  it('a failed fan raises the temperature target; all fans failed trips the thermal limit', () => {
    const state = createRackServer();
    const cool = targetTempC(state);
    failFan(state, 0);
    expect(targetTempC(state)).toBeGreaterThan(cool);
    expect(healthStatus(state)).toBe('degraded');
    expect(replaceFan(state, 0)).toContain('cooling restored');
    expect(targetTempC(state)).toBe(cool);

    const hot = createRackServer();
    hot.load = 100;
    for (let i = 0; i < FAN_COUNT; i += 1) failFan(hot, i);
    expect(targetTempC(hot)).toBeGreaterThan(THERMAL_LIMIT_C);
    const events = tick(hot, 60_000);
    expect(hot.power).toBe('off');
    expect(hot.os).toBe('down');
    expect(events.join(' ')).toContain('Thermal shutdown');
  });

  it('power draw grows with load and drives, and thermal headroom shrinks as it heats up', () => {
    const idle = createRackServer();
    idle.load = 0;
    const busy = createRackServer();
    busy.load = 100;
    expect(powerDrawW(busy)).toBeGreaterThan(powerDrawW(idle));
    expect(thermalHeadroomC(idle)).toBeGreaterThan(0);
    const hot = createRackServer();
    hot.tempC = 80;
    expect(thermalHeadroomC(hot)).toBe(5);
  });

  it('the BMC console names power, OS, PSUs, fans and drives', () => {
    const state = createRackServer();
    failPsu(state, 0);
    failDrive(state, 2);
    const consoleText = bmcConsole(state);
    expect(consoleText).toContain('power: on');
    expect(consoleText).toContain('os: up');
    expect(consoleText).toContain('psu: 1 failed · 2 ok');
    expect(consoleText).toContain('fans: ok ok ok ok');
    expect(consoleText).toContain('bay 3 failed');
    expect(bmcConsole(createRackServer())).toContain('drives: 8 online');
    // Every line is short enough to fit the 232 px rail without wrapping.
    for (const line of bmcConsole(state).split('\n')) {
      expect(line.length).toBeLessThanOrEqual(32);
    }
  });
});
