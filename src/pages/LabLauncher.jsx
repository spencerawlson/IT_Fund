import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui-glass';
import LabTerminal from '@/components/labs/LabTerminal';
import { useLabConsole } from '@/components/labs/useLabConsole';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import Seo from '@/components/Seo';
import FaqSection, { faqJsonLd } from '@/components/FaqSection';

// Terminal-first lab selection: the learner discovers and launches Interactive Labs by typing
// (`tracks`, `labs`, `search <word>`, `lab start <name|NN>`, `lab info <name>`, `help`) rather
// than scrolling a wall of text. `lab start` navigates to the lab workspace; context passed
// via ?start=<id> shows the instruction without auto-running it. Reuses LabTerminal with a
// local command runner (no backend session here). Shared logic lives in useLabConsole so the
// Practice-page embed (LabConsole) can never drift apart from this launcher.

// FAQ, in the product's own words — rendered below and mirrored as FAQPage
// JSON-LD on this page's <Seo> (single source of truth, no drift).
const FAQS = [
  {
    q: 'How do I start a lab?',
    a: 'Type labs to see the tracks, then lab start followed by the lab’s number — for example lab start 1. Type lab info and the number first if you want the details before you begin.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. The labs run in real terminals in your browser — networking, Linux, Python, and cloud. Nothing to download or configure. The Python labs follow the official Python Tutorial, and the networking labs use the same tools the Wireshark guide documents.',
    sources: [
      { label: 'The Python Tutorial', href: 'https://docs.python.org/3/tutorial/' },
      { label: 'Wireshark User’s Guide', href: 'https://www.wireshark.org/docs/wsug_html_chunked/' },
    ],
  },
  {
    q: 'What if I get stuck?',
    a: 'Type help to see every command, lab info and the lab’s number for its instructions, or go back to the track list with back. Your progress is saved — see it on the My progress page.',
  },
  {
    q: 'How are these labs different from the Visual Lab?',
    a: 'The Visual Lab shows you how things work with animations and 3D models. Here you type the commands yourself — it is the same material, hands-on.',
  },
];

export default function LabLauncher() {
  useDocumentTitle('Labs · Road to CISSP');
  const [params] = useSearchParams();
  const startHint = params.get('start');
  const { banner, runner, readyKey } = useLabConsole({ startHint });

  return (
    <div className="min-h-[100dvh] bg-white text-ink-1">
      <Seo
        title="Interactive labs — hands-on terminals · Road to CISSP"
        description="Hands-on labs in real terminals: networking, Linux, Python, and cloud. Type labs to browse the tracks and lab start <#> to begin."
        path="/labs"
        jsonLd={faqJsonLd(FAQS)}
      />
      <header className="sticky top-safe z-30 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="glass-1 nav-solid mx-auto flex max-w-5xl items-center gap-3 rounded-card px-3 py-2 shadow-lg sm:px-4">
          <FlaskConical size={18} className="shrink-0 text-action" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-body font-semibold">Interactive Lab</span>
          <Button size="sm" variant="ghost" to="/labs/progress">My progress</Button>
          <Button size="sm" variant="secondary" to="/practice">Exit</Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6">
        {/* The terminal is the page for sighted users; give screen readers
            (and search) the same heading and description. */}
        <h1 className="sr-only">Interactive labs — hands-on terminals for networking, security, Linux, Python and cloud</h1>
        <p className="sr-only">Hands-on labs in real terminals: networking, Linux, Python, and cloud. Type labs to browse the tracks and lab start &lt;#&gt; to begin.</p>
        <div className="glass-2 rounded-card p-2 shadow-xl sm:p-3">
          <LabTerminal
            key={readyKey}
            runner={runner}
            banner={banner}
            prompt="roadtocissp@lab:~$ "
          />
        </div>
        <p className="mt-3 text-caption text-ink-3">
          Type <code className="font-mono text-ink-1">labs</code> to browse the tracks, <code className="font-mono text-ink-1">lab start &lt;#&gt;</code> to begin. This is how real lab environments work — the terminal is your way in.
        </p>

        <div className="mt-12">
          <FaqSection faqs={FAQS} />
        </div>
      </main>
    </div>
  );
}
