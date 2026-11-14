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

/** Deny the untrusted guest host, leaving the rest of the list untouched.
 *  Pass { rebuild: true } when a permit-any line already exists but no deny
 *  yet: ACLs match top-down, so appending the deny AFTER permit-any would
 *  never fire (first-match wins) — the live rapid-click bug left the list
 *  as [permit any], and re-adding the deny + re-applying did not block the
 *  guest. Rebuilding (no access-list, deny, permit) puts the deny first.
 *  The caller decides from the read-back: rebuild only when permit-any is
 *  present and no deny is — in the deny-any wrong-move state a deny IS
 *  present, so the plain append runs and the wrong move stays in effect
 *  until the proper recovery (ACL 20 or reset). */
export function buildDenyGuestCommands({ rebuild = false } = {}) {
  if (rebuild) {
    return [
      'enable',
      'configure terminal',
      `no access-list ${ACL_NUMBER}`,
      `access-list ${ACL_NUMBER} deny host ${GUEST_IP}`,
      `access-list ${ACL_NUMBER} permit any`,
      'end',
    ];
  }
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
 *  watches the trusted PC lose the server too. The list is REBUILT so the
 *  deny-any line lands ahead of permit-any: ACLs match top-down, so appending
 *  deny-any after an existing permit-any was a no-op and the promised outage
 *  never happened. Recovery is NOT re-adding permit-any — first-match wins,
 *  so a trailing permit-any never fires after a deny-any. Recovery is
 *  buildRecoverAcl20Commands (a corrected list 20 re-applied, which replaces
 *  list 10 on the interface) or resetting the lab. Never sent silently —
 *  the console labels this button as a wrong move. */
export function buildDenyAnyCommands() {
  return [
    'enable',
    'configure terminal',
    `no access-list ${ACL_NUMBER}`,
    `access-list ${ACL_NUMBER} deny host ${GUEST_IP}`,
    `access-list ${ACL_NUMBER} deny any`,
    `access-list ${ACL_NUMBER} permit any`,
    'end',
  ];
}

/** Recovery from the deny-any wrong move: a corrected standard list 20
 *  (deny the guest, permit everyone else), applied outbound on Gi0/1.
 *  Applying list 20 replaces list 10 on the interface, so the trusted PC
 *  passes again while the guest stays blocked — without resetting the lab.
 *  No `exit` between the ACL lines and the interface: `exit` in global
 *  config drops back to privileged EXEC, where `interface` is invalid and
 *  the apply silently never happens (the trusted PC stayed blocked). */
export function buildRecoverAcl20Commands() {
  return [
    'enable',
    'configure terminal',
    'access-list 20 deny host 192.168.1.20',
    'access-list 20 permit any',
    'interface gi0/1',
    'ip access-group 20 out',
    'end',
  ];
}

/** Switch console to `host`, then ping the server. Two exec calls, in order. */
export function buildPingCommands(host) {
  return [`connect ${host}`, `ping ${SERVER_IP}`];
}

/** Prefix a command sequence with `connect R1`, so firewall buttons always
 *  run on the router even after a traffic test left the console on a PC
 *  (IOS commands on a PC console fail with "command not found"). */
export function withR1Connect(commands) {
  return ['connect R1', ...commands];
}

/** Run a sequence through an exec function one command at a time, awaiting
 *  each. Returns the list of { command, output, exit_code } results.
 *
 *  A failed command is retried ONCE when the failure is a transient network
 *  error (fetch rejecting with TypeError "Failed to fetch"): the live
 *  Apply-after-reset failure (2026-11-13) was one exec in the Apply
 *  sequence dying that way and killing the whole sequence with a red error,
 *  even though the next attempt would have landed. The console's commands
 *  are idempotent (connect/enable/interface/ip access-group/end re-issue
 *  cleanly; a re-issued access-list line at worst duplicates a rule, which
 *  first-match makes harmless), so re-issuing the failed one is safe.
 *  HTTP errors (404 dead session, 402, 429, ...) are NOT retried — they
 *  fail fast; a dead session is recovered one level up, in
 *  MissionWorkspace's exec wrapper. */
export async function runCommandSequence(exec, commands) {
  const results = [];
  for (const command of commands) {
    let retries = 0;
    for (;;) {
      try {
        const res = await exec(command);
        results.push({ command, output: res?.output ?? '', exit_code: res?.exit_code ?? 0 });
        break;
      } catch (e) {
        const transient = e instanceof TypeError || /failed to fetch/i.test(e?.message || '');
        if (transient && retries < 1) {
          retries += 1;
          continue;
        }
        throw e;
      }
    }
  }
  return results;
}
