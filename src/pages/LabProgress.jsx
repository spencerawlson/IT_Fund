import React, { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Timer, Trophy, RotateCcw, Play } from 'lucide-react';
import { Button, Card } from '@/components/ui-glass';
import { labsApi } from '@/api/labs';
import { getLabProgress, aggregateServerHistory, mergeProgress, formatDuration } from '@/lib/labProgress';
import { useAuth } from '@/lib/AuthContext';
import useDocumentTitle from '@/hooks/useDocumentTitle';

// Interactive-lab progress: every lab, whether you've completed it, how many
// times, and how fast (best + last). Signed-in learners get server history
// merged over this browser's local record (see src/lib/labProgress.js);
// guests see this browser's history only.
export default function LabProgress() {
  useDocumentTitle('Lab progress · Road to CISSP');
  const { isAuthenticated } = useAuth();
  const [labs, setLabs] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(() => getLabProgress());
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let live = true;
    labsApi.listDefinitions()
      .then(({ labs: defs }) => {
        if (!live) return;
        setLabs(defs);
        const local = getLabProgress();
        if (!isAuthenticated) {
          setProgress(local);
          return;
        }
        // Signed in: server history is the source of truth per lab; local-only
        // labs (finished while signed out) are preserved underneath it.
        labsApi.history()
          .then(({ history }) => {
            if (live) {
              setProgress(mergeProgress(local, aggregateServerHistory(history)));
              setSynced(true);
            }
          })
          .catch(() => { if (live) setProgress(local); }); // offline: local history still shows
      })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [isAuthenticated]);

  const rows = useMemo(() => {
    if (!labs) return [];
    return labs.map((l) => ({ def: l, p: progress[l.id] || null }))
      .sort((a, b) => Number(!!b.p) - Number(!!a.p) || a.def.title.localeCompare(b.def.title));
  }, [labs, progress]);

  const doneCount = rows.filter((r) => r.p).length;
  const totalRuns = rows.reduce((n, r) => n + (r.p?.completions || 0), 0);

  return (
    <div className="min-h-[100dvh] text-ink-1">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass-1 mx-auto flex max-w-5xl items-center gap-3 rounded-card px-3 py-2 sm:px-4">
          <FlaskConical size={18} className="shrink-0 text-ink-2" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-body font-semibold">Lab progress</span>
          <Button size="sm" variant="secondary" to="/labs">Labs</Button>
          <Button size="sm" variant="ghost" to="/practice">Exit</Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-3 py-6 sm:px-6">
        {error && <p className="text-body text-danger">Could not load labs: {error}</p>}
        {!labs && !error && <p className="text-ink-2">Loading…</p>}
        {labs && (
          <>
            <div className="mb-6 grid grid-cols-3 gap-3">
              <Card level={2} className="text-center">
                <p className="text-heading text-ink-1">{doneCount}<span className="text-ink-3">/{labs.length}</span></p>
                <p className="mt-1 text-caption text-ink-2">labs completed</p>
              </Card>
              <Card level={2} className="text-center">
                <p className="text-heading text-ink-1">{totalRuns}</p>
                <p className="mt-1 text-caption text-ink-2">total runs</p>
              </Card>
              <Card level={2} className="text-center">
                <p className="text-heading text-ink-1">{rows.filter((r) => (r.p?.completions || 0) > 1).length}</p>
                <p className="mt-1 text-caption text-ink-2">repeated</p>
              </Card>
            </div>
            <div className="space-y-3">
              {rows.map(({ def, p }) => (
                <Card key={def.id} level={2} className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-ink-1">{def.title}</p>
                    <p className="mt-0.5 text-caption text-ink-3">
                      {def.category} · {def.difficulty} · ~{def.estimated_minutes} min
                    </p>
                    {p ? (
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-2">
                        <span className="inline-flex items-center gap-1.5 text-success">
                          <Trophy size={14} aria-hidden="true" /> {p.completions}× completed
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Timer size={14} aria-hidden="true" /> best {formatDuration(p.bestSeconds)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <RotateCcw size={14} aria-hidden="true" /> last {formatDuration(p.lastSeconds)}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1.5 text-small text-ink-3">Not attempted yet</p>
                    )}
                  </div>
                  <Button size="sm" variant={p ? 'secondary' : 'primary'} to={`/labs/${def.id}`} icon={Play}>
                    {p ? 'Run again' : 'Start'}
                  </Button>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-caption text-ink-3">
              {synced
                ? 'Synced to your account — your times follow you across devices.'
                : 'Times are measured from lab start to completion, in this browser. Sign in to sync them.'}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
