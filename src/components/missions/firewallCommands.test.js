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
});
