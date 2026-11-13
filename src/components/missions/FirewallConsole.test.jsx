import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import FirewallConsole, { rulesSummary } from './FirewallConsole';

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
});
