import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui-glass';
import LabTerminal from '@/components/labs/LabTerminal';
import { useLabConsole } from '@/components/labs/useLabConsole';
import useDocumentTitle from '@/hooks/useDocumentTitle';

// Terminal-first lab selection: the learner discovers and launches Interactive Labs by typing
// (`tracks`, `labs`, `search <word>`, `lab start <name|NN>`, `lab info <name>`, `help`) rather
// than scrolling a wall of text. `lab start` navigates to the lab workspace; context passed
// via ?start=<id> shows the instruction without auto-running it. Reuses LabTerminal with a
// local command runner (no backend session here). Shared logic lives in useLabConsole so the
// Practice-page embed (LabConsole) can never drift apart from this launcher.

export default function LabLauncher() {
  useDocumentTitle('Labs · Road to CISSP');
  const [params] = useSearchParams();
  const startHint = params.get('start');
  const { banner, runner, readyKey } = useLabConsole({ startHint });

  return (
    <div className="min-h-[100dvh] text-ink-1">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass-1 mx-auto flex max-w-5xl items-center gap-3 rounded-card px-3 py-2 sm:px-4">
          <FlaskConical size={18} className="shrink-0 text-ink-2" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-body font-semibold">Interactive Lab</span>
          <Button size="sm" variant="ghost" to="/labs/progress">My progress</Button>
          <Button size="sm" variant="secondary" to="/practice">Exit</Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6">
        <LabTerminal
          key={readyKey}
          runner={runner}
          banner={banner}
          prompt="roadtocissp@lab:~$ "
        />
        <p className="mt-3 text-caption text-ink-3">
          Type <code className="font-mono text-ink-2">tracks</code> to browse by track, <code className="font-mono text-ink-2">labs</code> for titles, <code className="font-mono text-ink-2">lab start &lt;#&gt;</code> to begin. This is how real lab environments work — the terminal is your way in.
        </p>
      </main>
    </div>
  );
}
