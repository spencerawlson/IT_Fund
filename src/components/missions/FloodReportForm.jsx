import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui-glass';

// Operation Packet Flood: report the flooding host and the flood type.
// The parent owns the network call (mission action `report_flooder`) —
// this form stays a dumb controlled form. A wrong report is NOT an error:
// the server stores the finding and the flood_source_identified validator
// says which half is wrong, so the feedback comes back as the objective's
// message (via `feedback`) and the learner re-reads the capture. Any tool
// works — tshark, tcpdump, Wireshark — the mission checks the finding,
// never the tool.

export default function FloodReportForm({
  initial = {},
  feedback = '',
  reported = false,
  onSubmit,
  busy = false,
  disabled = false,
}) {
  const [sourceIp, setSourceIp] = useState(initial.source_ip || '');
  const [floodType, setFloodType] = useState(initial.flood_type || '');
  const [error, setError] = useState('');

  const blocked = reported || !sourceIp.trim() || !floodType.trim() || busy || disabled;

  const submit = async (e) => {
    e.preventDefault();
    if (blocked || !onSubmit) return;
    setError('');
    try {
      await onSubmit({ source_ip: sourceIp.trim(), flood_type: floodType.trim() });
    } catch (err) {
      setError(err.message || 'Could not file the flood report.');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="flood-report-source" className="block text-small font-semibold text-ink-1">
          Flooding host (IP address)
        </label>
        <input
          id="flood-report-source"
          type="text"
          value={sourceIp}
          onChange={(e) => setSourceIp(e.target.value)}
          disabled={reported || busy || disabled}
          placeholder="e.g. 10.10.10.25"
          className="mt-1 w-full rounded-control border border-black/15 bg-white/80 px-3 py-2 text-body text-ink-1 outline-none focus:border-violet-500"
        />
      </div>
      <div>
        <label htmlFor="flood-report-type" className="block text-small font-semibold text-ink-1">
          Kind of flood
        </label>
        <input
          id="flood-report-type"
          type="text"
          value={floodType}
          onChange={(e) => setFloodType(e.target.value)}
          disabled={reported || busy || disabled}
          placeholder="e.g. UDP flood"
          className="mt-1 w-full rounded-control border border-black/15 bg-white/80 px-3 py-2 text-body text-ink-1 outline-none focus:border-violet-500"
        />
      </div>
      {reported ? (
        <p className="flex items-center gap-2 text-body font-semibold text-success">
          <Check size={18} aria-hidden="true" /> Flood identified: {initial.source_ip} — {initial.flood_type}.
        </p>
      ) : (
        <>
          {feedback && (
            <p className="text-small text-ink-2" role="status">{feedback}</p>
          )}
          {error && (
            <p className="text-small text-danger" role="alert">{error}</p>
          )}
          <Button type="submit" size="lg" loading={busy} disabled={blocked} className="w-full">
            Report the flooder
          </Button>
        </>
      )}
    </form>
  );
}
