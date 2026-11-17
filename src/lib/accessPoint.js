// Access point simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "Wireless Access Point" (src/components/viz) drives
// this engine for its interactive simulator.
//
// Model (from the net-services-wireless lesson — real facts only):
// - 802.11 standards: b (2.4 GHz, 11 Mbps, DSSS, 1999), g (2.4 GHz, 54 Mbps,
//   2003), a (5 GHz, 54 Mbps, OFDM, 1999), n / Wi-Fi 4 (MIMO, ~600 Mbps,
//   2009), ac / Wi-Fi 5 (5 GHz, ~6.9 Gbps, 2013), ax / Wi-Fi 6.
// - On 2.4 GHz only channels 1, 6 and 11 are non-overlapping: a channel is
//   ~22 MHz wide and channels sit 5 MHz apart, so two channels overlap
//   whenever they are fewer than 5 apart. 5 GHz and 6 GHz offer more,
//   wider channels that do not overlap at 20 MHz width.
// - Security: WEP is broken, WPA is weak, WPA2 (AES-CCMP) and WPA3 (SAE)
//   are the standards. Personal mode is a pre-shared key; enterprise mode
//   is 802.1X/EAP against a RADIUS server. A hidden SSID is NOT security.
// - Roaming: APs share one SSID and the CLIENT decides when to move, on
//   signal strength. The AP is PoE-powered (802.3af/at/bt).
// - Interference comes from neighbouring APs on overlapping channels and
//   from the building's own APs sharing a channel (co-channel contention).

export const AP_POWER_W = 25;

export const STANDARDS = [
  { id: 'b', label: '802.11b', wifi: null, band: '2.4 GHz', maxMbps: 11, year: 1999, tech: 'DSSS', blurb: '2.4 GHz, 11 Mbps — the first widely used Wi-Fi.' },
  { id: 'g', label: '802.11g', wifi: null, band: '2.4 GHz', maxMbps: 54, year: 2003, tech: 'OFDM', blurb: '2.4 GHz, 54 Mbps — OFDM speed on the crowded band.' },
  { id: 'a', label: '802.11a', wifi: null, band: '5 GHz', maxMbps: 54, year: 1999, tech: 'OFDM', blurb: '5 GHz, 54 Mbps — cleaner air, shorter range.' },
  { id: 'n', label: '802.11n', wifi: 'Wi-Fi 4', band: '2.4/5 GHz', maxMbps: 600, year: 2009, tech: 'MIMO', blurb: 'MIMO, ~600 Mbps — the first Wi-Fi 4.' },
  { id: 'ac', label: '802.11ac', wifi: 'Wi-Fi 5', band: '5 GHz', maxMbps: 6900, year: 2013, tech: 'MU-MIMO', blurb: '5 GHz only, ~6.9 Gbps — Wi-Fi 5.' },
  { id: 'ax', label: '802.11ax', wifi: 'Wi-Fi 6', band: '2.4/5/6 GHz', maxMbps: 9600, year: null, tech: 'OFDMA', blurb: '~9.6 Gbps on any band — Wi-Fi 6.' },
];

export const STANDARD_IDS = STANDARDS.map((s) => s.id);

export function standardById(id) {
  return STANDARDS.find((s) => s.id === id) || null;
}

export const BANDS = ['2.4 GHz', '5 GHz', '6 GHz'];

export const CHANNELS_BY_BAND = {
  '2.4 GHz': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  '5 GHz': [36, 40, 44, 48, 149, 153, 157, 161, 165],
  '6 GHz': [1, 5, 9, 13, 17, 21, 29, 37, 53, 69, 85, 101, 117, 133, 149, 165, 181, 197, 213, 229],
};

export function channelsForBand(band) {
  return CHANNELS_BY_BAND[band] ? [...CHANNELS_BY_BAND[band]] : [];
}

/** The standards an AP can run on a band (a/ac are 5 GHz only; b/g are 2.4 GHz only). */
export function standardsForBand(band) {
  if (band === '2.4 GHz') return STANDARDS.filter((s) => ['b', 'g', 'n', 'ax'].includes(s.id));
  if (band === '5 GHz') return STANDARDS.filter((s) => ['a', 'n', 'ac', 'ax'].includes(s.id));
  return STANDARDS.filter((s) => s.id === 'ax');
}

/** The only non-overlapping channels on 2.4 GHz. */
export const NON_OVERLAPPING_24 = [1, 6, 11];

