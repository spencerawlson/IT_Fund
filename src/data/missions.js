// Mission framing for game mode (see docs/GAME_LAB_DESIGN.md, Phase 2).
//
// This is pure PRESENTATION over the real lab. A mission does not change what
// runs, what validates, or what the objectives are — it gives the same lab a
// callsign, a briefing, and a per-objective "beat" label so completing an
// objective reads like advancing a story. Labs without an explicit entry get a
// sensible mission generated from their own metadata, so game mode works for
// every lab, not just the curated ones.

/** Explicit, hand-written missions keyed by lab id. */
export const MISSIONS = {
  'sec-pentest-web-001': {
    callsign: 'OPERATION GLASSHOUSE',
    brief: [
      'Target: the ACME intranet at target.lab — an internet-facing app with a soft centre.',
      'Your job: get in, prove how deep it goes, and bring back the intel. Recon first,',
      'then make the app betray itself. Everything you run is real. Leave a report.',
    ],
    // objective id -> story beat shown in place of the plain label
    beats: {
      recon: 'Map the perimeter',
      'auth-bypass': 'Walk through the front door',
      'sqli-union': 'Crack the vault',
      xss: 'Plant a hook',
      idor: 'Impersonate the admin',
      cmdi: 'Seize the shell',
      report: 'Exfiltrate the dossier',
    },
    // findings keys that hold recovered "intel" to show on the dossier
    intelKeys: ['flags'],
  },
};

/** The callsign for a lab with no explicit mission: slug -> SPACED CAPS. */
function fallbackCallsign(lab) {
  const base = (lab.slug || lab.id || 'operation').replace(/[-_]+/g, ' ').trim();
  return `OPERATION ${base.toUpperCase()}`;
}

/**
 * The mission for a lab: the explicit one if defined, else one generated from
 * the lab's own title/description/objectives. Always returns a usable mission.
 */
export function getMission(lab) {
  if (!lab) return null;
  const explicit = MISSIONS[lab.id];
  if (explicit) return explicit;
  return {
    callsign: fallbackCallsign(lab),
    brief: [lab.description || `Complete every objective in ${lab.title}.`],
    beats: {},
    intelKeys: ['flags'],
  };
}

/** The story beat for an objective, falling back to its plain label. */
export function beatFor(mission, objective) {
  return mission?.beats?.[objective.id] || objective.label;
}

/**
 * Intel recovered during the mission, for the completion dossier: flat
 * {label -> value} pairs pulled from the findings keys the mission names.
 * Values that are objects (e.g. {sqli: "FLAG-..."}) are flattened one level.
 */
export function intelFrom(mission, findings) {
  const out = [];
  if (!findings) return out;
  for (const key of mission?.intelKeys || []) {
    const val = findings[key];
    if (!val) continue;
    if (typeof val === 'object' && !Array.isArray(val)) {
      for (const [k, v] of Object.entries(val)) {
        if (v) out.push({ label: k, value: String(v) });
      }
    } else {
      out.push({ label: key, value: String(val) });
    }
  }
  return out;
}
