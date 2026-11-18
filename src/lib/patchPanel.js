// Patch panel simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "Patch Panel" (src/components/viz) drives this
// engine for its interactive simulator.
//
// Model (from the net-devices-media lesson — real facts only):
// - A patch panel is the permanent end of every copper run: the horizontal
//   cable is punched down once on the rear 110 blocks and never moves.
//   The front shows 48 numbered RJ45 ports; short patch cords connect a
//   port to the switch. Moving a device means moving one patch cord.
// - T568A and T568B differ only in which pair is green vs orange — pick
//   one standard everywhere. A run terminated T568A at one end and T568B
//   at the other is a crossover and FAILS the link test until one end is
//   re-terminated to match the other.
// - Copper runs max out at 100 m. Cat 6 carries 10 Gbps only to ~55 m;
//   Cat 6a carries 10 Gbps the full 100 m; Cat 5e does not do 10 Gbps.

export const COPPER_MAX_M = 100;
export const CAT6_10G_MAX_M = 55;
export const PORT_COUNT = 48;
export const SWITCH_PORT_COUNT = 24;

export const STANDARDS = ['T568A', 'T568B'];
export const CATEGORIES = ['Cat5e', 'Cat6', 'Cat6a'];
export const SPEEDS = [1, 10];

/** Pin order (pins 1–8) for each wiring standard. Only the green and
 * orange pairs swap places; blue and brown stay put. */
export const PINOUTS = {
  T568A: ['white/green', 'green', 'white/orange', 'blue', 'white/blue', 'orange', 'white/brown', 'brown'],
  T568B: ['white/orange', 'orange', 'white/green', 'blue', 'white/blue', 'green', 'white/brown', 'brown'],
};

/** The 8-pin colour order for a standard. */
export function pinout(standard) {
  return [...(PINOUTS[standard] || PINOUTS.T568B)];
}

/** The longest a run of this cable may be at this speed, in metres.
 * Returns 0 when the cable cannot carry the speed at all. */
export function maxLengthM(category, speedGbps) {
  if (speedGbps <= 1) return COPPER_MAX_M;
  if (category === 'Cat6a') return COPPER_MAX_M;
  if (category === 'Cat6') return CAT6_10G_MAX_M;
  return 0;
}

/** One copper run: a device at the wall outlet, a horizontal cable, and
 * the panel port it lands on. `switchPort` is the switch port its patch
 * cord lands on, or null when the run is not patched in. */
export function createRun({
  port,
  device,
  category = 'Cat6',
  lengthM = 30,
  speedGbps = 1,
  outletStandard = 'T568B',
  panelStandard = 'T568B',
  switchPort = null,
}) {
  return { port, device, category, lengthM, speedGbps, outletStandard, panelStandard, switchPort };
}

/** The panel as it ships: eight runs, two of them broken on purpose —
 * one mixed-standard crossover, one Cat 6 run too long for 10 Gbps —
 * and one run left unpatched. */
export function createRuns() {
  return [
    createRun({ port: 1, device: 'Reception PC', category: 'Cat6', lengthM: 42, speedGbps: 1, outletStandard: 'T568A', panelStandard: 'T568A', switchPort: 1 }),
    createRun({ port: 2, device: 'Workstation 07', category: 'Cat6', lengthM: 68, speedGbps: 1, outletStandard: 'T568B', panelStandard: 'T568B', switchPort: 2 }),
    createRun({ port: 3, device: 'IP Phone — Office', category: 'Cat5e', lengthM: 55, speedGbps: 1, outletStandard: 'T568B', panelStandard: 'T568B', switchPort: 3 }),
    createRun({ port: 4, device: 'Access Point — Floor 2', category: 'Cat6a', lengthM: 88, speedGbps: 10, outletStandard: 'T568B', panelStandard: 'T568B', switchPort: 4 }),
    createRun({ port: 5, device: 'File Server', category: 'Cat6', lengthM: 72, speedGbps: 10, outletStandard: 'T568B', panelStandard: 'T568B', switchPort: 5 }),
    createRun({ port: 6, device: 'Printer — Office', category: 'Cat6', lengthM: 30, speedGbps: 1, outletStandard: 'T568A', panelStandard: 'T568B', switchPort: 6 }),
    createRun({ port: 7, device: 'Camera — Lobby', category: 'Cat6', lengthM: 24, speedGbps: 1, outletStandard: 'T568B', panelStandard: 'T568B', switchPort: null }),
    createRun({ port: 8, device: 'Workstation 12', category: 'Cat5e', lengthM: 18, speedGbps: 1, outletStandard: 'T568B', panelStandard: 'T568B', switchPort: 8 }),
  ];
}

