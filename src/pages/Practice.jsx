import React from 'react';
import { ArrowRight, Box, Timer, ExternalLink, Radar, Network, Route as RouteIcon, Globe, ShieldX, FileSearch, Cloud, Boxes, Container, Activity, Siren, FileWarning, Waypoints, Wrench, Spline, TerminalSquare } from 'lucide-react';
import { Badge, Card, IconTile, PageContainer, PageHeader, SectionHeader } from '@/components/ui-glass';
import useDocumentTitle from '@/hooks/useDocumentTitle';

// Hands-on practice beside the lesson path. Nothing here changes lesson progress.
// Reference material (the modules) lives under Learn -> Concept library.
const PRACTICE = [
  { to: '/lab', icon: Box, title: 'Visual Lab', text: 'Explore hardware in 3D and watch network protocols animate step by step.' },
  { to: '/challenge', icon: Timer, title: 'Timed challenges', text: 'Type the right command, pick the subnet mask, build the firewall rules, against the clock.' },
];

// Interactive labs (backend/labs). Phase 1 is simulation-only and open to everyone (guest or
// signed in); signing in keeps your lab sessions across devices.
//
// Terminal-first: these cards are a browsable overview, not the way in. Clicking one opens the
// Interactive Lab terminal with the lab preselected (?start=<id>), where the learner types
// `lab start <name>` to enter — the terminal is the single entry point. See LabLauncher.jsx.
const RANGES = [
  { id: 'cyber-nmap-001', icon: Radar, title: 'Service Enumeration with Nmap', text: 'Discover ports and identify services on an isolated target from a simulated shell, then validate your findings.' },
  { id: 'net-vlan-001', icon: Network, title: 'VLANs & Inter-VLAN Routing', text: 'Configure a real Cisco IOS switch and router-on-a-stick, then ping across the VLANs to prove it.' },
  { id: 'net-static-routing-001', icon: RouteIcon, title: 'Static Routing Between Two Sites', text: 'Address two routers over a WAN link, add the static routes, and confirm end-to-end connectivity.' },
  { id: 'net-acl-001', icon: ShieldX, title: 'Filtering Traffic with ACLs', text: 'Write a standard access list to block one untrusted host from a server, then prove the rest still get through.' },
  { id: 'net-ospf-001', icon: Waypoints, title: 'OSPF Single-Area Configuration', text: 'Configure OSPF area 0 on three routers, bring up the adjacencies, and prove PC-A reaches Server-A.' },
  { id: 'net-ospf-tshoot-001', icon: Wrench, title: 'OSPF Troubleshooting', text: 'OSPF is configured but connectivity is broken — find the wrong-area link with show commands and fix it.' },
  { id: 'net-bgp-001', icon: Spline, title: 'eBGP Configuration', text: 'Peer two autonomous systems with external BGP, advertise each LAN, and prove PC1 reaches PC2.' },
  { id: 'net-dns-connectivity-001', icon: Globe, title: 'DNS & Connectivity Troubleshooting', text: 'Work the layers on a Linux shell — addressing, DNS, gateway, path, and HTTP — to find why an app is unreachable.' },
  { id: 'sec-logtriage-001', icon: FileSearch, title: 'Log Triage: Brute-Force Investigation', text: 'Hunt an SSH brute-force in /var/log/auth.log with real grep: find the attacker, the breach, and the compromised account.' },
  { id: 'cloud-aws-audit-001', icon: Cloud, title: 'Cloud Security Audit with the AWS CLI', text: 'Audit a dev AWS account: find the public S3 bucket, SSH open to the world, an admin IAM user, and a stale access key.' },
  { id: 'cloud-terraform-001', icon: Boxes, title: 'Terraform: Provision & Secure Infrastructure', text: 'Run the init → plan → apply workflow and catch an insecure default with a tfsec scan before you apply.' },
  { id: 'sec-docker-siem-001', icon: Container, title: 'Docker + SIEM: Container Security Monitoring', text: 'Build a container stack, centralize its telemetry, then hunt a simulated attack in a SIEM — from brute-force alert to full kill chain.' },
  { id: 'sec-c2beacon-001', icon: Activity, title: 'C2 Beacon Hunt', text: 'Find a host beaconing to a command-and-control server in the connection and HTTP logs with real grep.' },
  { id: 'sec-dns-typo-001', icon: Siren, title: 'DNS Tunneling & Typosquatting', text: 'Surface DNS exfiltration over TXT records and a typosquatted lookalike domain hiding in the DNS log.' },
  { id: 'sec-ransomware-001', icon: FileWarning, title: 'Ransomware over SMB', text: 'Investigate an SMB log for ransomware: encrypted extensions, the infected host, the ransom note, and the blast radius.' },
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
          description="One terminal is your way in: open the Interactive Lab, type labs to browse, then lab start <name> to begin. The cards below are a preview — picking one opens the terminal with that lab ready to start."
          action={<Badge>beta</Badge>}
        />
        <div className="mb-4">
          <Tile
            to="/labs"
            icon={TerminalSquare}
            title="Open the Interactive Lab"
            text="The terminal-first launcher. Type labs to list everything, lab info <name> for details, lab start <name> to enter."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {RANGES.map((t) => <Tile key={t.id} to={`/labs?start=${t.id}`} {...t} />)}
        </div>
      </section>
    </PageContainer>
  );
}
