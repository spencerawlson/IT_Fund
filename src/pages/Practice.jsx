import React from 'react';
import { ArrowRight, Box, Timer, ExternalLink } from 'lucide-react';
import { Card, IconTile, PageContainer, PageHeader, SectionHeader, Badge } from '@/components/ui-glass';
import LabConsole from '@/components/labs/LabConsole';
import useDocumentTitle from '@/hooks/useDocumentTitle';

// Hands-on practice beside the lesson path. Nothing here changes lesson progress.
// Reference material (the modules) lives under Learn -> Concept library.
const PRACTICE = [
  { to: '/lab', icon: Box, title: 'Visual Lab', text: 'Explore hardware in 3D and watch network protocols animate step by step.' },
  { to: '/challenge', icon: Timer, title: 'Timed challenges', text: 'Type the right command, pick the subnet mask, build the firewall rules, against the clock.' },
];

function Tile({ to, href, icon, title, text }) {
  const inner = (
    <div className="flex items-start gap-4">
      <IconTile icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-heading text-ink-1">
          {title}
          {href && <ExternalLink size={16} className="text-ink-2" aria-hidden="true" />}
        </span>
        <span className="mt-1 block text-small text-ink-2">{text}</span>
      </span>
      <ArrowRight size={18} className="mt-1 shrink-0 text-ink-2" aria-hidden="true" />
    </div>
  );
  return <Card to={to} href={href}>{inner}</Card>;
}

export default function Practice() {
  useDocumentTitle('Practice · Road to CISSP');
  return (
    <PageContainer>
      <PageHeader
        title="Practice"
        description="Hands-on labs to use alongside your lessons. Nothing here changes your lesson path."
      />

      <section aria-labelledby="practice-hands-on">
        <SectionHeader id="practice-hands-on" title="Hands-on" />
        <div className="grid gap-4 md:grid-cols-2">
          {PRACTICE.map((t) => <Tile key={t.to} {...t} />)}
        </div>
      </section>

      <section aria-labelledby="practice-ranges" className="mt-12">
        <SectionHeader
          id="practice-ranges"
          title="Interactive labs"
          description="The terminal is your way in. Type labs to list every lab, lab info <name> for details, then lab start <name> to begin. Labs run on real containers where the host supports it, and an identical simulation everywhere else."
          action={<Badge>beta</Badge>}
        />
        <LabConsole />
        <p className="mt-3 text-caption text-ink-3">
          New here? Type <code className="font-mono text-ink-2">help</code> to see every command.
        </p>
      </section>
    </PageContainer>
  );
}