/**
 * How much two channels overlap, 0..1. On 2.4 GHz a channel is ~22 MHz
 * wide and channels sit 5 MHz apart, so overlap falls linearly with the
 * gap and vanishes at a gap of 5. On 5/6 GHz, 20 MHz channels do not
 * overlap unless they are the same channel.
 */
export function overlapFactor(a, b, band) {
  if (band === '2.4 GHz') return Math.max(0, 1 - Math.abs(a - b) / 5);
  return a === b ? 1 : 0;
}

export function channelsOverlap(a, b, band) {
  return overlapFactor(a, b, band) > 0;
}

/** Neighbouring APs from the site survey: what the air looks like already. */
export const DEFAULT_NEIGHBOURS = [
  { ssid: 'Café Wi-Fi', channel: 3, band: '2.4 GHz', strength: 75 },
  { ssid: 'Office-NextDoor', channel: 8, band: '2.4 GHz', strength: 60 },
  { ssid: 'Hotel-5G', channel: 36, band: '5 GHz', strength: 55 },
  { ssid: 'Apartment-5G', channel: 149, band: '5 GHz', strength: 40 },
];

/**
 * Interference on one channel, 0..100, from neighbouring APs. A neighbour
 * on the same channel hits at full strength; on 2.4 GHz a neighbour 2
 * channels away still hits at 60% of its strength.
 */
export function interferencePercent(channel, band, neighbours = DEFAULT_NEIGHBOURS) {
  let total = 0;
  for (const n of neighbours) {
    if (n.band !== band) continue;
    total += n.strength * overlapFactor(channel, n.channel, band);
  }
  return Math.min(100, Math.round(total));
}

/** Co-channel contention from a sibling AP in the same building (0..100). */
export const SIBLING_STRENGTH = 60;

/** Self-interference one AP in a channel plan sees from its siblings. */
export function planSelfInterference(index, channels, band) {
  let total = 0;
  for (let i = 0; i < channels.length; i += 1) {
    if (i === index) continue;
    total += SIBLING_STRENGTH * overlapFactor(channels[index], channels[i], band);
  }
  return Math.min(100, Math.round(total));
}

/**
 * Worst self-interference across a channel plan, 0..100. The classic plan
 * [1, 6, 11] scores 0; [1, 2, 3] scores 96; all three on 6 scores 100.
 */
export function planInterference(channels, band) {
  if (channels.length === 0) return 0;
  return Math.max(...channels.map((_, i) => planSelfInterference(i, channels, band)));
}

/**
 * Signal strength in dBm at a distance, in metres. Free-space falloff
 * (~6 dB per doubling) from -30 dBm at 1 m, plus a band penalty: 5 GHz
 * and 6 GHz fade faster than 2.4 GHz.
 */
export function signalDbm(distanceM, band) {
  const d = Math.max(1, distanceM);
  const bandLoss = band === '5 GHz' ? 6 : band === '6 GHz' ? 9 : 0;
  return Math.round(-30 - 20 * Math.log10(d) - bandLoss);
}

export function signalQuality(dbm) {
  if (dbm >= -50) return 'Excellent';
  if (dbm >= -60) return 'Good';
  if (dbm >= -70) return 'Fair';
  if (dbm >= -80) return 'Poor';
  return 'No signal';
}

/** Throughput factor from signal: a far client negotiates a slower rate. */
export function distanceFactor(dbm) {
  if (dbm >= -55) return 1;
  if (dbm >= -65) return 0.8;
  if (dbm >= -75) return 0.5;
  if (dbm >= -85) return 0.25;
  return 0.1;
}

/**
 * Effective throughput in Mbps for one client. Interference eats airtime
 * (each point of interference costs ~0.9% of the rate), distance negotiates
 * the rate down, a legacy 802.11b client caps the whole cell at 11 Mbps,
 * and an under-powered AP halves its radio.
 */
export function effectiveThroughputMbps({
  standardId,
  band,
  channel,
  neighbours = DEFAULT_NEIGHBOURS,
  distanceM = 5,
  legacyB = false,
  poeOk = true,
  planChannels = null,
}) {
  const standard = standardById(standardId);
  if (!standard) return 0;
  const base = legacyB ? 11 : standard.maxMbps;
  const neighbourHit = interferencePercent(channel, band, neighbours);
  let planHit = 0;
  if (planChannels) {
    const index = planChannels.indexOf(channel);
    planHit = index >= 0
      ? planSelfInterference(index, planChannels, band)
      : 0;
  }
  const interference = Math.min(100, neighbourHit + planHit);
  const dbm = signalDbm(distanceM, band);
  const rate = base * (1 - 0.9 * (interference / 100)) * distanceFactor(dbm) * (poeOk ? 1 : 0.5);
  return Math.max(1, Math.round(rate));
}

