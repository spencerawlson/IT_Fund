import React from 'react';
import { ArrowRight, Box, Timer, Library, Route as RouteIcon, Map, ShieldCheck, ExternalLink, Radar, Network } from 'lucide-react';
import { Badge, Card, IconTile, PageContainer, PageHeader, SectionHeader } from '@/components/ui-glass';
import { RESOURCES } from '@/data/academy';

// Interactive labs (backend/labs). Phase 1 is simulation-only and needs a signed-in user.
const RANGES = [
  { to: '/labs/cyber-nmap-001', icon: Radar, title: 'Service Enumeration with Nmap', text: 'Discover ports and identify services on an isolated target, then validate your findings.' },
  { to: '/labs/net-vlan-001', icon: Network, title: 'VLANs & Inter-VLAN Routing', text: 'Build two VLANs across a trunk, route between them, and prove connectivity.' },
];

// Hands-on and reference material that sits beside the lesson path. Nothing here unlocks
// or skips lessons; the path stays strictly sequential.
const PRACTICE = [
  { to: '/lab', icon: Box, title: 'Visual Lab', text: 'Explore hardware in 3D and watch network protocols animate step by step.' },
  { to: '/challenge', icon: Timer, title: 'Timed challenges', text: 'Type the right command, pick the subnet mask, build the firewall rules, against the clock.' },
];

const LIBRARY = [
  { to: '/library', icon: Library, title: 'Concept library', text: 'Every concept from the original modules, with detailed study notes and search.' },
  { to: '/tracks', icon: RouteIcon, title: 'Career tracks', text: 'The original track view: modules and labs chained into practical routes.' },
  { to: '/learning-path', icon: Map, title: 'Learning principles', text: 'The six mental models every module and lab is tagged to.' },
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
        description="Hands-on labs and reference material to use alongside your lessons. Your lesson path doesn’t change based on anything here."
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

      <section aria-labelledby="practice-library" className="mt-12">
        <SectionHeader id="practice-library" title="Library" description="The original module material, kept for reference." />
        <div className="grid gap-4 md:grid-cols-2">
          {LIBRARY.map((t) => <Tile key={t.to} {...t} />)}
        </div>
      </section>
    </PageContainer>
  );
}
