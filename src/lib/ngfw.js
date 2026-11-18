// NGFW simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "Next-Gen Firewall" (src/components/viz) drives
// this engine for its interactive simulator.
//
// Model (from the net-security lesson):
// - One box does stateful inspection + deep packet inspection +
//   application awareness + IPS, with zone-based policy (inside / DMZ /
//   outside) and a screened subnet (DMZ) between two filtering points.
// - ACL rules are evaluated top-down and the FIRST match wins; anything
//   not explicitly allowed hits the implicit deny (default deny, least
//   privilege).
// - The firewall is stateful: it tracks sessions, and return traffic is
//   allowed only when it belongs to an open session.
// - IPS prevents (IDS only detects). An exploit hidden inside HTTPS can
//   only be inspected when SSL inspection is on; with it off the IPS is
//   blind to encrypted payloads. Plain (unencrypted) exploits are always
//   visible to the IPS.
// - Outbound traffic from the inside is NATed to the WAN address.
// - NAC quarantines a non-compliant host: it cannot reach anything until
//   it is remediated.

export const ZONES = ['inside', 'dmz', 'outside'];

export const ZONE_LABELS = {
  inside: 'Inside',
  dmz: 'DMZ',
  outside: 'Outside',
};

export const ZONE_NETWORKS = {
  inside: '10.0.1.0/24',
  dmz: '10.0.2.0/24',
  outside: '203.0.113.0/24 (WAN)',
};

export const WAN_IP = '203.0.113.5';

/** Applications the firewall can identify — by app, not just by port. */
export const APPS = [
  { id: 'any', label: 'Any app', port: 'any' },
  { id: 'HTTPS', label: 'HTTPS (web)', port: 443 },
  { id: 'HTTP', label: 'HTTP (web)', port: 80 },
  { id: 'SSH', label: 'SSH', port: 22 },
  { id: 'DNS', label: 'DNS', port: 53 },
  { id: 'FTP', label: 'FTP', port: 21 },
  { id: 'MSSQL', label: 'MSSQL (database)', port: 1433 },
];

export function appById(id) {
  return APPS.find((a) => a.id === id) || null;
}

/** How long an open session lives, in simulator ticks. */
export const SESSION_TTL_TICKS = 24;

/** The default rule base, in evaluation order. Rule 2 is the SSH deny the
 * rule-ordering drill is built around: a too-broad allow placed above it
 * breaks it, because the first match wins. */
export function createRules() {
  return [
    { id: 'r1', name: 'LAN→DMZ web', action: 'allow', srcZone: 'inside', dstZone: 'dmz', app: 'HTTPS', port: 443, note: 'Web server in the DMZ' },
    { id: 'r2', name: 'SSH out', action: 'deny', srcZone: 'inside', dstZone: 'outside', app: 'SSH', port: 22, note: 'No SSH to the internet' },
    { id: 'r3', name: 'LAN→web', action: 'allow', srcZone: 'inside', dstZone: 'outside', app: 'HTTPS', port: 443, note: 'Web browsing' },
    { id: 'r4', name: 'Net→DMZ', action: 'allow', srcZone: 'outside', dstZone: 'dmz', app: 'HTTPS', port: 443, note: 'Public web server' },
    { id: 'r5', name: 'DMZ→LAN', action: 'deny', srcZone: 'dmz', dstZone: 'inside', app: 'any', port: 'any', note: 'A DMZ host can never reach the LAN' },
    { id: 'r6', name: 'LAN→DNS', action: 'allow', srcZone: 'inside', dstZone: 'outside', app: 'DNS', port: 53, note: 'DNS lookups' },
  ];
}

/** Hosts the simulator knows about. PC-7 is unpatched, so the NAC check
 * quarantines it. */
export function createHosts() {
  return [
    { id: 'PC-1', ip: '10.0.1.10', zone: 'inside', compliant: true, quarantined: false },
    { id: 'PC-7', ip: '10.0.1.7', zone: 'inside', compliant: false, quarantined: false },
    { id: 'WEB-1', ip: '10.0.2.10', zone: 'dmz', compliant: true, quarantined: false },
    { id: 'DB-1', ip: '10.0.1.20', zone: 'inside', compliant: true, quarantined: false },
  ];
}

export function hostById(fw, hostId) {
  return fw.hosts.find((h) => h.id === hostId) || null;
}

