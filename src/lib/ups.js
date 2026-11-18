// UPS simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "UPS" (src/components/viz) drives this engine for
// its interactive simulator.
//
// Model (from the net-ops lesson, no invented specs):
// - A 2U rack UPS, 1,500–3,000 VA, 8x IEC C13 outlets via a PDU, feeding
//   7 servers. Its LCD example is 32% load / 58 min runtime.
// - Runtime is battery energy divided by load: doubling the load roughly
//   halves the runtime. The runtime buys a graceful shutdown, NOT working
//   through the outage — a generator takes over for a long outage.
// - Topologies: online / double-conversion (always on battery, 0 ms
//   transfer), line-interactive (AVR, short transfer), standby / offline
//   (switches to battery on outage, transfer time in ms).
// - VA vs watts: watts = VA x power factor (0.8 here), so the 2,250 VA
//   rating is 1,800 W.
// - N+1 redundancy: two 1,500 VA modules share the load; losing one leaves
//   the survivor carrying everything, up to its 1,500 VA rating.
// - Graceful shutdown: on battery, when the charge falls to 20% the UPS
//   signals the servers (SNMP) and they power off one by one, cleanly,
//   preserving the remaining charge. EPO is the opposite: it kills power
//   to everything at once, with no clean shutdown.

export const RATED_VA = 2250;
export const POWER_FACTOR = 0.8;
export const RATED_WATTS = Math.round(RATED_VA * POWER_FACTOR);
export const MODULE_VA = 1500;
export const MODULE_COUNT = 2;
/** Battery energy, in VA-minutes: 720 VA (32% load) x 58 min, the LCD example. */
export const BATTERY_ENERGY_VA_MIN = 720 * 58;
/** Graceful shutdown starts when the battery falls to this charge. */
export const SHUTDOWN_BATTERY_PCT = 20;
/** Sim-seconds between one server powering off and the next during shutdown. */
export const SHUTDOWN_STEP_SIM_SECONDS = 30;
/** Battery recharge, in percent per sim-second, on mains or generator. */
export const RECHARGE_PCT_PER_SIM_SECOND = 0.2;
/** Extra load the learner can add on top of the servers (slider max). */
export const MAX_EXTRA_LOAD_VA = 2420;

export const TOPOLOGIES = [
  {
    id: 'online',
    label: 'Online',
    detail: 'Double-conversion',
    transferMs: 0,
    sine: 'Pure sine wave',
    blurb: 'Always on battery — the load runs off the inverter, so a mains failure needs no switchover at all: 0 ms transfer.',
  },
  {
    id: 'line-interactive',
    label: 'Line-interactive',
    detail: 'AVR',
    transferMs: 4,
    sine: 'Pure sine wave',
    blurb: 'An automatic voltage regulator irons out sags and brownouts without touching the battery; on a real outage it switches over in a few ms.',
  },
  {
    id: 'standby',
    label: 'Standby',
    detail: 'Offline',
    transferMs: 10,
    sine: 'Simulated sine wave',
    blurb: 'Sits idle on mains power and only switches to battery when the mains fails — the cheapest topology, with a real transfer gap and a stepped output wave.',
  },
];

export const TOPOLOGY_IDS = TOPOLOGIES.map((t) => t.id);

export function topologyById(id) {
  return TOPOLOGIES.find((t) => t.id === id) || TOPOLOGIES[0];
}

/** Transfer time in ms when the mains fails for this topology. */
export function transferTimeMs(topologyId) {
  return topologyById(topologyId).transferMs;
}

/** Output waveform for this topology. */
export function sineWave(topologyId) {
  return topologyById(topologyId).sine;
}

/** The 7 protected servers and their draw in VA (720 VA total = 32% load). */
export const SERVER_LOADS = [120, 110, 100, 100, 90, 100, 100];

export function createServers() {
  return SERVER_LOADS.map((va, i) => ({
    id: `SRV-${String(i + 1).padStart(2, '0')}`,
    name: `Server ${i + 1}`,
    va,
    on: true,
  }));
}

/** A fresh UPS: online topology, mains up, full battery, both modules up. */
export function createUps(topologyId = 'online') {
  return {
    topology: topologyById(topologyId).id,
    mains: true,
    generator: false,
    epo: false,
    batteryPct: 100,
    extraLoadVa: 0,
    modules: Array.from({ length: MODULE_COUNT }, (_, i) => ({
      id: i === 0 ? 'A' : 'B',
      up: true,
    })),
    servers: createServers(),
    shuttingDown: false,
    shutdownTimer: 0,
    shutdownComplete: false,
  };
}

