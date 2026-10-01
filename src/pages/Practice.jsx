import React from 'react';
import { ArrowRight, Box, Timer, ExternalLink, Radar, Network, Route as RouteIcon, Globe, ShieldX, FileSearch, Cloud, Boxes, Container, Activity, Siren, FileWarning } from 'lucide-react';
import { Badge, Card, IconTile, PageContainer, PageHeader, SectionHeader } from '@/components/ui-glass';

// Hands-on practice beside the lesson path. Nothing here changes lesson progress.
// Reference material (the modules) lives under Learn -> Concept library.
const PRACTICE = [
  { to: '/lab', icon: Box, title: 'Visual Lab', text: 'Explore hardware in 3D and watch network protocols animate step by step.' },
  { to: '/challenge', icon: Timer, title: 'Timed challenges', text: 'Type the right command, pick the subnet mask, build the firewall rules, against the clock.' },
];

// Interactive labs (backend/labs). Phase 1 is simulation-only and open to everyone (guest or
// signed in); signing in keeps your lab sessions across devices.
const RANGES = [
  { to: '/labs/cyber-nmap-001', icon: Radar, title: 'Service Enumeration with Nmap', text: 'Discover ports and identify services on an isolated target from a simulated shell, then validate your findings.' },
  { to: '/labs/net-vlan-001', icon: Network, title: 'VLANs & Inter-VLAN Routing', text: 'Configure a real Cisco IOS switch and router-on-a-stick, then ping across the VLANs to prove it.' },
  { to: '/labs/net-static-routing-001', icon: RouteIcon, title: 'Static Routing Between Two Sites', text: 'Address two routers over a WAN link, add the static routes, and confirm end-to-end connectivity.' },
  { to: '/labs/net-acl-001', icon: ShieldX, title: 'Filtering Traffic with ACLs', text: 'Write a standard access list to block one untrusted host from a server, then prove the rest still get through.' },
  { to: '/labs/net-dns-connectivity-001', icon: Globe, title: 'DNS & Connectivity Troubleshooting', text: 'Work the layers on a Linux shell — addressing, DNS, gateway, path, and HTTP — to find why an app is unreachable.' },
  { to: '/labs/sec-logtriage-001', icon: FileSearch, title: 'Log Triage: Brute-Force Investigation', text: 'Hunt an SSH brute-force in /var/log/auth.log with real grep: find the attacker, the breach, and the compromised account.' },
  { to: '/labs/cloud-aws-audit-001', icon: Cloud, title: 'Cloud Security Audit with the AWS CLI', text: 'Audit a dev AWS account: find the public S3 bucket, SSH open to the world, an admin IAM user, and a stale access key.' },
  { to: '/labs/cloud-terraform-001', icon: Boxes, title: 'Terraform: Provision & Secure Infrastructure', text: 'Run the init → plan → apply workflow and catch an insecure default with a tfsec scan before you apply.' },
  { to: '/labs/sec-docker-siem-001', icon: Container, title: 'Docker + SIEM: Container Security Monitoring', text: 'Build a container stack, centralize its telemetry, then hunt a simulated attack in a SIEM — from brute-force alert to full kill chain.' },
  { to: '/labs/sec-c2beacon-001', icon: Activity, title: 'C2 Beacon Hunt', text: 'Find a host beaconing to a command-and-control server in the connection and HTTP logs with real grep.' },
  { to: '/labs/sec-dns-typo-001', icon: Siren, title: 'DNS Tunneling & Typosquatting', text: 'Surface DNS exfiltration over TXT records and a typosquatted lookalike domain hiding in the DNS log.' },
  { to: '/labs/sec-ransomware-001', icon: FileWarning, title: 'Ransomware over SMB', text: 'Investigate an SMB log for ransomware: encrypted extensions, the infected host, the ransom note, and the blast radius.' },
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
        </div>
      </section>

      <section aria-labelledby="practice-ranges" className="mt-12">
        <SectionHeader
          id="practice-ranges"
          title="Interactive labs"
          description="Launch a hands-on environment from a lesson, complete the objectives, and validate the result."
          action={<Badge>beta</Badge>}
        />
        <div className="grid gap-4 md:grid-cols-2">
          {RANGES.map((t) => <Tile key={t.to} {...t} />)}
        </div>
      </section>
    </PageContainer>
  );
}