/** A fresh firewall: default rules, no sessions, SSL inspection off, IPS on. */
export function createFirewall() {
  return {
    rules: createRules(),
    hosts: createHosts(),
    sessions: [],
    sslInspection: false,
    ipsEnabled: true,
    counters: { allowed: 0, denied: 0, blocked: 0, nat: 0, sessionsOpened: 0 },
    nextRuleId: 7,
    nextSessionId: 1,
  };
}

/** Does this packet match this rule? 'any' matches everything. */
export function matchRule(packet, rule) {
  if (rule.srcZone !== 'any' && rule.srcZone !== packet.srcZone) return false;
  if (rule.dstZone !== 'any' && rule.dstZone !== packet.dstZone) return false;
  if (rule.app !== 'any' && rule.app !== packet.app) return false;
  if (rule.port !== 'any' && rule.port !== packet.port) return false;
  return true;
}

/** The open session a return packet belongs to, if any. A return packet
 * swaps source and destination relative to the outbound packet that
 * opened the session. */
export function findSession(fw, packet) {
  return fw.sessions.find(
    (s) => s.src === packet.dst && s.dst === packet.src && s.app === packet.app && s.port === packet.port,
  ) || null;
}

function openSession(fw, packet) {
  const existing = fw.sessions.find(
    (s) => s.src === packet.src && s.dst === packet.dst && s.app === packet.app && s.port === packet.port,
  );
  if (existing) {
    existing.ageTicks = 0;
    return existing;
  }
  const session = {
    id: `s${fw.nextSessionId}`,
    src: packet.src,
    dst: packet.dst,
    srcZone: packet.srcZone,
    dstZone: packet.dstZone,
    app: packet.app,
    port: packet.port,
    ageTicks: 0,
  };
  fw.nextSessionId += 1;
  fw.sessions.push(session);
  fw.counters.sessionsOpened += 1;
  return session;
}

/** Close one session by id. Returns true when a session was closed. */
export function closeSession(fw, sessionId) {
  const index = fw.sessions.findIndex((s) => s.id === sessionId);
  if (index === -1) return false;
  fw.sessions.splice(index, 1);
  return true;
}

/** Age every session by one tick and drop the ones past their TTL.
 * Returns the expired sessions. */
export function tickSessions(fw) {
  const expired = [];
  fw.sessions = fw.sessions.filter((s) => {
    s.ageTicks += 1;
    if (s.ageTicks > SESSION_TTL_TICKS) {
      expired.push(s);
      return false;
    }
    return true;
  });
  return expired;
}

export function openSessionCount(fw) {
  return fw.sessions.length;
}

/**
 * Evaluate one packet against the firewall. Mutates the firewall (opens a
 * session for allowed outbound traffic, updates counters) and returns
 * { verdict: 'allow' | 'deny' | 'blocked', ruleId, ruleIndex, ruleName,
 *   reason, detail, sessionId, natApplied, stateful }.
 *
 * Order of checks: stateful return traffic first, then NAC quarantine,
 * then the rule base top-down (first match wins), then IPS inspection of
 * allowed traffic, then the implicit deny.
 */
