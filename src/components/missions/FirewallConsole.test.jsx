import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import TestRenderer from 'react-test-renderer';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import FirewallConsole, { rulesSummary } from './FirewallConsole';

// react-test-renderer needs the act environment flag in a DOM-less run.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function findButton(renderer, label) {
  return renderer.root.findAllByType('button')
    .find((b) => (b.children || []).some((c) => c === label));
}

describe('rulesSummary', () => {
  it('reads the current rules from the session config', () => {
    expect(rulesSummary({})).toEqual([]);
    expect(rulesSummary({ acl_denies_guest: true })).toEqual(['deny host 192.168.1.20 (GUEST)']);
    expect(rulesSummary({ acl_denies_guest: true, acl_permits_others: true, acl_applied: true })).toEqual([
      'deny host 192.168.1.20 (GUEST)',
      'permit any',
      'applied outbound on Gi0/1',
    ]);
  });
});

describe('FirewallConsole', () => {
  it('runs every button sequence on R1, even after a traffic test left the console on a PC', () => {
    // The traffic tests connect the console to PC1/GUEST, where IOS commands
    // fail — the console prefixes `connect R1` via withR1Connect.
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'FirewallConsole.jsx'), 'utf8');
    expect(src).toContain('withR1Connect');
    expect(src).toContain('runCommandSequence(onExec, withR1Connect(commands))');
  });

  it('renders the rule buttons and the empty-rules state (SSR smoke)', () => {
    const html = renderToString(<FirewallConsole rules={{}} onExec={async () => ({ output: '' })} />);
    expect(html).toContain('Deny guest');
    expect(html).toContain('Permit any');
    expect(html).toContain('Apply to Gi0/1 out');
    expect(html).toContain('Show access-lists');
    expect(html).toContain('No ACL rules configured yet');
  });

  it('shows the configured rules and the deliberate wrong move', () => {
    const html = renderToString(
      <FirewallConsole
        rules={{ acl_denies_guest: true, acl_permits_others: true }}
        onExec={async () => ({ output: '' })}
        onReset={() => {}}
        onInspectFirewall={() => {}}
      />,
    );
    expect(html).toContain('deny host 192.168.1.20 (GUEST)');
    expect(html).toContain('permit any');
    expect(html).toContain('Try deny-any');
    expect(html).toContain('Reset the lab');
    expect(html).toContain('Inspect firewall');
  });

  it('ignores a second rapid tap while a sequence is running and disables the buttons', async () => {
    // Regression for the live rapid-click bug: tapping "Deny guest" then
    // "Permit any" in quick succession started two concurrent sequences,
    // and the second sequence's `connect R1` reset the shared shell mode
    // mid-flight, so the first sequence's access-list line was rejected
    // with "% Invalid input detected" and the deny rule never landed.
    const seen = [];
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const onExec = async (command) => {
      seen.push(command);
      await gate; // hold the first exec open: the sequence stays in flight
      return { output: '', exit_code: 0 };
    };
    let renderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(<FirewallConsole rules={{}} onExec={onExec} />);
    });
    const deny = findButton(renderer, 'Deny guest');
    const permit = findButton(renderer, 'Permit any');
    expect(deny).toBeTruthy();
    expect(permit).toBeTruthy();
    // First tap starts the deny sequence; the first exec stays in flight.
    await TestRenderer.act(async () => { deny.props.onClick(); });
    // Second tap while it runs: ignored — no further exec calls.
    await TestRenderer.act(async () => { permit.props.onClick(); });
    expect(seen).toEqual(['connect R1']);
    // Every action button is disabled while a sequence runs.
    expect(findButton(renderer, 'Permit any').props.disabled).toBe(true);
    expect(findButton(renderer, 'Apply to Gi0/1 out').props.disabled).toBe(true);
    expect(findButton(renderer, 'Show access-lists').props.disabled).toBe(true);
    // Let the sequence finish so no state updates leak past the test.
    await TestRenderer.act(async () => { release(); });
    await TestRenderer.act(async () => { });
    TestRenderer.act(() => { renderer.unmount(); });
  });

  it('deny rebuilds the list when permit-any exists but no deny yet', async () => {
    // The list is [permit any] (the deny was lost) — appending the deny
    // after it never fires (first-match wins), so the button rebuilds the
    // list with the deny first and the permit re-added behind it.
    const seen = [];
    const onExec = async (command) => {
      seen.push(command);
      return { output: '', exit_code: 0 };
    };
    let renderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <FirewallConsole rules={{ acl_permits_others: true }} onExec={onExec} />,
      );
    });
    const deny = findButton(renderer, 'Deny guest');
    await TestRenderer.act(async () => { await deny.props.onClick(); });
    // Literal sequence: the deny lands first, the permit is re-added behind
    // it (asserted literally, not via the builder, so this test fails
    // independently of the builder's unit test).
    expect(seen).toEqual([
      'connect R1',
      'enable',
      'configure terminal',
      'no access-list 10',
      'access-list 10 deny host 192.168.1.20',
      'access-list 10 permit any',
      'end',
    ]);
    TestRenderer.act(() => { renderer.unmount(); });
  });
});