/** Throughput of a whole channel plan (clean-channel anchor: g on 1·6·11 = 54 Mbps). */
export function planThroughputMbps({ standardId, band, channels, legacyB = false, poeOk = true }) {
  const standard = standardById(standardId);
  if (!standard) return 0;
  const base = legacyB ? 11 : standard.maxMbps;
  const interference = planInterference(channels, band);
  const rate = base * (1 - 0.9 * (interference / 100)) * (poeOk ? 1 : 0.5);
  return Math.max(1, Math.round(rate));
}

/** Format a rate: 6900 Mbps reads as 6.9 Gbps. */
export function formatRate(mbps) {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1).replace(/\.0$/, '')} Gbps`;
  return `${mbps} Mbps`;
}

/**
 * Which AP a client associates to. `rssiByAp` maps AP id -> dBm; the client
 * picks the strongest AP at or above the roam threshold (-75 dBm) and stays
 * unassociated below it. The client decides — the APs only advertise.
 */
export const ROAM_THRESHOLD_DBM = -75;

export function associateClient(rssiByAp, threshold = ROAM_THRESHOLD_DBM) {
  let best = null;
  for (const [apId, dbm] of Object.entries(rssiByAp)) {
    if (dbm < threshold) continue;
    if (!best || dbm > best.dbm) best = { apId, dbm };
  }
  return best ? best.apId : null;
}

export const SECURITY = [
  { id: 'open', label: 'Open (no security)', auth: 'None', encryption: 'None', verdict: 'Broken', crackNote: 'No key at all — anyone joins and reads everything.', evilTwinSteals: 3, evilTwinNote: 'No authentication — as far as the client can tell, the twin IS the network.' },
  { id: 'wep', label: 'WEP', auth: 'Shared key', encryption: 'RC4', verdict: 'Broken', crackNote: 'Weak IVs leak the key — cracked in seconds to minutes.', evilTwinSteals: 3, evilTwinNote: 'The WEP key is cracked in seconds, so the twin decrypts everything.' },
  { id: 'wpa', label: 'WPA (TKIP)', auth: 'PSK', encryption: 'TKIP / RC4', verdict: 'Weak', crackNote: 'TKIP was a patch on WEP — weak, and retired.', evilTwinSteals: 2, evilTwinNote: 'WPA/TKIP is weak — the twin guesses the passphrase.' },
  { id: 'wpa2', label: 'WPA2-Personal', auth: 'PSK', encryption: 'AES-CCMP', verdict: 'Standard', crackNote: 'AES-CCMP is sound, but a PSK has no server to check.', evilTwinSteals: 1, evilTwinNote: 'WPA2-Personal has no server certificate — a client that joins the twin hands over its handshake.' },
  { id: 'wpa3', label: 'WPA3-Personal', auth: 'SAE', encryption: 'AES-GCMP', verdict: 'Strong', crackNote: 'SAE resists offline guessing; the handshake needs the password.', evilTwinSteals: 0, evilTwinNote: 'SAE needs the password to complete the handshake — the twin cannot fake it.' },
  { id: 'wpa3-enterprise', label: 'WPA3-Enterprise', auth: '802.1X / EAP', encryption: 'AES-GCMP', verdict: 'Strong', crackNote: 'RADIUS + server-certificate validation — the enterprise standard.', evilTwinSteals: 0, evilTwinNote: '802.1X with certificate validation — the twin has no trusted certificate, so clients refuse it.' },
];

export function securityById(id) {
  return SECURITY.find((s) => s.id === id) || null;
}

/** Evil-twin risk shown next to the counters: what the current security allows. */
export function evilTwinRisk(securityId) {
  switch (securityId) {
    case 'open':
    case 'wep':
      return 'Critical';
    case 'wpa':
      return 'High';
    case 'wpa2':
      return 'Medium';
    default:
      return 'Blocked';
  }
}

/**
 * Run an evil-twin attack against the current security: a rogue AP copies
 * the SSID and waits for clients. Returns how many of the connected
 * clients the twin steals (up to the security's cap) and whether the
 * attack is blocked outright. The artifact's anchors: Open steals 3,
 * WPA3-Enterprise blocks it.
 */
export function evilTwinResult(securityId, connectedCount) {
  const security = securityById(securityId);
  if (!security) return { stolen: 0, blocked: false, note: 'Unknown security mode.' };
  const stolen = Math.min(security.evilTwinSteals, connectedCount);
  return { stolen, blocked: stolen === 0, note: security.evilTwinNote };
}

export const EAP_METHODS = [
  { id: 'EAP-TLS', label: 'EAP-TLS (certificates)' },
  { id: 'PEAP', label: 'PEAP (tunneled credentials)' },
];

/**
 * 802.1X authentication against the RADIUS server. Enterprise only: the AP
 * forwards the EAP exchange and the server answers Access-Accept or
 * Access-Reject — the AP never decides on its own.
 */
export function authenticate8021X({ securityId, eapMethod, username }) {
  if (securityId !== 'wpa3-enterprise') {
    return { result: 'Access-Reject', reason: '802.1X is only offered on WPA3-Enterprise — this network runs a pre-shared key.' };
  }
  if (!username || !username.trim()) {
    return { result: 'Access-Reject', reason: 'No identity supplied — RADIUS rejects an anonymous request.' };
  }
  if (eapMethod === 'EAP-TLS') {
    return { result: 'Access-Accept', reason: `EAP-TLS certificate for ${username.trim()} validated by RADIUS — client is on the network.` };
  }
  if (eapMethod === 'PEAP') {
    return { result: 'Access-Accept', reason: `PEAP tunneled credentials for ${username.trim()} accepted by RADIUS — client is on the network.` };
  }
  return { result: 'Access-Reject', reason: `Unknown EAP method ${eapMethod} — RADIUS cannot validate it.` };
}

export const POE = [
  { id: 'af', label: '802.3af', watts: 15.4, blurb: '15.4 W — first-generation PoE.' },
  { id: 'at', label: '802.3at (PoE+)', watts: 30, blurb: '30 W — PoE+, enough for this 4x4 AP.' },
  { id: 'bt', label: '802.3bt (PoE++)', watts: 60, blurb: '60 W — PoE++, headroom for anything.' },
];

export function poeById(id) {
  return POE.find((p) => p.id === id) || null;
}

/** This 4x4 MIMO AP draws 25 W — 802.3af cannot feed it. */
export function poeSufficient(poeId, requiredW = AP_POWER_W) {
  const poe = poeById(poeId);
  if (!poe) return false;
  return poe.watts >= requiredW;
}

/** The live AP config, hostapd-style — the panel the subject shows. */
export function apConfigText({ ssid, band, channel, standardId, securityId, ssidBroadcast, poeId }) {
  const standard = standardById(standardId);
  const security = securityById(securityId);
  const poe = poeById(poeId);
  const lines = [
    'interface=wlan0',
    `ssid=${ssid}`,
    `hw_mode=${band === '2.4 GHz' ? 'g' : band === '5 GHz' ? 'a' : '6g'}`,
    `channel=${channel}`,
    `ieee80211n=${['n', 'ac', 'ax'].includes(standardId) ? 1 : 0}`,
    `ieee80211ac=${['ac', 'ax'].includes(standardId) ? 1 : 0}`,
    `ieee80211ax=${standardId === 'ax' ? 1 : 0}`,
    `ignore_broadcast_ssid=${ssidBroadcast ? 0 : 1}${ssidBroadcast ? '' : '  # hidden SSID — NOT security'}`,
    `wpa=${securityId === 'open' ? 0 : securityId === 'wpa' ? 1 : 2}`,
    `wpa_key_mgmt=${securityId === 'wpa3-enterprise' ? 'WPA-EAP' : securityId === 'wpa3' ? 'SAE' : securityId === 'open' ? 'NONE' : 'WPA-PSK'}`,
    `ieee8021x=${securityId === 'wpa3-enterprise' ? 1 : 0}`,
    `# ${standard ? standard.label : standardId}${standard?.wifi ? ` (${standard.wifi})` : ''} · ${band} · ${security ? security.label : securityId} · ${security ? security.encryption : ''}`,
    `# PoE ${poe ? `${poe.label} (${poe.watts} W)` : poeId} — AP draws ${AP_POWER_W} W${poe && poe.watts >= AP_POWER_W ? '' : ' — UNDER-POWERED'}`,
  ];
  return lines.join('\n');
}
