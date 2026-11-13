import React, { useState } from 'react';
import { Button } from '@/components/ui-glass';

// Incident report for Operation Broken Shield: what happened, why, and the
// fix. Submitting saves the report to the attempt (document action) and then
// files it (submit_report action) — the parent owns both calls, so the form
// stays a dumb controlled form. The server is the gate for submit_report:
// if objectives are still open it returns the missing list, shown here.
// `canSubmit` is a client-side hint only (8 other objectives passing).
// Drafts autosave through `onDraftChange` (debounced by the parent) and
// `onDraftBlur` (flush); filing still goes through `onSubmit` only. The
// parent owns the network calls, so the form stays a dumb controlled form.

export function reportIsComplete({ summary = '', root_cause = '', fix = '' } = {}) {
  return [summary, root_cause, fix].every((v) => v.trim().length > 0);
}

export default function IncidentReportForm({
  initial = {},
  onSubmit,
  onDraftChange,
  onDraftBlur,
  canSubmit = false,
  busy = false,
  disabled = false,
  serverError = '',
}) {
  const [summary, setSummary] = useState(initial.summary || '');
  const [rootCause, setRootCause] = useState(initial.root_cause || '');
  const [fix, setFix] = useState(initial.fix || '');
  const [error, setError] = useState('');

  // Notify the parent of the current text so it can autosave the draft.
  // Typing stays local; the parent owns the network call.
  const emitDraft = (next) => {
    if (typeof onDraftChange === 'function') onDraftChange(next);
  };
  const changeSummary = (value) => {
    setSummary(value);
    emitDraft({ summary: value, root_cause: rootCause, fix });
  };
  const changeRootCause = (value) => {
    setRootCause(value);
    emitDraft({ summary, root_cause: value, fix });
  };
  const changeFix = (value) => {
    setFix(value);
    emitDraft({ summary, root_cause: rootCause, fix: value });
  };
  const flushDraft = () => {
    if (typeof onDraftBlur === 'function') onDraftBlur({ summary, root_cause: rootCause, fix });
  };

  const complete = reportIsComplete({ summary, root_cause: rootCause, fix });
  const blocked = !complete || !canSubmit || busy || disabled;

  const submit = async (e) => {
    e.preventDefault();
    if (blocked || !onSubmit) return;
    setError('');
    try {
      await onSubmit({ summary: summary.trim(), root_cause: rootCause.trim(), fix: fix.trim() });
    } catch (err) {
      setError(err.message || 'Could not file the report.');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="mission-report-summary" className="block text-small font-semibold text-ink-1">
          What happened?
        </label>
        <textarea
          id="mission-report-summary"
          value={summary}
          onChange={(e) => changeSummary(e.target.value)}
          onBlur={flushDraft}
          rows={2}
          disabled={busy || disabled}
          placeholder="e.g. The guest host could reach the internal server — the firewall had no ACL."
          className="mt-1 w-full rounded-control border border-black/15 bg-white/80 px-3 py-2 text-body text-ink-1 outline-none focus:border-violet-500"
        />
      </div>
      <div>
        <label htmlFor="mission-report-cause" className="block text-small font-semibold text-ink-1">
          Root cause
        </label>
        <textarea
          id="mission-report-cause"
          value={rootCause}
          onChange={(e) => changeRootCause(e.target.value)}
          onBlur={flushDraft}
          rows={2}
          disabled={busy || disabled}
          placeholder="e.g. No access list on R1, so nothing filtered guest traffic from the server LAN."
          className="mt-1 w-full rounded-control border border-black/15 bg-white/80 px-3 py-2 text-body text-ink-1 outline-none focus:border-violet-500"
        />
      </div>
      <div>
        <label htmlFor="mission-report-fix" className="block text-small font-semibold text-ink-1">
          The fix
        </label>
        <textarea
          id="mission-report-fix"
          value={fix}
          onChange={(e) => changeFix(e.target.value)}
          onBlur={flushDraft}
          rows={2}
          disabled={busy || disabled}
          placeholder="e.g. Standard ACL 10 denies 192.168.1.20, permits everything else, applied outbound on Gi0/1."
          className="mt-1 w-full rounded-control border border-black/15 bg-white/80 px-3 py-2 text-body text-ink-1 outline-none focus:border-violet-500"
        />
      </div>
      {!canSubmit && (
        <p className="text-small text-ink-2">
          Finish the other objectives first — the report files once the topology, firewall and traffic checks pass.
          Run <code>objectives</code> in the Mission Console to see what is still open.
        </p>
      )}
      {(error || serverError) && (
        <p className="text-small text-danger" role="alert">{error || serverError}</p>
      )}
      {/* type="submit" is load-bearing: the shared Button hardcodes
          type="button", so without it this button never submits the form and
          the report can never be filed (the form has only textareas, so Enter
          cannot submit it either). */}
      <Button type="submit" size="lg" loading={busy} disabled={blocked} className="w-full">
        File incident report
      </Button>
    </form>
  );
}