export function evaluatePacket(fw, packet) {
  // 1. Stateful return traffic: allowed only on an open session.
  if (packet.return) {
    const session = findSession(fw, packet);
    if (session) {
      session.ageTicks = 0;
      fw.counters.allowed += 1;
      return {
        verdict: 'allow', ruleId: null, ruleIndex: null, ruleName: null,
        reason: 'stateful — return traffic on an open session',
        detail: `Session ${session.id} (${session.src} → ${session.dst}, ${session.app}) is open, so the reply is allowed.`,
        sessionId: session.id, natApplied: false, stateful: true,
      };
    }
    fw.counters.denied += 1;
    return {
      verdict: 'deny', ruleId: null, ruleIndex: null, ruleName: null,
      reason: 'no open session — unsolicited inbound traffic',
      detail: 'The stateful firewall drops return traffic that does not belong to an open session.',
      sessionId: null, natApplied: false, stateful: true,
    };
  }

  // 2. NAC: a quarantined host is isolated until remediated.
  if (packet.srcHost) {
    const host = hostById(fw, packet.srcHost);
    if (host && host.quarantined) {
      fw.counters.denied += 1;
      return {
        verdict: 'deny', ruleId: null, ruleIndex: null, ruleName: null,
        reason: 'NAC quarantine — host is isolated',
        detail: `${host.id} (${host.ip}) failed the NAC check and sits in the quarantine VLAN until remediated.`,
        sessionId: null, natApplied: false, stateful: false,
      };
    }
  }

  // 3. Rule base, top-down — the first match wins.
  for (let i = 0; i < fw.rules.length; i += 1) {
    const rule = fw.rules[i];
    if (!matchRule(packet, rule)) continue;
    if (rule.action === 'deny') {
      fw.counters.denied += 1;
      return {
        verdict: 'deny', ruleId: rule.id, ruleIndex: i + 1, ruleName: rule.name,
        reason: `denied by Rule ${i + 1}`,
        detail: `${rule.name} — ${rule.note}. Rules below it are never evaluated.`,
        sessionId: null, natApplied: false, stateful: false,
      };
    }
    // 4. Allowed by a rule — but the IPS still inspects the payload.
    if (packet.exploit && fw.ipsEnabled) {
      if (packet.app === 'HTTPS' && !fw.sslInspection) {
        // Encrypted payload, inspection off: the IPS cannot see the
        // exploit, so the packet passes — the classic SSL blind spot.
        fw.counters.allowed += 1;
        const session = packet.srcZone === 'inside' ? openSession(fw, packet) : null;
        return {
          verdict: 'allow', ruleId: rule.id, ruleIndex: i + 1, ruleName: rule.name,
          reason: `allowed by Rule ${i + 1} — IPS blind: SSL inspection is off`,
          detail: 'The exploit hides inside encrypted HTTPS and SSL inspection is off, so the IPS never sees the payload.',
          sessionId: session ? session.id : null, natApplied: false, stateful: false,
        };
      }
      fw.counters.blocked += 1;
      return {
        verdict: 'blocked', ruleId: rule.id, ruleIndex: i + 1, ruleName: rule.name,
        reason: 'blocked by IPS — exploit signature matched',
        detail: `Allowed by Rule ${i + 1}, then the IPS matched a known exploit signature and dropped the packet.`,
        sessionId: null, natApplied: false, stateful: false,
      };
    }
    fw.counters.allowed += 1;
    const natApplied = packet.srcZone === 'inside' && packet.dstZone === 'outside';
    if (natApplied) fw.counters.nat += 1;
    const session = packet.srcZone !== packet.dstZone ? openSession(fw, packet) : null;
    return {
      verdict: 'allow', ruleId: rule.id, ruleIndex: i + 1, ruleName: rule.name,
      reason: `allowed by Rule ${i + 1}`,
      detail: natApplied
        ? `NAT: ${packet.src} → ${WAN_IP} on the way out.`
        : `${rule.name} — ${rule.note}.`,
      sessionId: session ? session.id : null, natApplied, stateful: false,
    };
  }

  // 5. No rule matched: the implicit deny.
  fw.counters.denied += 1;
  return {
    verdict: 'deny', ruleId: null, ruleIndex: null, ruleName: null,
    reason: 'denied by the implicit deny — default deny',
    detail: 'No rule explicitly allows this traffic, so the implicit deny at the end of the list drops it.',
    sessionId: null, natApplied: false, stateful: false,
  };
}

/** Append (or insert at the top of) a rule. Returns the new rule. */
export function addRule(fw, spec, position = 'bottom') {
  const app = appById(spec.app) || appById('any');
  const rule = {
    id: `r${fw.nextRuleId}`,
    name: spec.name || `${spec.action === 'deny' ? 'Deny' : 'Allow'} ${ZONE_LABELS[spec.srcZone] || spec.srcZone} → ${ZONE_LABELS[spec.dstZone] || spec.dstZone} ${spec.app}`,
    action: spec.action,
    srcZone: spec.srcZone,
    dstZone: spec.dstZone,
    app: spec.app,
    port: spec.port !== undefined ? spec.port : app.port,
    note: spec.note || 'Added by hand',
  };
  fw.nextRuleId += 1;
  if (position === 'top') fw.rules.unshift(rule);
  else fw.rules.push(rule);
  return rule;
}

/** Delete a rule by id. Returns true when a rule was removed. */
export function deleteRule(fw, ruleId) {
  const index = fw.rules.findIndex((r) => r.id === ruleId);
  if (index === -1) return false;
  fw.rules.splice(index, 1);
  return true;
}

/** Move a rule one step up or down the list. Returns true when it moved. */
export function moveRule(fw, ruleId, direction) {
  const index = fw.rules.findIndex((r) => r.id === ruleId);
  if (index === -1) return false;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= fw.rules.length) return false;
  const [rule] = fw.rules.splice(index, 1);
  fw.rules.splice(target, 0, rule);
  return true;
}

/** Run the NAC check: quarantine every non-compliant host. Returns the
 * quarantined host ids. */
