// Canonical Cisco IOS command sequences for the Operation Broken Shield
// firewall console. Pure functions (no imports, no I/O) so they are unit-
// testable: the console sends each string as one exec call, in order, awaiting
// each before sending the next. The walkthrough order matches the lab's own
// hint text (backend/labs/shells/cisco_ios.py): enable, configure terminal,
// the access-list lines, then end / apply on the destination-facing interface.
//
// The ACL is standard list 10 on R1. It ends with an implicit deny-all, so a
// permit-any line is required or trusted hosts get cut off too — that is
// exactly the mistake the "deny any" sequence demonstrates.

export const GUEST_IP = '192.168.1.20';
export const SERVER_IP = '192.168.2.10';
export const ACL_NUMBER = '10';

/** Deny the untrusted guest host, leaving the rest of the list untouched. */
export function buildDenyGuestCommands() {
  return [
    'enable',
    'configure terminal',
    `access-list ${ACL_NUMBER} deny host ${GUEST_IP}`,
    'end',
  ];
}

/** Permit everything else — required, because a standard ACL ends with an
 *  implicit deny-all. Without this line the trusted PC is cut off too. */
export function buildPermitAnyCommands() {
  return [
    'enable',
    'configure terminal',
    `access-list ${ACL_NUMBER} permit any`,
    'end',
  ];
}

/** Apply list 10 outbound on Gi0/1, the interface facing the server LAN.
 *  Standard ACLs go near the destination. */
export function buildApplyCommands() {
  return [
    'enable',
    'configure terminal',
    'interface gi0/1',
    `ip access-group ${ACL_NUMBER} out`,
    'end',
  ];
}

/** Read back the current access lists. */
export function buildShowAccessListsCommands() {
  return ['show access-lists'];
}

/** The deliberate wrong move: deny everything, then apply it. The student
 *  watches the trusted PC lose the server too. Recovery is NOT re-adding
 *  permit-any — the mock IOS shell has no rule removal and first-match wins,
 *  so a trailing permit-any never fires after a deny-any. Recovery is
 *  buildRecoverAcl20Commands (a corrected list 20 re-applied, which replaces
 *  list 10 on the interface) or resetting the lab. Never sent silently —
 *  the console labels this button as a wrong move. */
export function buildDenyAnyCommands() {
  return [
    'enable',
    'configure terminal',
    `access-list ${ACL_NUMBER} deny any`,
    'end',
  ];
}

/** Recovery from the deny-any wrong move: a corrected standard list 20
 *  (deny the guest, permit everyone else), applied outbound on Gi0/1.
 *  Applying list 20 replaces list 10 on the interface, so the trusted PC
 *  passes again while the guest stays blocked — without resetting the lab. */
export function buildRecoverAcl20Commands() {
  return [
    'enable',
    'configure terminal',
    'access-list 20 deny host 192.168.1.20',
    'access-list 20 permit any',
    'exit',
    'interface gi0/1',
    'ip access-group 20 out',
    'end',
  ];
}

/** Switch console to `host`, then ping the server. Two exec calls, in order. */
export function buildPingCommands(host) {
  return [`connect ${host}`, `ping ${SERVER_IP}`];
}

/** Run a sequence through an exec function one command at a time, awaiting
 *  each. Returns the list of { command, output, exit_code } results. */
export async function runCommandSequence(exec, commands) {
  const results = [];
  for (const command of commands) {
    const res = await exec(command);
    results.push({ command, output: res?.output ?? '', exit_code: res?.exit_code ?? 0 });
  }
  return results;
}
