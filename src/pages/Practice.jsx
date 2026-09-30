import React from 'react';
import { ArrowRight, Box, Timer, ShieldCheck, ExternalLink, Radar, Network } from 'lucide-react';
import { Badge, Card, IconTile, PageContainer, PageHeader, SectionHeader } from '@/components/ui-glass';
import { RESOURCES } from '@/data/academy';

// Hands-on practice beside the lesson path. Nothing here changes lesson progress.
// Reference material (the modules) lives under Learn -> Concept library.
const PRACTICE = [
  { to: '/lab', icon: Box, title: 'Visual Lab', text: 'Explore hardware in 3D and watch network protocols animate step by step.' },
  { to: '/challenge', icon: Timer, title: 'Timed challenges', text: 'Type the right command, pick the subnet mask, build the firewall rules, against the clock.' },
];

// Interactive labs (backend/labs). Phase 1 is simulation-only and needs a signed-in user.
const RANGES = [
  { to: '/labs/cyber-nmap-001', icon: Radar, title: 'Service Enumeration with Nmap', text: 'Discover ports and identify services on an isolated target, then validate your findings.' },
  { to: '/labs/net-vlan-001', icon: Network, title: 'VLANs & Inter-VLAN Routing', text: 'Build two VLANs across a trunk, route between them, and prove connectivity.' },
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
          <Tile
            href={RESOURCES.cyberlab.url}
            icon={ShieldCheck}
            title="Blue-team detection labs"
            text="Four safe labs on GitHub: run a simulated attack, then hunt its traces. Pairs with the Detection Lab Drills lesson."
          />
        </div>
      </section>

      <section aria-labelledby="practice-ranges" className="mt-12">
        <SectionHeader
          id="practice-ranges"
          title="Interactive labs"
          description="Launch a hands-on environment from a lesson, complete the objectives, and validate the result."
          action={<Badge>beta · sign-in required</Badge>}
        />
        <div className="grid gap-4 md:grid-cols-2">
          {RANGES.map((t) => <Tile key={t.to} {...t} />)}
        </div>
      </section>
    </PageContainer>
  );
}
