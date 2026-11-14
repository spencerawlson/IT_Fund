import { describe, it, expect } from 'vitest';
import {
  buildApplyCommands,
  buildDenyAnyCommands,
  buildDenyGuestCommands,
  buildPermitAnyCommands,
  buildRecoverAcl20Commands,
  buildPingCommands,
  buildShowAccessListsCommands,
  runCommandSequence,
  withR1Connect,
  GUEST_IP,
  SERVER_IP,
  ACL_NUMBER,
} from './firewallCommands';

describe('firewallCommands', () => {
  it('deny-guest issues the canonical IOS sequence', () => {
    expect(buildDenyGuestCommands()).toEqual([
      'enable',
      'configure terminal',
      `access-list ${ACL_NUMBER} deny host ${GUEST_IP}`,
      'end',
    ]);
  });

  it('deny-guest rebuilds the list when a permit-any already exists but no deny yet', () => {
    // ACLs match top-down: appending the deny after permit-any never fires
    // (first-match wins) — the live rapid-click bug left the list as
    // [permit any], and re-adding the deny + re-applying did not block the
    // guest. Rebuilding (no access-list, deny, permit) puts the deny first.
    expect(buildDenyGuestCommands({ rebuild: true })).toEqual([
      'enable',
      'configure terminal',
      `no access-list ${ACL_NUMBER}`,
      `access-list ${ACL_NUMBER} deny host ${GUEST_IP}`,
      `access-list ${ACL_NUMBER} permit any`,
      'end',
    ]);
  });

  it('permit-any adds the required permit line (an ACL ends with implicit deny)', () => {
    expect(buildPermitAnyCommands()).toEqual([
      'enable',
      'configure terminal',
      `access-list ${ACL_NUMBER} permit any`,
      'end',
    ]);
  });

  it('apply targets Gi0/1 outbound, near the destination', () => {
    expect(buildApplyCommands()).toEqual([
      'enable',
      'configure terminal',
      'interface gi0/1',
      `ip access-group ${ACL_NUMBER} out`,
      'end',
    ]);
  });

  it('show access-lists is a single read-only command', () => {
    expect(buildShowAccessListsCommands()).toEqual(['show access-lists']);
  });

  it('deny-any rebuilds list 10 so deny-any lands ahead of permit-any', () => {
    // ACLs match top-down: appending deny-any after an existing permit-any
    // was a no-op and the promised outage never happened. The list is
    // rebuilt (no access-list, then deny guest, deny any, permit any) so
    // the trusted PC is cut off too.
    const commands = buildDenyAnyCommands();
    expect(commands).toEqual([
      'enable',
      'configure terminal',
      `no access-list ${ACL_NUMBER}`,
      `access-list ${ACL_NUMBER} deny host ${GUEST_IP}`,
      `access-list ${ACL_NUMBER} deny any`,
      `access-list ${ACL_NUMBER} permit any`,
      'end',
    ]);
    expect(commands.indexOf(`access-list ${ACL_NUMBER} deny any`)).toBeLessThan(
      commands.indexOf(`access-list ${ACL_NUMBER} permit any`),
    );
  });

  it('recover uses a corrected list 20 re-applied — re-adding permit-any cannot fix deny-any', () => {
    // First-match wins, so a trailing permit-any never fires after deny-any.
    // The recovery is a corrected list 20 that replaces list 10 on Gi0/1. No `exit` before the
    // interface: `exit` in global config drops to privileged EXEC, where
    // `interface` is invalid and the apply never happens.
    expect(buildRecoverAcl20Commands()).toEqual([
      'enable',
      'configure terminal',
      'access-list 20 deny host 192.168.1.20',
      'access-list 20 permit any',
      'interface gi0/1',
      'ip access-group 20 out',
      'end',
    ]);
  });

  it('traffic tests connect to the host, then ping the server', () => {
    expect(buildPingCommands('GUEST')).toEqual(['connect GUEST', `ping ${SERVER_IP}`]);
    expect(buildPingCommands('PC1')).toEqual(['connect PC1', `ping ${SERVER_IP}`]);
    expect(SERVER_IP).toBe('192.168.2.10');
    expect(GUEST_IP).toBe('192.168.1.20');
  });

  it('withR1Connect prefixes a sequence with connect R1', () => {
    // Traffic tests leave the console on a PC, where IOS commands fail with
    // "command not found" — firewall buttons must run on the router.
    expect(withR1Connect(['enable', 'end'])).toEqual(['connect R1', 'enable', 'end']);
    expect(withR1Connect([])).toEqual(['connect R1']);
  });

  it('runCommandSequence awaits each command in order', async () => {
    const seen = [];
    const exec = async (command) => {
      seen.push(command);
      return { output: `ok: ${command}`, exit_code: 0 };
    };
    const results = await runCommandSequence(exec, ['enable', 'configure terminal', 'end']);
    expect(seen).toEqual(['enable', 'configure terminal', 'end']);
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ command: 'enable', output: 'ok: enable', exit_code: 0 });
  });

  it('runCommandSequence stops on the first failure', async () => {
    const seen = [];
    const exec = async (command) => {
      seen.push(command);
      if (command === 'configure terminal') throw new Error('boom');
      return { output: '', exit_code: 0 };
    };
    await expect(runCommandSequence(exec, ['enable', 'configure terminal', 'end'])).rejects.toThrow('boom');
    expect(seen).toEqual(['enable', 'configure terminal']);
  });

  it('runCommandSequence retries a transient network failure once and completes', async () => {
    // Regression for the live Apply-after-reset failure (2026-11-13 23:40
    // EST): one exec in the Apply sequence failed with "Failed to fetch"
    // and the whole sequence died with a red error, even though the
    // failure was transient. A single retry of the failed command lets
    // the sequence land; the Apply commands are idempotent, so re-issuing
    // one is safe.
    const seen = [];
    let failedOnce = false;
    const exec = async (command) => {
      seen.push(command);
      if (command === 'interface gi0/1' && !failedOnce) {
        failedOnce = true;
        throw new TypeError('Failed to fetch');
      }
      return { output: '', exit_code: 0 };
    };
    const results = await runCommandSequence(exec, ['connect R1', 'enable', 'configure terminal', 'interface gi0/1', 'ip access-group 10 out', 'end']);
    expect(results).toHaveLength(6);
    expect(seen).toEqual([
      'connect R1', 'enable', 'configure terminal',
      'interface gi0/1', 'interface gi0/1',
      'ip access-group 10 out', 'end',
    ]);
  });

  it('runCommandSequence gives up after one retry and surfaces the error', async () => {
    const seen = [];
    const exec = async (command) => {
      seen.push(command);
      throw new TypeError('Failed to fetch');
    };
    await expect(runCommandSequence(exec, ['enable', 'end'])).rejects.toThrow('Failed to fetch');
    expect(seen).toEqual(['enable', 'enable']);
  });

  it('runCommandSequence does not retry HTTP errors', async () => {
    // A 404 (dead session), 402 or 429 must fail fast: retrying the same
    // dead session is pointless — the session recovery one level up
    // (MissionWorkspace's exec wrapper) owns that case.
    const seen = [];
    const err = new Error('Lab session not found.');
    err.status = 404;
    const exec = async (command) => {
      seen.push(command);
      throw err;
    };
    await expect(runCommandSequence(exec, ['enable', 'end'])).rejects.toThrow('Lab session not found.');
    expect(seen).toEqual(['enable']);
  });
});
