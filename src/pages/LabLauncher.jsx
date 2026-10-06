import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui-glass';
import LabConsole from '@/components/labs/LabConsole';
import useDocumentTitle from '@/hooks/useDocumentTitle';

// Standalone terminal-first launcher at /labs. The console itself lives in LabConsole (shared with
// the Practice page); this page just wraps it in chrome. A preselected lab arrives via ?start=<id>
// (e.g. from the Visual Lab's "Build this"), which shows the `lab start` line without auto-running it.

export default function LabLauncher() {
  useDocumentTitle('Labs · Road to CISSP');
  const [params] = useSearchParams();
  const startHint = params.get('start');

  return (
    <div className="min-h-[100dvh] text-ink-1">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass-1 mx-auto flex max-w-5xl items-center gap-3 rounded-card px-3 py-2 sm:px-4">
          <FlaskConical size={18} className="shrink-0 text-ink-2" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-body font-semibold">Interactive Lab</span>
          <Button size="sm" variant="secondary" to="/practice">Exit</Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6">
        <LabConsole startHint={startHint} />
        <p className="mt-3 text-caption text-ink-3">
          Type <code className="font-mono text-ink-2">labs</code> to list, <code className="font-mono text-ink-2">lab start &lt;name&gt;</code> to begin. This is how real lab environments work — the terminal is your way in.
        </p>
      </main>
    </div>
  );
}