/** Total load in VA from the servers that are still on, plus extra load. */
export function loadVa(ups) {
  const serversVa = ups.servers.reduce((sum, s) => sum + (s.on ? s.va : 0), 0);
  return serversVa + ups.extraLoadVa;
}

/** Load as a percent of the 2,250 VA rating. */
export function loadPercent(ups) {
  return Math.round((loadVa(ups) / RATED_VA) * 100);
}

/** Load in watts (VA x power factor). */
export function loadWatts(ups) {
  return Math.round(loadVa(ups) * POWER_FACTOR);
}

export function activeModules(ups) {
  return ups.modules.filter((m) => m.up);
}

/** What the surviving modules can carry: 1,500 VA each, capped at the rating. */
export function activeCapacityVa(ups) {
  return Math.min(RATED_VA, activeModules(ups).length * MODULE_VA);
}

/** True when the load exceeds what the up modules can carry. */
export function isOverloaded(ups) {
  return loadVa(ups) > activeCapacityVa(ups);
}

/** Where the load is powered from right now. */
export function powerSource(ups) {
  if (ups.epo) return 'off';
  if (ups.mains) return 'mains';
  if (ups.generator) return 'generator';
  return 'battery';
}

/**
 * Runtime remaining in whole minutes at the current load and charge:
 * battery energy left divided by load. Infinity when nothing draws power.
 */
export function runtimeMinutes(ups) {
  const va = loadVa(ups);
  if (va <= 0) return Infinity;
  const energyLeft = (ups.batteryPct / 100) * BATTERY_ENERGY_VA_MIN;
  return Math.floor(energyLeft / va);
}

/**
 * Set the extra load (VA) the learner adds on top of the servers.
 * Returns false — and leaves the load unchanged — when the total would
 * pass the 2,250 VA rating (the overload is blocked, not applied).
 */
export function trySetExtraLoad(ups, va) {
  const clamped = Math.max(0, Math.round(va));
  const serversVa = ups.servers.reduce((sum, s) => sum + (s.on ? s.va : 0), 0);
  if (serversVa + clamped > RATED_VA) return false;
  ups.extraLoadVa = clamped;
  return true;
}

/** Take a UPS module down (the N+1 drill). Returns an event line, or null. */
export function failModule(ups, moduleId) {
  const module = ups.modules.find((m) => m.id === moduleId);
  if (!module || !module.up) return null;
  module.up = false;
  if (isOverloaded(ups)) {
    return `Module ${moduleId} FAILED — the surviving module can only carry ${MODULE_VA.toLocaleString('en-US')} VA, but the load is ${loadVa(ups).toLocaleString('en-US')} VA. OVERLOAD — shed load now.`;
  }
  return `Module ${moduleId} failed — module ${activeModules(ups).map((m) => m.id).join('')} carries the full ${loadVa(ups).toLocaleString('en-US')} VA load (N+1).`;
}

/** Bring a failed module back. Returns an event line, or null. */
export function restoreModule(ups, moduleId) {
  const module = ups.modules.find((m) => m.id === moduleId);
  if (!module || module.up) return null;
  module.up = true;
  return `Module ${moduleId} restored — N+1 redundancy back in place.`;
}

/**
 * Switch one server on or off by hand. Returns an event line, or null when
 * nothing changed. A server cannot be powered on while the UPS is off (EPO).
 */
export function toggleServer(ups, serverId) {
  const server = ups.servers.find((s) => s.id === serverId);
  if (!server) return null;
  if (!server.on && (ups.epo || ups.batteryPct <= 0)) {
    return `${server.name} cannot start — the UPS is off.`;
  }
  server.on = !server.on;
  if (!server.on) return `${server.name} powered off by hand (${server.va} VA shed).`;
  return `${server.name} powered on (${server.va} VA).`;
}

/** Power every off server back on. Returns an event line, or null. */
export function restartServers(ups) {
  if (ups.epo) return null;
  const off = ups.servers.filter((s) => !s.on);
  if (off.length === 0) return null;
  for (const server of off) server.on = true;
  ups.shutdownComplete = false;
  return `${off.length} server${off.length === 1 ? '' : 's'} restarted on ${powerSource(ups)} power.`;
}

/**
 * Hot-swap the battery module: a fresh module restores the runtime.
 * Returns an event line; blocked while EPO is latched.
 */
export function hotSwapBattery(ups) {
  if (ups.epo) return 'EPO is latched — reset the UPS before hot-swapping the battery.';
  ups.batteryPct = 100;
  return 'Battery module hot-swapped — runtime restored to full.';
}

/**
 * Emergency power off: kills power to everything at once, with no clean
 * shutdown. Returns an event line.
 */
