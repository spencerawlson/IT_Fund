import React, { useState } from 'react';
import { ShieldCheck, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui-glass';
import {
  buildApplyCommands,
  buildDenyAnyCommands,
  buildDenyGuestCommands,
  buildPermitAnyCommands,
  buildRecoverAcl20Commands,
  buildShowAccessListsCommands,
  runCommandSequence,
  withR1Connect,
} from './firewallCommands';

// Firewall console for Operation Broken Shield: buttons that issue the
// canonical IOS commands through onExec (one exec call per command, in
// order), plus a live read-back of the current rules from the lab session.
// The console never invents state — `rules` is the session's own
// findings.config, refreshed after every exec/validate.
//
// The "Try deny-any" button is the deliberate wrong move: it rebuilds list 10
// with deny-any ahead of permit-any, so the student watches the trusted PC
// lose the server too. Recovery is "Recover with ACL 20" (a corrected list 20
// re-applied, replacing list 10 on the interface) or "Reset the lab"
// (labsApi.reset via onReset). Re-adding permit-any does NOT recover —
// first-match wins, so a trailing permit-any never fires after a deny-any.
// Every button sequence is prefixed with `connect R1`: the traffic tests
// leave the console on a PC, and IOS commands on a PC console fail.

// findings.config keys (validators) -> human-readable rule lines.
const RULE_LINES = [
  ['acl_denies_guest', 'deny host 192.168.1.20 (GUEST)'],
  ['acl_permits_others', 'permit any'],
  ['acl_applied', 'applied outbound on Gi0/1'],
];

export function rulesSummary(config = {}) {
  return RULE_LINES.filter(([key]) => config[key]).map(([, label]) => label);
}

export default function FirewallConsole({
  rules = {},
  onExec,
  onReset,
  onInspectFirewall,
  busy = false,
  disabled = false,
}) {
  const [running, setRunning] = useState(null);
  const [lastOutput, setLastOutput] = useState('');
  const [error, setError] = useState('');

  const run = async (name, commands) => {
    if (!onExec || busy || disabled) return;
    setRunning(name);
    setError('');
    try {
      const results = await runCommandSequence(onExec, withR1Connect(commands));
      setLastOutput(results.map((r) => r.output).filter(Boolean).join('\n'));
    } catch (e) {
      setError(e.message || 'Command failed.');
    } finally {
      setRunning(null);
    }
  };

  const active = rulesSummary(rules);
  const isRunning = (name) => running === name;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-black/10 bg-white/60 p-3">
        <h3 className="text-small font-semibold text-ink-1">Current rules — access-list 10 on R1</h3>
        {active.length > 0 ? (
          <ul className="mt-2 space-y-1 text-small text-ink-2">
            {active.map((line) => (
              <li key={line} className="font-mono">• {line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-small text-ink-2">No ACL rules configured yet. The list is empty — all traffic passes.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={ShieldCheck} onClick={() => run('deny-guest', buildDenyGuestCommands())} loading={isRunning('deny-guest')} disabled={busy || disabled}>
          Deny guest
        </Button>
        <Button size="sm" variant="secondary" onClick={() => run('permit-any', buildPermitAnyCommands())} loading={isRunning('permit-any')} disabled={busy || disabled}>
          Permit any
        </Button>
        <Button size="sm" variant="secondary" onClick={() => run('apply', buildApplyCommands())} loading={isRunning('apply')} disabled={busy || disabled}>
          Apply to Gi0/1 out
        </Button>
        <Button size="sm" variant="ghost" onClick={() => run('show', buildShowAccessListsCommands())} loading={isRunning('show')} disabled={busy || disabled}>
          Show access-lists
        </Button>
        {onInspectFirewall && (
          <Button size="sm" variant="ghost" icon={Eye} onClick={onInspectFirewall} disabled={busy || disabled}>
            Inspect firewall
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
        <p className="text-small font-semibold text-ink-1">Deliberate wrong move — try it, watch the consequence, recover</p>
        <p className="mt-1 text-small text-ink-2">
          Deny-any blocks <em>everyone</em>, including the trusted PC. Run it, ping from PC1 to see the
          outage, then recover with a corrected list 20 — or reset the lab to start over.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => run('deny-any', [...buildDenyAnyCommands(), ...buildApplyCommands()])} loading={isRunning('deny-any')} disabled={busy || disabled}>
            Try deny-any
          </Button>
          <Button size="sm" variant="secondary" onClick={() => run('recover-acl20', buildRecoverAcl20Commands())} loading={isRunning('recover-acl20')} disabled={busy || disabled}>
            Recover with ACL 20
          </Button>
          {onReset && (
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={onReset} disabled={busy || disabled}>
              Reset the lab
            </Button>
          )}
        </div>
      </div>

      {lastOutput && (
        <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-black/10 bg-terminal-bg p-3 font-mono text-[12px] leading-relaxed text-terminal-text">
          {lastOutput}
        </pre>
      )}
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
