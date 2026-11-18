// Rack server simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "Rack Server" (src/components/viz) drives this
// engine for its interactive simulator.
//
// Model (from the it-hardware lesson — real facts only):
// - A 2U server: 88 mm tall, 482 mm wide, 710 mm deep; 1U = 44.45 mm. Same
//   CPU/RAM/storage/motherboard as a desktop, repackaged in a flat 19-inch
//   chassis. Runs virtualization (Proxmox, VMware, Hyper-V), cloud and
//   directory services.
// - 8 hot-swap drive bays: a drive can be pulled and replaced while the
//   server keeps serving; the replacement rebuilds, then comes online.
// - 2 redundant PSUs: one fails, the other carries the whole load. Both
//   fail, the server loses power.
// - Hot-swap fans: a failed fan raises the temperature; at the thermal
//   limit the server shuts itself down to protect the hardware.
// - Management port (iLO / iDRAC / IPMI): out-of-band power and console,
//   so the BMC can power the box on and off even while the OS is down.
//   The BMC itself stays on standby power when the server is off.

export const DRIVE_BAYS = 8;
export const PSU_COUNT = 2;
export const FAN_COUNT = 4;
/** Simulated rebuild time for a replacement drive. */
export const REBUILD_MS = 20_000;
/** Simulated OS boot time after power-on. */
export const BOOT_MS = 6_000;
/** Temperature at which the server shuts down to protect itself. */
export const THERMAL_LIMIT_C = 85;
/** Watts the BMC draws on standby while the server is off. */
export const STANDBY_W = 10;
export const AMBIENT_C = 24;

export const DRIVE_STATUSES = ['online', 'failed', 'rebuilding', 'empty'];

/** A fresh 2U server: powered on, OS up, all 8 drives online. */
export function createRackServer() {
  return {
    power: 'on',
    os: 'up',
    bootMs: 0,
    /** Workload 0–100: drives power draw, heat and requests served. */
    load: 45,
    drives: Array.from({ length: DRIVE_BAYS }, (_, i) => ({
      id: `bay-${i + 1}`,
      bay: i + 1,
      status: 'online',
      rebuildMs: 0,
    })),
    psus: Array.from({ length: PSU_COUNT }, (_, i) => ({
      id: `psu-${i + 1}`,
      label: `PSU ${i + 1}`,
      status: 'ok',
    })),
    fans: Array.from({ length: FAN_COUNT }, (_, i) => ({
      id: `fan-${i + 1}`,
      label: `Fan ${i + 1}`,
      status: 'ok',
    })),
    tempC: 41,
    served: 0,
  };
}

function count(drives, status) {
  return drives.filter((d) => d.status === status).length;
}

export function onlineDrives(state) {
  return count(state.drives, 'online');
}

export function failedDrives(state) {
  return count(state.drives, 'failed');
}

export function workingPsus(state) {
  return state.psus.filter((p) => p.status === 'ok').length;
}

export function workingFans(state) {
  return state.fans.filter((f) => f.status === 'ok').length;
}

/**
 * Power draw in watts. A running server draws a base load plus load,
 * online drives and rebuilding drives (a rebuild spins the disk hard);
 * a failed fan makes the survivors spin faster. Off means BMC standby only.
 */
export function powerDrawW(state) {
  if (state.power !== 'on') return STANDBY_W;
  const base = 110;
  const loadW = state.load * 2.4;
  const driveW = onlineDrives(state) * 7 + count(state.drives, 'rebuilding') * 12;
  const fanW = (FAN_COUNT - workingFans(state)) * 5;
  return Math.round(base + loadW + driveW + fanW);
}

/** Target temperature for the current load and cooling state. */
export function targetTempC(state) {
  if (state.power !== 'on') return AMBIENT_C;
  return 30 + state.load * 0.32 + (FAN_COUNT - workingFans(state)) * 9 + (workingPsus(state) === 1 ? 3 : 0);
}

/** Degrees of thermal headroom before the shutdown limit. */
export function thermalHeadroomC(state) {
  return Math.round(THERMAL_LIMIT_C - state.tempC);
}

/** Overall health: off / healthy / degraded / critical. */
export function healthStatus(state) {
  if (state.power !== 'on') return 'off';
  if (failedDrives(state) > 0 || state.tempC >= 75) return 'critical';
  if (
    workingPsus(state) < PSU_COUNT
    || workingFans(state) < FAN_COUNT
    || count(state.drives, 'rebuilding') > 0
  ) return 'degraded';
  return 'healthy';
}

/**
 * Advance the simulation by dtMs. Boot finishes, rebuilds complete, the
 * temperature drifts toward its target, and the OS serves requests while
 * it is up. Returns the event strings raised by this tick.
 */
export function tick(state, dtMs) {
  const events = [];
  if (state.power === 'on') {
    if (state.os === 'booting') {
      state.bootMs += dtMs;
      if (state.bootMs >= BOOT_MS) {
        state.os = 'up';
        state.bootMs = 0;
        events.push('OS is up — services are serving again.');
      }
    }
    for (const drive of state.drives) {
      if (drive.status === 'rebuilding') {
        drive.rebuildMs += dtMs;
        if (drive.rebuildMs >= REBUILD_MS) {
          drive.status = 'online';
          drive.rebuildMs = 0;
          events.push(`Drive in bay ${drive.bay} finished rebuilding and is online.`);
        }
      }
    }
    if (state.os === 'up') {
      state.served += Math.round((state.load / 100) * (dtMs / 1000) * 12);
    }
  }
  // Temperature drifts toward its target, about 1.2 °C per second.
  const target = targetTempC(state);
  const step = (1.2 * dtMs) / 1000;
  if (state.tempC < target) state.tempC = Math.min(target, state.tempC + step);
  else if (state.tempC > target) state.tempC = Math.max(target, state.tempC - step);
  state.tempC = Math.round(state.tempC * 10) / 10;
  if (state.power === 'on' && state.tempC >= THERMAL_LIMIT_C) {
    state.power = 'off';
    state.os = 'down';
    state.bootMs = 0;
    events.push(`Thermal shutdown at ${state.tempC} °C — the server cut power to protect itself.`);
  }
  return events;
}

