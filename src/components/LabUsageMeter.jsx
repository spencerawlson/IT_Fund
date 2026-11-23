import React from 'react';
import { ProgressBar } from '@/components/ui-glass';
import {
  ALLOWANCE_SECONDS,
  LAB_USAGE_WARN_15H_SECONDS,
  LAB_USAGE_WARN_18H_SECONDS,
} from '@/lib/subscription';

// Phase 0 lab-hours meter ("measure, don't charge"): shows a subscriber how
// much of their 20 included Docker lab-hours they have used this period.
// No dollar amounts exist in this phase — the copy never mentions money,
// billing, or invoices; the overage line says plainly that billing isn't
// live yet and this is a preview of usage.
//
// usage tri-state (from useLabUsage):
//   undefined → still loading: renders nothing (no flash, no layout shift)
//   null      → the fetch failed: a muted "Lab usage unavailable" line that
//               never blocks the page
//   { metered: false } → free tier / guest: renders nothing (no meter)
//   { metered: true, ... } → the meter + warnings at 15h / 18h / 20h.

/** "7h 20m" for 26400 seconds; minutes are floored, never rounded up. */
export function formatHours(seconds) {
  const totalMinutes = Math.floor((Number(seconds) || 0) / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function formatResetDate(resetsAt) {
  if (!resetsAt) return null;
  const d = new Date(resetsAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function LabUsageMeter({ usage, compact = false }) {
  if (usage === undefined) return null;
  if (usage === null) {
    return <p className="text-small text-ink-3">Lab usage unavailable</p>;
  }
  if (!usage.metered) return null;

  const used = usage.usedSeconds || 0;
  const allowance = usage.allowanceSeconds || ALLOWANCE_SECONDS;
  const over = Math.max(0, used - allowance);
  const percent = Math.min(100, Math.round((used / allowance) * 100));
  const resetDate = formatResetDate(usage.resetsAt);
  const allowanceHours = Math.round(allowance / 3600);

  let warning = null;
  if (used >= allowance) {
    warning = `${formatHours(over)} over your included ${allowanceHours}h — overage billing isn't live yet; this is a preview of your usage.`;
  } else if (used >= LAB_USAGE_WARN_18H_SECONDS) {
    warning = `You're at ${formatHours(used)} of your ${allowanceHours} included Docker lab-hours — only ${formatHours(allowance - used)} left this period.`;
  } else if (used >= LAB_USAGE_WARN_15H_SECONDS) {
    warning = `You're at ${formatHours(used)} of your ${allowanceHours} included Docker lab-hours.`;
  }

  return (
    <div className={`glass-2 rounded-card ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <p className={`${compact ? 'text-small' : 'text-body'} text-ink-1`}>
        <span className="font-semibold tabular-nums">{formatHours(used)}</span>
        {` of ${allowanceHours}h included`}
        {resetDate && <span className="text-ink-2">{` · resets ${resetDate}`}</span>}
      </p>
      <div className="mt-2">
        <ProgressBar
          value={percent}
          label={`Docker lab usage: ${formatHours(used)} of ${allowanceHours} hours included`}
          showValue={false}
          size="sm"
        />
      </div>
      {warning && (
        <p className={`mt-2 ${compact ? 'text-small' : 'text-body'} font-semibold ${over > 0 ? 'text-warning' : 'text-ink-1'}`}>
          {warning}
        </p>
      )}
    </div>
  );
}