/** Length check only: is this run within its cable/speed limit? */
export function checkRunLength(run) {
  const limitM = maxLengthM(run.category, run.speedGbps);
  if (limitM === 0) {
    return { ok: false, limitM, reason: `${run.category} cannot carry ${run.speedGbps} Gbps` };
  }
  if (run.lengthM > limitM) {
    return { ok: false, limitM, reason: `${run.lengthM} m exceeds the ${limitM} m limit for ${run.category} at ${run.speedGbps} Gbps` };
  }
  return { ok: true, limitM, reason: `${run.lengthM} m is within the ${limitM} m limit` };
}

/**
 * The link-test verdict for one run. Codes:
 * - 'pass': same standard both ends, length within limits, patched in.
 * - 'crossover': T568A at one end, T568B at the other.
 * - 'too-long': length past the cable/speed limit.
 * - 'unsupported': cable cannot carry the speed at any length.
 * - 'unpatched': the run is fine but no patch cord connects it to the switch.
 */
export function linkStatus(run) {
  const length = checkRunLength(run);
  if (run.outletStandard !== run.panelStandard) {
    return {
      code: 'crossover',
      limitM: length.limitM,
      message: `Mixed standard — ${run.outletStandard} at the outlet, ${run.panelStandard} at the panel: a crossover, link FAILS`,
    };
  }
  if (!length.ok) {
    return {
      code: length.limitM === 0 ? 'unsupported' : 'too-long',
      limitM: length.limitM,
      message: length.reason,
    };
  }
  if (run.switchPort == null) {
    return { code: 'unpatched', limitM: length.limitM, message: 'Run is good but no patch cord — not connected to the switch' };
  }
  return { code: 'pass', limitM: length.limitM, message: `Link up — ${run.lengthM} m ${run.category} at ${run.speedGbps} Gbps` };
}

/** Re-terminate one end of a run to a standard. Returns a new run. */
export function reterminateRun(run, end, standard) {
  if (end === 'outlet') return { ...run, outletStandard: standard };
  return { ...run, panelStandard: standard };
}

/** Re-terminate both ends to one standard — the fix for a crossover. */
export function reterminateBothEnds(run, standard) {
  return { ...run, outletStandard: standard, panelStandard: standard };
}

/** Change a run's cable, length or speed. Returns a new run. */
export function updateRun(run, patch) {
  return { ...run, ...patch };
}

/** Patch a run into a switch port. Returns a new run. */
export function patchRun(run, switchPort) {
  return { ...run, switchPort };
}

/** Move a device: move its patch cord to another switch port. The
 * permanent run is untouched — that is the whole point of structured
 * cabling. Returns a new run. */
export function movePatchCord(run, switchPort) {
  return { ...run, switchPort };
}

/** Pull the patch cord out. Returns a new run. */
export function unpatchRun(run) {
  return { ...run, switchPort: null };
}

/** The first free switch port, or null when the switch is full. */
export function nextFreeSwitchPort(runs) {
  const used = new Set(runs.filter((r) => r.switchPort != null).map((r) => r.switchPort));
  for (let port = 1; port <= SWITCH_PORT_COUNT; port += 1) {
    if (!used.has(port)) return port;
  }
  return null;
}

/** Panel-wide counts plus the longest run (the derived metric). */
export function summarizeRuns(runs) {
  let passing = 0;
  let failing = 0;
  let unpatched = 0;
  let longestRun = null;
  for (const run of runs) {
    const status = linkStatus(run);
    if (status.code === 'pass') passing += 1;
    else if (status.code === 'unpatched') unpatched += 1;
    else failing += 1;
    if (!longestRun || run.lengthM > longestRun.lengthM) longestRun = run;
  }
  return {
    total: runs.length,
    patched: runs.filter((r) => r.switchPort != null).length,
    passing,
    failing,
    unpatched,
    longestRun,
    longestRunM: longestRun ? longestRun.lengthM : 0,
  };
}

const SCHEDULE_CODES = {
  pass: 'pass',
  crossover: 'X-over',
  'too-long': 'too-long',
  unsupported: 'unsup',
  unpatched: 'open',
};

/** The live termination schedule for the panel — the config panel.
 * Lines are kept short (<=34 chars) so they fit the narrow controls
 * column without wrapping: port, squashed device, cable, length, the
 * standard (one letter when both ends agree, A/B when mixed), switch
 * port, and the short link verdict. */
export function terminationSchedule(runs) {
  const lines = ['# termination schedule', '# p device cat len std sw link'];
  for (const run of runs) {
    const status = linkStatus(run);
    const device = run.device.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).padEnd(10, ' ');
    const std = run.outletStandard === run.panelStandard
      ? run.outletStandard.slice(-1)
      : 'A/B';
    const sw = run.switchPort == null ? '--' : String(run.switchPort);
    lines.push(
      `${run.port} ${device} ${run.category} ${run.lengthM}m ${std} ${sw} ${SCHEDULE_CODES[status.code]}`,
    );
  }
  return lines.join('\n');
}
