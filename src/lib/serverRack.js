// 42U rack simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "server-rack" drives this engine for its
// interactive simulator.
//
// Model (lesson net-devices-media + the verified artifact drill):
// - 1U = 44.45 mm; 42U cabinet 2,010 mm tall, 600 mm wide (19-inch),
//   1,000 mm deep, 1,867 mm usable height, static load up to 1,500 kg.
// - Perforated doors, 2–4 fan trays (120/140 mm), front-to-back airflow,
//   cable management; PDU 8/12/24 outlets, 1U strip or 0U vertical.
// - Two feeds (A and B), each behind a 1,840 W breaker. A feed whose load
//   passes its breaker trips and stays dark until it is reset — and a reset
//   only holds while the load on that feed is under the rating.
// - The rack starts fully loaded on feed A: 2,575 W against the 1,840 W
//   breaker, so feed A trips. Move load to feed B (split the feeds) and
//   shed load to 1,575 W, and the cabinet temperature falls 38.5 → 32.4 °C.
// - Temperature tracks the powered load: equilibrium is ambient plus
//   ~0.0061 °C per watt, plus 6 °C with the fans off and 3 °C with messy
//   cabling blocking the airflow. It approaches equilibrium with a 5 s
//   time constant, so the fall is visible over a few seconds.

export const U_MM = 44.45;
export const RACK_U = 42;
export const RACK_HEIGHT_MM = 2010;
export const RACK_WIDTH_MM = 600;
export const RACK_DEPTH_MM = 1000;
export const USABLE_HEIGHT_MM = 1867;
export const MAX_STATIC_LOAD_KG = 1500;
export const BREAKER_RATING_W = 1840;
export const AMBIENT_C = 22.8;
export const TEMP_PER_W = 0.0061;
export const FANS_OFF_PENALTY_C = 6;
export const MESSY_CABLING_PENALTY_C = 3;
export const TEMP_TAU_S = 5;
export const OVERHEAT_C = 35;

export const FEEDS = ['A', 'B'];

/** Rack-mounted devices, bottom-up (U1 is the bottom of the cabinet). */
export const DEVICES = [
  { id: 'ups', name: 'UPS', units: 2, startU: 1, watts: 100 },
  { id: 'patch-panel', name: 'Patch panel', units: 1, startU: 3, watts: 0 },
  { id: 'router', name: 'Router', units: 1, startU: 4, watts: 125 },
  { id: 'switch', name: 'Switch', units: 1, startU: 5, watts: 150 },
  { id: 'nas', name: 'NAS', units: 2, startU: 6, watts: 400 },
  { id: 'server-3', name: 'Server 3', units: 2, startU: 8, watts: 600 },
  { id: 'server-2', name: 'Server 2', units: 2, startU: 10, watts: 600 },
  { id: 'server-1', name: 'Server 1', units: 2, startU: 12, watts: 600 },
];

/** The drill's shed step: powering off Server 3 + NAS sheds exactly 1,000 W. */
export const SHED_DEVICE_IDS = ['server-3', 'nas'];
/** The drill's split step: Server 2 + Server 3 move to feed B. */
export const SPLIT_DEVICE_IDS = ['server-2', 'server-3'];

/** A fresh rack: everything powered, everything on feed A, 2,575 W. */
export function createRack() {
  return {
    devices: DEVICES.map((d) => ({ ...d, powered: true, feed: 'A' })),
    tripped: { A: false, B: false },
    fansOn: true,
    cablingMessy: false,
    // The rack was running hot under full load before the drill starts.
    tempC: 38.5,
  };
}

/** Watts the powered devices draw in total, regardless of trips. */
export function totalDrawW(rack) {
  return rack.devices.reduce((sum, d) => sum + (d.powered ? d.watts : 0), 0);
}

/** Watts assigned to one feed (powered devices on that feed). */
export function feedDrawW(rack, feed) {
  return rack.devices.reduce((sum, d) => sum + (d.powered && d.feed === feed ? d.watts : 0), 0);
}

/** Watts actually drawing power: a tripped feed's devices are dark. */
export function poweredLoadW(rack) {
  return rack.devices.reduce(
    (sum, d) => sum + (d.powered && !rack.tripped[d.feed] ? d.watts : 0),
    0,
  );
}

/** The temperature the cabinet settles at for its current load and cooling. */
export function equilibriumTempC(rack) {
  return (
    AMBIENT_C
    + TEMP_PER_W * poweredLoadW(rack)
    + (rack.fansOn ? 0 : FANS_OFF_PENALTY_C)
    + (rack.cablingMessy ? MESSY_CABLING_PENALTY_C : 0)
  );
}

