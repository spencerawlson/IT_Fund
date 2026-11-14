import { describe, it, expect } from 'vitest';
import { MISSIONS, MISSION_FOR_LESSON, getMission, beatFor, splitBriefing } from './missions';

const BROKEN_SHIELD_OBJECTIVES = [
  'topology',
  'firewall-inspect',
  'deny-guest',
  'permit-others',
  'apply',
  'guest-blocked',
  'trusted-allowed',
  'document',
  'report',
];

describe('missions', () => {
  it('returns the Operation Broken Shield entry for the net-acl-001 lab', () => {
    const mission = getMission({ id: 'net-acl-001', title: 'Network ACLs', description: 'Segment the network.' });
    expect(mission.callsign).toBe('OPERATION BROKEN SHIELD');
    expect(mission).toBe(MISSIONS['net-acl-001']);
    expect(mission.brief.length).toBeGreaterThan(0);
    expect(mission.intelKeys).toEqual(['flags']);
  });

  it('has a beat for every one of the 9 Broken Shield objectives', () => {
    const mission = MISSIONS['net-acl-001'];
    expect(Object.keys(mission.beats)).toHaveLength(9);
    for (const objectiveId of BROKEN_SHIELD_OBJECTIVES) {
      expect(mission.beats[objectiveId]).toBeTruthy();
      expect(beatFor(mission, { id: objectiveId, label: 'plain label' })).toBe(mission.beats[objectiveId]);
    }
  });

  it('maps the net-security lesson to op-broken-shield', () => {
    expect(MISSION_FOR_LESSON['net-security']).toBe('op-broken-shield');
  });

  it('keeps the existing Glasshouse mission intact', () => {
    expect(getMission({ id: 'sec-pentest-web-001' }).callsign).toBe('OPERATION GLASSHOUSE');
  });

  it('still falls back to a generated mission for unmapped labs', () => {
    const mission = getMission({ id: 'some-new-lab', slug: 'some-new-lab', title: 'Some Lab', description: 'Do it.' });
    expect(mission.callsign).toBe('OPERATION SOME NEW LAB');
  });
});

describe('splitBriefing', () => {
  const BROKEN_SHIELD_BRIEF = MISSIONS['net-acl-001'].brief;

  it('splits Operation Broken Shield by content — Cypher intro, Sentinel servers, Patch security, Cypher close', () => {
    // Spencer, 2026-11-14: Cypher ALWAYS does the introduction first;
    // Sentinel says the part related to servers; Patch says the part
    // related to security. The briefing has four paragraphs: the intro,
    // the topology/firewall investigation, the least-privilege fix, and
    // the Mission Console instructions (which stay with the presenter).
    const turns = splitBriefing(BROKEN_SHIELD_BRIEF);
    expect(turns).toHaveLength(4);
    expect(turns.map((t) => t.speaker)).toEqual(['cypher', 'sentinel', 'patch', 'cypher']);
    expect(turns[0].text).toMatch(/^Orion Technologies — unauthorized traffic detected/);
    expect(turns[1].text).toMatch(/Investigate the topology/);
    expect(turns[2].text).toMatch(/least privilege/);
    expect(turns[3].text).toMatch(/Mission Console/);
  });

  it('invents no lines — every turn is one of the original briefing lines, verbatim', () => {
    const turns = splitBriefing(BROKEN_SHIELD_BRIEF);
    for (const turn of turns) {
      expect(BROKEN_SHIELD_BRIEF).toContain(turn.text);
    }
    expect(turns.map((t) => t.text).join('\n')).toBe(BROKEN_SHIELD_BRIEF.join('\n'));
  });

  it('always gives the first line to Cypher, even when it mentions servers', () => {
    const turns = splitBriefing(['Servers are down across the site.', 'Block the intruder.']);
    expect(turns[0].speaker).toBe('cypher');
    expect(turns[1].speaker).toBe('patch');
  });

  it('classifies a servers line to Sentinel and a security-fix line to Patch', () => {
    const turns = splitBriefing([
      'Intro line.',
      'Check the server room and the network segments.',
      'Correct the configuration with least privilege.',
    ]);
    expect(turns.map((t) => t.speaker)).toEqual(['cypher', 'sentinel', 'patch']);
  });

  it('leaves unclassified lines with Cypher, the presenter', () => {
    const turns = splitBriefing(['Intro line.', 'Run `objectives` to see where you stand.']);
    expect(turns.map((t) => t.speaker)).toEqual(['cypher', 'cypher']);
  });

  it('reads a mission with no servers/security paragraphs entirely as Cypher — Glasshouse', () => {
    const turns = splitBriefing(MISSIONS['sec-pentest-web-001'].brief);
    expect(turns.length).toBeGreaterThan(0);
    expect(turns.every((t) => t.speaker === 'cypher')).toBe(true);
  });

  it('classifies the API-served briefing the same way — its fourth paragraph differs slightly', () => {
    // The backend (backend/labs/missions.py) serves the same four
    // paragraphs with a longer fourth one; the opening splits that text,
    // so the split must hold on the API wording too, not just the
    // frontend copy in missions.js.
    const turns = splitBriefing([
      'Orion Technologies — unauthorized traffic detected between two network segments. Sensitive resources may be exposed.',
      'Investigate the topology, inspect the firewall policies, and find the unauthorized path.',
      'Correct the configuration with least privilege — block the intruder, keep legitimate traffic flowing — then document the incident and file your report.',
      'Check where you stand in the Mission Console below: run `objectives` for the list, `progress` for the count, and `hint` when you are stuck. The terminal is the only place your progress is shown — after changing the firewall, run `check` to re-validate first.',
    ]);
    expect(turns.map((t) => t.speaker)).toEqual(['cypher', 'sentinel', 'patch', 'cypher']);
  });

  it('returns no turns for an empty or missing brief', () => {
    expect(splitBriefing([])).toEqual([]);
    expect(splitBriefing()).toEqual([]);
    expect(splitBriefing(null)).toEqual([]);
  });
});
