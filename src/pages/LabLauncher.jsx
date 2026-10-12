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
    <div className="min-h-[100dvh] bg-[#070b12] text-ink-1">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-card border border-white/10 bg-[#0b0f16]/95 px-3 py-2 text-slate-100 shadow-lg sm:px-4">
          <FlaskConical size={18} className="shrink-0 text-emerald-400" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-body font-semibold">Interactive Lab</span>
          <Button size="sm" variant="ghost" to="/labs/progress">My progress</Button>
          <Button size="sm" variant="secondary" to="/practice">Exit</Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-[#0d1219] p-2 shadow-2xl sm:p-3">
          <LabTerminal
            key={readyKey}
            runner={runner}
            banner={banner}
            prompt="roadtocissp@lab:~$ "
          />
        </div>
        <p className="mt-3 text-caption text-slate-400">
          Type <code className="font-mono text-slate-200">labs</code> to browse the tracks, <code className="font-mono text-slate-200">lab start &lt;#&gt;</code> to begin. This is how real lab environments work — the terminal is your way in.
        </p>
      </main>
    </div>
  );
}
