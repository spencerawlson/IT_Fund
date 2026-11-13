import { describe, it, expect } from 'vitest';
import { MISSIONS, MISSION_FOR_LESSON, getMission, beatFor } from './missions';

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
