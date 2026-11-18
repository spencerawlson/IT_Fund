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
  'net-acl-001': {
    callsign: 'OPERATION BROKEN SHIELD',
    brief: [
      'Orion Technologies — unauthorized traffic detected between two network segments. Sensitive resources may be exposed.',
      'Investigate the topology, inspect the firewall policies, and find the unauthorized path.',
      'Correct the configuration with least privilege — block the intruder, keep legitimate traffic flowing — then document the incident and file your report.',
      'Check where you stand in the Mission Console: run `objectives` for the list, `progress` for the count, and `hint` when you are stuck. The terminal is the only place your progress is shown.',
    ],
    // objective id -> story beat shown in place of the plain label
    beats: {
      topology: 'Map the network',
      'firewall-inspect': 'Read the firewall rules',
      'deny-guest': 'Block the intruder',
      'permit-others': 'Keep the door open for friends',
      apply: 'Apply the rule where it counts',
      'guest-blocked': 'Prove the guest is locked out',
      'trusted-allowed': 'Prove friends still get in',
      document: 'Write up the incident',
      report: 'File the mission report',
    },
    // findings keys that hold recovered "intel" to show on the dossier
    intelKeys: ['flags'],
  },
  'tools-wireshark-001': {
    callsign: 'OPERATION PACKET FLOOD',
    // Must match backend/labs/missions.py (PACKET_FLOOD) line for line —
    // the splitBriefing test asserts the split on both wordings.
    brief: [
      'Orion Technologies — the intranet barely responds and the link is saturated. Users report the network crawling, and nobody knows why yet.',
      'Investigate the network segment: capture the traffic with Wireshark or tcpdump, and find which host is flooding it — and what kind of flood it is.',
      'Once you know the source, correct the configuration to stop the flood at its source and keep legitimate traffic flowing — then document the incident and file your report.',
      'Check where you stand in the Mission Console below: run `objectives` for the list, `progress` for the count, and `hint` when you are stuck. The terminal is the only place your progress is shown — after capturing, run `check` to re-validate first.',
    ],
    // objective id -> story beat shown in place of the plain label
    beats: {
      open: 'Open the flood capture',
      protocols: 'Read the protocol mix',
      stream: 'Follow the login stream',
      creds: 'Find the cleartext login',
      exfil: 'Catch the DNS exfiltration',
      writeup: 'Write up the capture findings',
      'flood-source': 'Name the flooding host',
      document: 'Write up the incident',
      report: 'File the mission report',
    },
    // findings keys that hold recovered "intel" to show on the dossier:
    // the reported flooding host + flood type (attempt findings).
    intelKeys: ['flood'],
  },
};

/**
 * Split a mission briefing into spoken turns, one per robot, from the
 * existing text only — nothing is invented. Spencer, 2026-11-14: Cypher
 * ALWAYS does the introduction first; Sentinel says the part related to
 * servers; Patch says the part related to security.
 *
 * - The first line is the introduction: always Cypher, whatever it says.
 * - A later line is Patch's when it is the security FIX (least privilege,
 *   blocking the intruder, correcting the configuration).
 * - A later line is Sentinel's when it is the investigation of the network
 *   itself (the topology, the firewall policies as things to inspect, the
 *   unauthorized path to find). Honest caveat: no paragraph of the Broken
 *   Shield briefing literally mentions servers — this line is the closest
 *   content match, because the things being investigated (R1, SRV) live in
 *   Sentinel's server room and watching the network is his job. If Spencer
 *   wants that line read by someone else, it is a one-line change here.
 * - Anything else (e.g. how to use the Mission Console) stays with Cypher,
 *   the presenter — he opens the briefing and closes it.
 * Returns [{ speaker: 'cypher' | 'sentinel' | 'patch', text }] in order.
 * Every turn's text is one of the original lines, verbatim.
 */
const PATCH_LINE_RE = /least privilege|block the intruder|correct the configuration/i;
const SENTINEL_LINE_RE = /topology|network segment|unauthorized path|firewall polic/i;

export function splitBriefing(brief) {
  const lines = Array.isArray(brief) ? brief.filter(Boolean) : [];
  return lines.map((text, i) => {
    let speaker = 'cypher';
    if (i > 0) {
      if (PATCH_LINE_RE.test(text)) speaker = 'patch';
      else if (SENTINEL_LINE_RE.test(text)) speaker = 'sentinel';
    }
    return { speaker, text };
  });
}

/** Lesson id -> mission id, for the lesson-page mission invitation. */
export const MISSION_FOR_LESSON = {
  'net-security': 'op-broken-shield',
  'net-troubleshoot': 'op-packet-flood',
};

/**
 * Labs that only run inside a mission, never as standalone labs.
 * Lab id -> the mission id that runs it. Spencer, 2026-11-16: Operation
 * Broken Shield is mission-only everywhere — the ACL lab (net-acl-001) is
 * not launchable from lessons, the labs console, lab progress, or its own
 * URL; it only runs inside the mission. The lab definition, shell and
 * validators stay untouched — only the standalone surfacing is gone.
 * Consumers: deckLabs.js and labLessons.js never list these labs;
 * useLabConsole and LabProgress filter them from the catalogue;
 * LabWorkspace redirects their URL to the mission.
 */
export const MISSION_ONLY_LABS = {
  'net-acl-001': 'op-broken-shield',
};

/** The lab id a mission runs, or undefined — the reverse of MISSION_ONLY_LABS. */
export function labForMission(missionId) {
  return Object.entries(MISSION_ONLY_LABS).find(([, m]) => m === missionId)?.[0];
}

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

/**
 * The closing scene in the SOC room once a mission is complete (Spencer,
 * 2026-11-18): the robots explain what happened and what the learner did --
 * automatically, nobody has to ask -- then congratulate them ("you passed,
 * and you helped us with the problem we had") and send them off to the next
 * mission. [{ speaker, text } | { speaker, explain: true }], in order; the
 * explain turn is filled at play time with Cypher's explanation of this
 * learner's result (SocClosing). The scripted lines never include the score
 * (it is on the end card), so they are generated once and replayed from the
 * voice cache for every learner.
 */
export function closingTurns(missionTitle, nextTitle) {
  const name = missionTitle || 'this mission';
  return [
    { speaker: 'cypher', text: `Mission complete! Great work on ${name}. Let me walk you through what you did.` },
    { speaker: 'cypher', explain: true },
    { speaker: 'sentinel', text: 'Thanks to you, the network is secure and the logs are clean.' },
    { speaker: 'patch', text: 'Everything is fixed and running smoothly. Thank you for the help.' },
    {
      speaker: 'cypher',
      text: `Congratulations, you passed, and you helped us solve the problem we had. ${
        nextTitle ? `Your next mission is ${nextTitle}.` : 'More missions are on the way.'
      } We hope to see you on the next mission!`,
    },
  ];
}