/** A drive fails in its bay. No-op (null) unless it was online. */
export function failDrive(state, bayIndex) {
  const drive = state.drives[bayIndex];
  if (!drive || drive.status !== 'online') return null;
  drive.status = 'failed';
  return `Drive in bay ${drive.bay} FAILED — replace it without shutting down.`;
}

/** Pull a drive out of its bay (hot-swap, while serving). */
export function pullDrive(state, bayIndex) {
  const drive = state.drives[bayIndex];
  if (!drive || drive.status === 'empty') return null;
  drive.status = 'empty';
  drive.rebuildMs = 0;
  return `Drive pulled from bay ${drive.bay} — the server keeps serving.`;
}

/** Insert a replacement drive; it starts rebuilding. */
export function insertDrive(state, bayIndex) {
  const drive = state.drives[bayIndex];
  if (!drive || drive.status !== 'empty') return null;
  drive.status = 'rebuilding';
  drive.rebuildMs = 0;
  return `Replacement drive inserted in bay ${drive.bay} — rebuild started.`;
}

/**
 * A PSU fails. The redundant PSU carries the load — unless it was the
 * last one, in which case the server loses power immediately.
 */
export function failPsu(state, psuIndex) {
  const psu = state.psus[psuIndex];
  if (!psu || psu.status !== 'ok') return null;
  psu.status = 'failed';
  if (workingPsus(state) === 0) {
    state.power = 'off';
    state.os = 'down';
    state.bootMs = 0;
    return `${psu.label} failed — no PSU left. The server lost power.`;
  }
  return `${psu.label} FAILED — the redundant PSU carries the full load.`;
}

/** Swap a failed PSU for a good one; redundancy is restored. */
export function replacePsu(state, psuIndex) {
  const psu = state.psus[psuIndex];
  if (!psu || psu.status !== 'failed') return null;
  psu.status = 'ok';
  return `${psu.label} replaced — power redundancy restored.`;
}

/** A fan fails; cooling drops and the temperature target climbs. */
export function failFan(state, fanIndex) {
  const fan = state.fans[fanIndex];
  if (!fan || fan.status !== 'ok') return null;
  fan.status = 'failed';
  return `${fan.label} FAILED — hot-swap it; the remaining fans spin up.`;
}

/** Swap a failed fan for a good one. */
export function replaceFan(state, fanIndex) {
  const fan = state.fans[fanIndex];
  if (!fan || fan.status !== 'failed') return null;
  fan.status = 'ok';
  return `${fan.label} replaced — cooling restored.`;
}

/**
 * Out-of-band power-on via the BMC (iLO / iDRAC / IPMI). Works even while
 * the OS is down — that is the point of the management port. Refused when
 * no PSU is working.
 */
export function bmcPowerOn(state) {
  if (state.power === 'on') return null;
  if (workingPsus(state) === 0) return 'BMC: power-on refused — no working PSU.';
  state.power = 'on';
  state.os = 'booting';
  state.bootMs = 0;
  return 'BMC: power on — the OS is booting (out-of-band, no OS needed).';
}

/** Out-of-band power-off via the BMC. */
export function bmcPowerOff(state) {
  if (state.power !== 'on') return null;
  state.power = 'off';
  state.os = 'down';
  state.bootMs = 0;
  return 'BMC: power off — the server is down; the BMC stays on standby.';
}

/** Restart the OS (a boot cycle) while the power stays on. */
export function restartOs(state) {
  if (state.power !== 'on' || state.os === 'booting') return null;
  state.os = 'booting';
  state.bootMs = 0;
  return 'OS restarting — power stays on, services come back after boot.';
}

/** The BMC management console text — the panel the subject shows.
 * Lines stay short (the panel sits under the 232 px rail) so they do not
 * wrap; the drives line names any bay that is not online. */
export function bmcConsole(state) {
  const nonOnline = state.drives.filter((d) => d.status !== 'online');
  const drivesLine = nonOnline.length === 0
    ? `drives: ${DRIVE_BAYS} online`
    : `drives: ${onlineDrives(state)} online · ${nonOnline.map((d) => `bay ${d.bay} ${d.status}`).join(' · ')}`;
  const lines = [
    'iLO / iDRAC / IPMI',
    `power: ${state.power} · os: ${state.os}`,
    `health: ${healthStatus(state)}`,
    `temp: ${state.tempC.toFixed(1)} °C · ${powerDrawW(state)} W`,
    `psu: ${state.psus.map((p) => `${p.label.replace('PSU ', '')} ${p.status}`).join(' · ')}`,
    `fans: ${state.fans.map((f) => f.status).join(' ')}`,
    drivesLine,
    `served: ${state.served} · load: ${state.load}%`,
  ];
  return lines.join('\n');
}