export function runNacCheck(fw) {
  const quarantined = [];
  for (const host of fw.hosts) {
    if (!host.compliant && !host.quarantined) {
      host.quarantined = true;
      quarantined.push(host.id);
    }
  }
  return quarantined;
}

/** Remediate a quarantined host so it can reach the network again. */
export function remediateHost(fw, hostId) {
  const host = hostById(fw, hostId);
  if (!host || !host.quarantined) return false;
  host.quarantined = false;
  host.compliant = true;
  return true;
}

/** The test packets the simulator sends — the same set the live traffic
 * cycles through. */
export const TEST_PACKETS = [
  { id: 'web', name: 'Web browsing (LAN → internet HTTPS)', srcZone: 'inside', dstZone: 'outside', app: 'HTTPS', port: 443, src: '10.0.1.10', dst: '93.184.216.34', srcHost: 'PC-1' },
  { id: 'ssh', name: 'SSH to the internet (LAN → internet SSH)', srcZone: 'inside', dstZone: 'outside', app: 'SSH', port: 22, src: '10.0.1.10', dst: '93.184.216.34', srcHost: 'PC-1' },
  { id: 'dns', name: 'DNS lookup (LAN → internet DNS)', srcZone: 'inside', dstZone: 'outside', app: 'DNS', port: 53, src: '10.0.1.10', dst: '8.8.8.8', srcHost: 'PC-1' },
  { id: 'dmz-web', name: 'Internet → DMZ web server (HTTPS)', srcZone: 'outside', dstZone: 'dmz', app: 'HTTPS', port: 443, src: '198.51.100.7', dst: '10.0.2.10' },
  { id: 'dmz-lan', name: 'DMZ server → LAN database (MSSQL)', srcZone: 'dmz', dstZone: 'inside', app: 'MSSQL', port: 1433, src: '10.0.2.10', dst: '10.0.1.20' },
  { id: 'ftp', name: 'FTP to the internet (LAN → internet FTP)', srcZone: 'inside', dstZone: 'outside', app: 'FTP', port: 21, src: '10.0.1.10', dst: '93.184.216.34', srcHost: 'PC-1' },
  { id: 'https-exploit', name: 'Exploit inside HTTPS (LAN → internet)', srcZone: 'inside', dstZone: 'outside', app: 'HTTPS', port: 443, src: '10.0.1.10', dst: '93.184.216.34', srcHost: 'PC-1', exploit: true },
  { id: 'http-exploit', name: 'Exploit over plain HTTP (LAN → internet)', srcZone: 'inside', dstZone: 'outside', app: 'HTTP', port: 80, src: '10.0.1.10', dst: '93.184.216.34', srcHost: 'PC-1', exploit: true },
  { id: 'return', name: 'Return traffic (reply from the internet)', srcZone: 'outside', dstZone: 'inside', app: 'HTTPS', port: 443, src: '93.184.216.34', dst: '10.0.1.10', return: true },
  { id: 'pc7-web', name: 'Unpatched PC-7 → internet HTTPS (NAC)', srcZone: 'inside', dstZone: 'outside', app: 'HTTPS', port: 443, src: '10.0.1.7', dst: '93.184.216.34', srcHost: 'PC-7' },
];

export function testPacketById(id) {
  return TEST_PACKETS.find((p) => p.id === id) || null;
}

/** `show running-config` for the NGFW, as the CLI prints it. */
export function ngfwConf(fw) {
  const lines = [
    'NGFW-1# show running-config',
    'hostname NGFW-1',
    'zone inside  10.0.1.0/24',
    'zone dmz     10.0.2.0/24',
    'zone outside 203.0.113.0/24',
    'ip nat inside overload',
    `ssl-inspection ${fw.sslInspection ? 'on' : 'off'}`,
    `ips ${fw.ipsEnabled ? 'enabled' : 'DISABLED'}`,
    'access-list NGFW-IN',
  ];
  fw.rules.forEach((rule, i) => {
    const port = rule.port === 'any' ? 'any' : String(rule.port);
    const app = rule.app === 'any' ? 'ip' : rule.app.toLowerCase();
    lines.push(`${String(i + 1)} ${rule.action === 'allow' ? 'permit' : 'deny  '} ${app} ${rule.srcZone} ${rule.dstZone} ${port}`);
  });
  lines.push('deny ip any any  # implicit deny');
  lines.push(`sessions ${fw.sessions.length} | allow ${fw.counters.allowed} | deny ${fw.counters.denied} | block ${fw.counters.blocked}`);
  return lines.join('\n');
}