/** Move the cabinet temperature toward equilibrium over dt seconds. */
export function stepTemperature(rack, dtS) {
  const eq = equilibriumTempC(rack);
  rack.tempC += (eq - rack.tempC) * (1 - Math.exp(-dtS / TEMP_TAU_S));
  return rack.tempC;
}

/**
 * Trip every feed whose load passes its breaker. Returns the feeds that
 * tripped on this check (empty when nothing changed).
 */
export function checkBreakers(rack) {
  const trippedNow = [];
  for (const feed of FEEDS) {
    if (!rack.tripped[feed] && feedDrawW(rack, feed) > BREAKER_RATING_W) {
      rack.tripped[feed] = true;
      trippedNow.push(feed);
    }
  }
  return trippedNow;
}

/**
 * Reset a tripped breaker. Holds only while the feed's load is under the
 * rating; otherwise the breaker stays tripped.
 */
export function resetBreaker(rack, feed) {
  if (!rack.tripped[feed]) return { ok: false, reason: 'not-tripped' };
  if (feedDrawW(rack, feed) > BREAKER_RATING_W) return { ok: false, reason: 'still-overloaded' };
  rack.tripped[feed] = false;
  return { ok: true };
}

/** Watts of headroom left on a feed before its breaker trips (may be negative). */
export function breakerHeadroomW(rack, feed) {
  return BREAKER_RATING_W - feedDrawW(rack, feed);
}

/** The feed closest to tripping, and its headroom — the binding constraint. */
export function bindingFeed(rack) {
  let best = null;
  for (const feed of FEEDS) {
    const headroom = breakerHeadroomW(rack, feed);
    if (!best || headroom < best.headroomW) best = { feed, headroomW: headroom };
  }
  return best;
}

export function setDeviceFeed(rack, deviceId, feed) {
  const device = rack.devices.find((d) => d.id === deviceId);
  if (device) device.feed = feed;
  return rack;
}

export function setDevicePower(rack, deviceId, powered) {
  const device = rack.devices.find((d) => d.id === deviceId);
  if (device) device.powered = powered;
  return rack;
}

export function moveAllToFeed(rack, feed) {
  for (const device of rack.devices) device.feed = feed;
  return rack;
}

/** Split the load across the feeds: Server 2 + Server 3 go to feed B. */
export function splitFeeds(rack) {
  for (const device of rack.devices) {
    device.feed = SPLIT_DEVICE_IDS.includes(device.id) ? 'B' : 'A';
  }
  return rack;
}

/** Shed 1,000 W: power off Server 3 and the NAS. */
export function shedLoad(rack) {
  for (const id of SHED_DEVICE_IDS) setDevicePower(rack, id, false);
  return rack;
}

/** Back to the drill start: everything powered, everything on feed A. */
export function restoreFullPower(rack) {
  for (const device of rack.devices) {
    device.powered = true;
    device.feed = 'A';
  }
  return rack;
}

/** 'cool' / 'warm' / 'overheating' for a cabinet temperature. */
export function tempStatus(tempC) {
  if (tempC > OVERHEAT_C) return 'overheating';
  if (tempC > 27) return 'warm';
  return 'cool';
}

/** The live PDU / feed config — the panel the subject shows. */
export function rackConfigText(rack) {
  const lines = [
    '# 42U rack — 2,010 x 600 x 1,000 mm · 1,867 mm usable · 1,500 kg static',
    '# 1U = 44.45 mm · perforated doors · front-to-back airflow',
    '# fan trays: 2 x 140 mm (top) · PDU: 12 outlets, 0U vertical',
    `# fans: ${rack.fansOn ? 'on' : 'OFF (+6 C)'} · cabling: ${rack.cablingMessy ? 'messy (+3 C)' : 'tidy'}`,
  ];
  for (const feed of FEEDS) {
    const load = feedDrawW(rack, feed);
    const status = rack.tripped[feed] ? 'TRIPPED' : `${breakerHeadroomW(rack, feed)} W headroom`;
    lines.push(`feed ${feed} breaker ${BREAKER_RATING_W} W — load ${load} W — ${status}`);
  }
  lines.push(`cabinet ${rack.tempC.toFixed(1)} C (${tempStatus(rack.tempC)}) — equilibrium ${equilibriumTempC(rack).toFixed(1)} C`);
  return lines.join('\n');
}
