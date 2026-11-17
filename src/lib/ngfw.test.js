import { describe, it, expect } from 'vitest';
import {
  createFirewall,
  createRules,
  matchRule,
  evaluatePacket,
  closeSession,
  tickSessions,
  addRule,
  deleteRule,
  moveRule,
  runNacCheck,
  remediateHost,
  testPacketById,
  ngfwConf,
  SESSION_TTL_TICKS,
} from './ngfw';

function packet(overrides = {}) {
  return {
    srcZone: 'inside', dstZone: 'outside', app: 'HTTPS', port: 443,
    src: '10.0.1.10', dst: '93.184.216.34', ...overrides,
  };
}

describe('ngfw engine', () => {
  it('creates the default rule base with the SSH deny as Rule 2', () => {
    const rules = createRules();
    expect(rules).toHaveLength(6);
    expect(rules[1].action).toBe('deny');
    expect(rules[1].app).toBe('SSH');
    expect(rules[4].action).toBe('deny');
    expect(rules[4].srcZone).toBe('dmz');
    expect(rules[4].dstZone).toBe('inside');
  });

  it('first match wins: web browsing is allowed by Rule 3', () => {
    const fw = createFirewall();
    const result = evaluatePacket(fw, testPacketById('web'));
    expect(result.verdict).toBe('allow');
    expect(result.ruleIndex).toBe(3);
    expect(result.natApplied).toBe(true);
    expect(result.detail).toContain('203.0.113.5');
    expect(fw.counters.allowed).toBe(1);
    expect(fw.counters.nat).toBe(1);
  });

  it('SSH to the internet is denied by Rule 2', () => {
    const fw = createFirewall();
    const result = evaluatePacket(fw, testPacketById('ssh'));
    expect(result.verdict).toBe('deny');
    expect(result.ruleIndex).toBe(2);
    expect(result.reason).toContain('Rule 2');
    expect(fw.counters.denied).toBe(1);
  });

  it('a too-broad allow above the deny breaks the deny; moving it below fixes it', () => {
    const fw = createFirewall();
    const broad = addRule(fw, {
      action: 'allow', srcZone: 'inside', dstZone: 'outside', app: 'any',
    }, 'top');
    expect(evaluatePacket(fw, testPacketById('ssh')).verdict).toBe('allow');
    expect(evaluatePacket(fw, testPacketById('ssh')).ruleId).toBe(broad.id);
    // Move the broad allow down past Rule 1 and Rule 2: the SSH deny wins again.
    expect(moveRule(fw, broad.id, 'down')).toBe(true);
    expect(moveRule(fw, broad.id, 'down')).toBe(true);
    const result = evaluatePacket(fw, testPacketById('ssh'));
    expect(result.verdict).toBe('deny');
    expect(result.ruleIndex).toBe(2);
    // And deleting the broad allow leaves the deny in place.
    expect(deleteRule(fw, broad.id)).toBe(true);
    expect(evaluatePacket(fw, testPacketById('ssh')).verdict).toBe('deny');
  });

  it('moveRule refuses to move past the ends of the list', () => {
    const fw = createFirewall();
    expect(moveRule(fw, 'r1', 'up')).toBe(false);
    expect(moveRule(fw, 'r6', 'down')).toBe(false);
    expect(moveRule(fw, 'nope', 'up')).toBe(false);
    expect(deleteRule(fw, 'nope')).toBe(false);
  });

  it('unmatched traffic hits the implicit deny (default deny)', () => {
    const fw = createFirewall();
    const result = evaluatePacket(fw, testPacketById('ftp'));
    expect(result.verdict).toBe('deny');
    expect(result.ruleIndex).toBeNull();
    expect(result.reason).toContain('implicit deny');
  });

  it('stateful: return traffic is allowed only on an open session', () => {
    const fw = createFirewall();
    const ret = testPacketById('return');
    // No session yet: unsolicited inbound is dropped.
    const denied = evaluatePacket(fw, ret);
    expect(denied.verdict).toBe('deny');
    expect(denied.reason).toContain('no open session');
    // Browse the web: a session opens.
    const opened = evaluatePacket(fw, testPacketById('web'));
    expect(opened.verdict).toBe('allow');
    expect(opened.sessionId).toBeTruthy();
    expect(fw.sessions).toHaveLength(1);
    // Now the reply belongs to that session.
    const allowed = evaluatePacket(fw, ret);
    expect(allowed.verdict).toBe('allow');
    expect(allowed.stateful).toBe(true);
    expect(allowed.reason).toContain('open session');
    // Close the session and the same reply is dropped again.
    expect(closeSession(fw, opened.sessionId)).toBe(true);
    expect(closeSession(fw, opened.sessionId)).toBe(false);
    expect(evaluatePacket(fw, ret).verdict).toBe('deny');
  });

  it('sessions expire after their TTL', () => {
    const fw = createFirewall();
    evaluatePacket(fw, testPacketById('web'));
    expect(fw.sessions).toHaveLength(1);
    for (let i = 0; i < SESSION_TTL_TICKS; i += 1) tickSessions(fw);
    expect(fw.sessions).toHaveLength(1);
    const expired = tickSessions(fw);
    expect(expired).toHaveLength(1);
    expect(fw.sessions).toHaveLength(0);
    expect(evaluatePacket(fw, testPacketById('return')).verdict).toBe('deny');
  });

  it('zone policy: the internet reaches the DMZ web server, the DMZ never reaches the LAN', () => {
    const fw = createFirewall();
    const inToDmz = evaluatePacket(fw, testPacketById('dmz-web'));
    expect(inToDmz.verdict).toBe('allow');
    expect(inToDmz.ruleIndex).toBe(4);
    const dmzToLan = evaluatePacket(fw, testPacketById('dmz-lan'));
    expect(dmzToLan.verdict).toBe('deny');
    expect(dmzToLan.ruleIndex).toBe(5);
    expect(dmzToLan.reason).toContain('Rule 5');
  });

  it('IPS blocks a plain-HTTP exploit whether or not SSL inspection is on', () => {
    const fw = createFirewall();
    // The exploit has to be allowed past the rules before the IPS sees it.
    addRule(fw, { action: 'allow', srcZone: 'inside', dstZone: 'outside', app: 'HTTP' }, 'bottom');
    const off = evaluatePacket(fw, testPacketById('http-exploit'));
    expect(off.verdict).toBe('blocked');
    expect(off.reason).toContain('IPS');
    expect(fw.counters.blocked).toBe(1);
    fw.sslInspection = true;
    const on = evaluatePacket(fw, testPacketById('http-exploit'));
    expect(on.verdict).toBe('blocked');
  });

  it('an exploit inside HTTPS passes with SSL inspection off and is blocked with it on', () => {
    const fw = createFirewall();
    expect(fw.sslInspection).toBe(false);
    const blind = evaluatePacket(fw, testPacketById('https-exploit'));
    expect(blind.verdict).toBe('allow');
    expect(blind.reason).toContain('SSL inspection is off');
    fw.sslInspection = true;
    const caught = evaluatePacket(fw, testPacketById('https-exploit'));
    expect(caught.verdict).toBe('blocked');
    expect(caught.reason).toContain('IPS');
  });

  it('with IPS disabled an exploit is not blocked', () => {
    const fw = createFirewall();
    fw.ipsEnabled = false;
    addRule(fw, { action: 'allow', srcZone: 'inside', dstZone: 'outside', app: 'HTTP' }, 'bottom');
    const result = evaluatePacket(fw, testPacketById('http-exploit'));
    expect(result.verdict).toBe('allow');
  });

  it('NAC quarantines the unpatched host and remediation lets it back on', () => {
    const fw = createFirewall();
    // Before the check, PC-7 browses fine.
    expect(evaluatePacket(fw, testPacketById('pc7-web')).verdict).toBe('allow');
    const quarantined = runNacCheck(fw);
    expect(quarantined).toEqual(['PC-7']);
    const blocked = evaluatePacket(fw, testPacketById('pc7-web'));
    expect(blocked.verdict).toBe('deny');
    expect(blocked.reason).toContain('NAC quarantine');
    // Other hosts are unaffected.
    expect(evaluatePacket(fw, testPacketById('web')).verdict).toBe('allow');
    expect(remediateHost(fw, 'PC-7')).toBe(true);
    expect(remediateHost(fw, 'PC-7')).toBe(false);
    expect(evaluatePacket(fw, testPacketById('pc7-web')).verdict).toBe('allow');
  });

  it('matchRule treats any as a wildcard and requires every field otherwise', () => {
    const rule = { srcZone: 'inside', dstZone: 'outside', app: 'HTTPS', port: 443 };
    expect(matchRule(packet(), rule)).toBe(true);
    expect(matchRule(packet({ app: 'SSH' }), rule)).toBe(false);
    expect(matchRule(packet({ srcZone: 'dmz' }), rule)).toBe(false);
    expect(matchRule(packet({ port: 80 }), rule)).toBe(false);
    expect(matchRule(packet(), { ...rule, app: 'any', port: 'any' })).toBe(true);
  });

  it('ngfwConf lists the rules in order, the toggles and the counters', () => {
    const fw = createFirewall();
    evaluatePacket(fw, testPacketById('web'));
    const conf = ngfwConf(fw);
    expect(conf).toContain('ssl-inspection off');
    expect(conf).toContain('ips enabled');
    expect(conf).toContain('implicit deny');
    expect(conf).toContain('permit https inside outside 443');
    expect(conf).toContain('sessions 1 | allow 1');
    fw.sslInspection = true;
    expect(ngfwConf(fw)).toContain('ssl-inspection on');
  });
});