export function triggerEpo(ups) {
  if (ups.epo) return null;
  ups.epo = true;
  ups.mains = false;
  ups.generator = false;
  ups.shuttingDown = false;
  ups.shutdownTimer = 0;
  for (const server of ups.servers) server.on = false;
  return 'EMERGENCY POWER OFF — power cut to everything at once. No graceful shutdown: check the servers before restarting.';
}

/**
 * Advance the simulation by `simSeconds` of simulated time. Mutates `ups`
 * (like the load balancer engine mutates its sim) and returns the event
 * lines that happened during the step, so the caller can log them.
 */
export function stepUps(ups, simSeconds) {
  const events = [];
  if (ups.epo || simSeconds <= 0) return events;
  const source = powerSource(ups);

  if (source === 'mains' || source === 'generator') {
    // On mains or generator power the battery recharges; a shutdown in
    // progress is aborted (servers already off stay off until restarted).
    if (ups.shuttingDown) {
      const stillOff = ups.servers.filter((s) => !s.on).length;
      ups.shuttingDown = false;
      ups.shutdownTimer = 0;
      events.push(`Power restored (${source}) — graceful shutdown aborted with ${stillOff} server${stillOff === 1 ? '' : 's'} still off. Restart them by hand.`);
    }
    if (ups.batteryPct < 100) {
      ups.batteryPct = Math.min(100, ups.batteryPct + RECHARGE_PCT_PER_SIM_SECOND * simSeconds);
    }
    return events;
  }

  // On battery: the charge drains in proportion to the load.
  const va = loadVa(ups);
  if (va > 0) {
    const drainPct = (va / BATTERY_ENERGY_VA_MIN) * 100 * (simSeconds / 60);
    ups.batteryPct = Math.max(0, ups.batteryPct - drainPct);
  }

  if (ups.batteryPct <= 0) {
    const stillOn = ups.servers.filter((s) => s.on);
    if (stillOn.length > 0) {
      for (const server of stillOn) server.on = false;
      ups.shuttingDown = false;
      events.push('Battery exhausted — the servers lost power with no clean shutdown. That is the outage the runtime is meant to prevent.');
    }
    return events;
  }

  if (!ups.shuttingDown && ups.batteryPct <= SHUTDOWN_BATTERY_PCT && ups.servers.some((s) => s.on)) {
    ups.shuttingDown = true;
    ups.shutdownTimer = 0;
    events.push(`Battery at ${Math.round(ups.batteryPct)}% — graceful shutdown started: the UPS is signalling the servers to power off cleanly, one by one.`);
  }

  if (ups.shuttingDown) {
    ups.shutdownTimer += simSeconds;
    while (ups.shutdownTimer >= SHUTDOWN_STEP_SIM_SECONDS) {
      const next = ups.servers.find((s) => s.on);
      if (!next) break;
      ups.shutdownTimer -= SHUTDOWN_STEP_SIM_SECONDS;
      next.on = false;
      events.push(`Graceful shutdown: ${next.name} powered off cleanly.`);
    }
    if (!ups.servers.some((s) => s.on)) {
      ups.shuttingDown = false;
      ups.shutdownComplete = true;
      events.push(`All ${ups.servers.length} servers shut down cleanly — battery preserved at ${Math.round(ups.batteryPct)}%.`);
    }
  }
  return events;
}

/** The live UPS config for the current setup — the panel the subject shows. */
export function upsConf(ups) {
  const topology = topologyById(ups.topology);
  const runtime = runtimeMinutes(ups);
  const lines = [
    '# UPS — 2U rackmount, 8 x IEC C13 outlets via PDU',
    `topology        ${topology.id} (${topology.detail})`,
    `transfer time   ${topology.transferMs} ms`,
    `output waveform ${topology.sine}`,
    `rating          ${RATED_VA.toLocaleString('en-US')} VA / ${RATED_WATTS.toLocaleString('en-US')} W (PF ${POWER_FACTOR})`,
    `battery         VRLA 12 V modules, hot-swappable (LiFePO4 option)`,
    `load            ${loadVa(ups).toLocaleString('en-US')} VA (${loadPercent(ups)}%) — ${loadWatts(ups).toLocaleString('en-US')} W`,
    `runtime left    ${runtime === Infinity ? '—' : `${runtime} min`} at current load`,
    `redundancy      N+1 (${activeModules(ups).length}/${MODULE_COUNT} modules up, ${MODULE_VA.toLocaleString('en-US')} VA each)`,
    `power source    ${powerSource(ups)}`,
  ];
  return lines.join('\n');
}
