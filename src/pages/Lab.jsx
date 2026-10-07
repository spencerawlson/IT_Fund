import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Cpu, Network, ArrowRightLeft, Radio, Server, Shuffle, Gauge, Cloud, Layers,
  GitBranch, Calculator, TerminalSquare, Globe, Shield, KeyRound, Zap, CloudCog, Database,
  Container, Lock, Route as RouteIcon, ShieldAlert, Search, Boxes,
} from 'lucide-react';
// 3D scenes are code-split: three.js (~600 KB) only loads when a 3D subject is opened,
// never as part of the initial bundle.
const Motherboard3D = React.lazy(() => import('@/components/three/Motherboard3D'));
const Switch3D = React.lazy(() => import('@/components/three/Switch3D'));
const ServerRack3D = React.lazy(() => import('@/components/three/ServerRack3D'));
const Vpc3D = React.lazy(() => import('@/components/three/Vpc3D'));
const LoadBalancer3D = React.lazy(() => import('@/components/three/LoadBalancer3D'));
const Osi3D = React.lazy(() => import('@/components/three/Osi3D'));
import TcpAnimation from '@/components/viz/TcpAnimation';
import UdpAnimation from '@/components/viz/UdpAnimation';
import LoadBalancerAnimation from '@/components/viz/LoadBalancerAnimation';
import AutoScalingAnimation from '@/components/viz/AutoScalingAnimation';
import CICDAnimation from '@/components/viz/CICDAnimation';
import SubnetCalculator from '@/components/tools/SubnetCalculator';
import TerminalSimulator from '@/components/tools/TerminalSimulator';
import DnsAnimation from '@/components/viz/DnsAnimation';
import FirewallAnimation from '@/components/viz/FirewallAnimation';
import EncryptionAnimation from '@/components/viz/EncryptionAnimation';
import NumberSystemConverter from '@/components/tools/NumberSystemConverter';
import AwsAnimation from '@/components/viz/AwsAnimation';
import AzureAnimation from '@/components/viz/AzureAnimation';
import GcpAnimation from '@/components/viz/GcpAnimation';
import DatabaseAnimation from '@/components/viz/DatabaseAnimation';
import TroubleshootingAnimation from '@/components/viz/TroubleshootingAnimation';
import GitFlowAnimation from '@/components/viz/GitFlowAnimation';
import LinuxTerminalLab from '@/components/tools/LinuxTerminalLab';
import PythonAutomationLab from '@/components/tools/PythonAutomationLab';
import SqlLab from '@/components/tools/SqlLab';
import KubernetesAnimation from '@/components/viz/KubernetesAnimation';
import TlsAnimation from '@/components/viz/TlsAnimation';
import RoutingAnimation from '@/components/viz/RoutingAnimation';
import SecurityIncidentAnimation from '@/components/viz/SecurityIncidentAnimation';
import ErrorBoundary from '@/components/ErrorBoundary';
import FlowDiagram from '@/components/lab/FlowDiagram';
import RoutingScenario from '@/components/viz/RoutingScenario';
import LabGallery, { KINDS } from '@/components/lab/LabGallery';
import { LAB_FLOWS } from '@/data/labFlows';
import { ROUTING_SCENARIOS } from '@/data/routingScenarios';
import { getModulesForLab, NOTES, LAB_LABELS } from '@/data/labLinks';
import useDocumentTitle from '@/hooks/useDocumentTitle';

// Ordered categories for the gallery.
const CATEGORIES = ['Hardware', 'Networking', 'Routing', 'Cloud & Scale', 'Security', 'Data & Systems', 'DevOps'];

// The curated core, shown in the gallery. Every entry is genuinely visual or interactive.
const SUBJECTS = [
  // Hardware
  { id: 'motherboard', category: 'Hardware', kind: '3d', icon: Cpu, label: '3D Motherboard', blurb: 'Rotate a real board — CPU socket, RAM, PCIe, chipset, and power paths.' },
  { id: 'switch', category: 'Hardware', kind: '3d', icon: Network, label: '3D Network Switch', blurb: 'Explore ports, uplinks, and status LEDs on a managed switch.' },
  { id: 'server-rack', category: 'Hardware', kind: '3d', icon: Server, label: '3D Server Rack', blurb: 'Inspect servers, top-of-rack switch, PDU, and UPS in a data-center rack.' },
  // Networking
  { id: 'osi', category: 'Networking', kind: '3d', icon: Layers, label: 'OSI Model', blurb: 'Climb the seven layers as a 3D stack, from cabling to application.' },
  { id: 'tcp', category: 'Networking', kind: 'anim', icon: ArrowRightLeft, label: 'TCP Handshake', blurb: 'Watch the 3-way handshake, sequence numbers, ACKs, and teardown.' },
  { id: 'udp', category: 'Networking', kind: 'anim', icon: Radio, label: 'UDP Datagrams', blurb: 'See fire-and-forget delivery — fast, connectionless, and lossy.' },
  { id: 'dns', category: 'Networking', kind: 'anim', icon: Globe, label: 'DNS Resolution', blurb: 'Follow a name through root, TLD, and authoritative servers.' },
  { id: 'routing', category: 'Networking', kind: 'anim', icon: RouteIcon, label: 'Routing & NAT', blurb: 'Trace route lookup, forwarding, NAT, and VPN behavior.' },
  { id: 'subnet', category: 'Networking', kind: 'tool', icon: Calculator, label: 'Subnet Calculator', blurb: 'Enter an IP and CIDR to see network, broadcast, and host range.' },
  // Routing
  { id: 'rt-ospf-neighbor', category: 'Routing', kind: 'anim', icon: Network, label: 'OSPF Neighbor Formation', blurb: 'Watch R1 and R2 progress through the OSPF states to a full adjacency.' },
  { id: 'rt-bgp-path', category: 'Routing', kind: 'anim', icon: Globe, label: 'BGP Path Selection', blurb: 'See two paths advertised and why BGP prefers the shorter AS_PATH.' },
  { id: 'rt-link-failure', category: 'Routing', kind: 'anim', icon: Zap, label: 'Link Failure & Reconvergence', blurb: 'A link fails; watch the network recompute paths and reroute.' },
  // Cloud & Scale
  { id: 'vpc', category: 'Cloud & Scale', kind: '3d', icon: Cloud, label: 'Virtual Network', blurb: 'Fly through a VPC: subnets, gateways, load balancer, and instances.' },
  { id: 'load-balancer', category: 'Cloud & Scale', kind: 'anim', icon: Shuffle, label: 'Load Balancer', blurb: 'See traffic fan out with health checks and fast failover.' },
  { id: 'auto-scaling', category: 'Cloud & Scale', kind: 'anim', icon: Gauge, label: 'Auto-Scaling', blurb: 'Watch instances scale out and back in with demand.' },
  { id: 'kubernetes', category: 'Cloud & Scale', kind: 'anim', icon: Container, label: 'Kubernetes', blurb: 'Deploy → pods → service → health → autoscale → config.' },
  { id: 'cicd', category: 'Cloud & Scale', kind: 'anim', icon: GitBranch, label: 'CI/CD Pipeline', blurb: 'Follow code from commit through build, test, and deploy.' },
  { id: 'aws', category: 'Cloud & Scale', kind: 'anim', icon: CloudCog, label: 'Cloud Architecture', blurb: 'Trace a request across edge, load balancer, compute, and data.' },
  // Security
  { id: 'tls', category: 'Security', kind: 'anim', icon: Lock, label: 'TLS Handshake', blurb: 'Certificate validation, key exchange, and encrypted records.' },
  { id: 'encryption', category: 'Security', kind: 'anim', icon: KeyRound, label: 'Encryption', blurb: 'Watch plaintext become ciphertext, and back again.' },
  { id: 'firewall', category: 'Security', kind: 'anim', icon: Shield, label: 'Firewall Rules', blurb: 'See packets allowed or dropped as rule order is evaluated.' },
  { id: 'security-incident', category: 'Security', kind: 'anim', icon: ShieldAlert, label: 'Security Incident', blurb: 'Trace a breach from phishing through detection and response.' },
  // Data & Systems
  { id: 'database', category: 'Data & Systems', kind: 'anim', icon: Database, label: 'Database Internals', blurb: 'Query → index → transaction → replication → sharding.' },
  { id: 'system-architecture', category: 'Data & Systems', kind: 'flow', icon: Boxes, label: 'System Architecture', blurb: 'A resilient request path with caching, failover, and observability.' },
  { id: 'cloud-migration', category: 'Data & Systems', kind: 'flow', icon: CloudCog, label: 'Cloud Migration', blurb: 'Assess, lift-and-shift, refactor, then optimize.' },
  { id: 'capacity-planning', category: 'Data & Systems', kind: 'flow', icon: Gauge, label: 'Capacity Planning', blurb: 'From workload inputs to a validated, cost-aware plan.' },
  // DevOps
  { id: 'git-flow', category: 'DevOps', kind: 'anim', icon: GitBranch, label: 'Git Flow', blurb: 'Follow a change from commit through branch, PR, merge, and release.' },
  { id: 'troubleshooting', category: 'DevOps', kind: 'anim', icon: Search, label: 'Troubleshooting', blurb: 'Structured incident handling: reproduce, isolate, mitigate, fix.' },
  { id: 'terminal', category: 'DevOps', kind: 'tool', icon: TerminalSquare, label: 'CLI Terminal', blurb: 'Practice Bash and PowerShell in a safe, simulated shell.' },
];

const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));

// Dropped-from-gallery subjects still resolve (older lessons deep-link to them): text-only ones
// redirect to their animated equivalent; the rest just render via the registry below.
const ALIASES = {
  'git-workflow': 'git-flow',
  'network-troubleshooting': 'troubleshooting',
  'incident-response': 'security-incident',
};

// Every renderable subject id -> how to render it. Superset of the gallery, so deep-links survive
// curation. Flow subjects are data-driven via FlowDiagram.
const RENDERERS = {
  motherboard: Motherboard3D, switch: Switch3D, 'server-rack': ServerRack3D,
  vpc: Vpc3D, 'lb-3d': LoadBalancer3D, osi: Osi3D,
  tcp: () => <TcpAnimation />, udp: () => <UdpAnimation />, dns: () => <DnsAnimation />,
  routing: () => <RoutingAnimation />, 'load-balancer': () => <LoadBalancerAnimation />,
  'auto-scaling': () => <AutoScalingAnimation />, cicd: () => <CICDAnimation />, kubernetes: () => <KubernetesAnimation />,
  aws: () => <AwsAnimation />, azure: () => <AzureAnimation />, gcp: () => <GcpAnimation />,
  tls: () => <TlsAnimation />, encryption: () => <EncryptionAnimation />, firewall: () => <FirewallAnimation />,
  'security-incident': () => <SecurityIncidentAnimation />, database: () => <DatabaseAnimation />,
  troubleshooting: () => <TroubleshootingAnimation />, 'git-flow': () => <GitFlowAnimation />,
  subnet: () => <SubnetCalculator />, terminal: () => <TerminalSimulator />, 'number-system': () => <NumberSystemConverter />,
  'linux-lab': () => <LinuxTerminalLab />, 'python-lab': () => <PythonAutomationLab />, 'sql-lab': () => <SqlLab />,
  'system-architecture': () => <FlowDiagram {...LAB_FLOWS['system-architecture']} />,
  'cloud-migration': () => <FlowDiagram {...LAB_FLOWS['cloud-migration']} />,
  'capacity-planning': () => <FlowDiagram {...LAB_FLOWS['capacity-planning']} />,
  'rt-ospf-neighbor': () => <RoutingScenario scenario={ROUTING_SCENARIOS['rt-ospf-neighbor']} />,
  'rt-bgp-path': () => <RoutingScenario scenario={ROUTING_SCENARIOS['rt-bgp-path']} />,
  'rt-link-failure': () => <RoutingScenario scenario={ROUTING_SCENARIOS['rt-link-failure']} />,
};

const resolveId = (id) => (RENDERERS[ALIASES[id]] ? ALIASES[id] : id);

// Visual Lab scenario -> the Interactive Lab(s) where you build/configure it ("See → Build").
const BUILD_IN_LAB = {
  'rt-ospf-neighbor': ['net-ospf-001'],
  'rt-bgp-path': ['net-bgp-001'],
  'rt-link-failure': ['net-ospf-tshoot-001'],
  'python-lab': ['py-basics-001', 'py-netauto-001', 'py-automation-001'],
};

const is3D = (id) => (SUBJECT_BY_ID[id]?.kind || '') === '3d';

// Metadata for the stage header for any id, including non-featured deep-links.
function metaFor(id) {
  if (SUBJECT_BY_ID[id]) return SUBJECT_BY_ID[id];
  return { id, label: LAB_LABELS[id] || id, kind: id.endsWith('-lab') || id === 'number-system' ? 'tool' : 'anim', icon: Boxes, blurb: '' };
}

function Stage({ id, onBack }) {
  const meta = metaFor(id);
  const k = KINDS[meta.kind] || KINDS.anim;
  const Icon = meta.icon;
  const refs = getModulesForLab(id);
  const Renderer = RENDERERS[id];

  return (
    <div>
      <div className="mb-5 flex items-start gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br ${k.grad}`}>
          {Icon ? <Icon size={22} className={k.icon} aria-hidden="true" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-ink-1">{meta.label}</h2>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${k.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${k.dot}`} /> {k.label}
            </span>
          </div>
          {meta.blurb && <p className="mt-1 text-small text-ink-2">{meta.blurb}</p>}
        </div>
      </div>

      {NOTES[id] && (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-caption text-ink-2">
          {NOTES[id]}
        </div>
      )}

      {/* The visualization renders on a dark "screen": the 3D models, animations and terminals are
          dark by design, and the hands-on tools were authored for a dark surface. The page around it
          stays light. */}
      <div className="rounded-2xl border border-black/10 bg-[#0b1020] p-4 text-slate-200 shadow-[0_18px_50px_-18px_rgba(76,29,149,0.35)] sm:p-6">
        <ErrorBoundary key={id} label="This visualization">
          {is3D(id) ? (
            <div className="h-[440px] w-full sm:h-[560px]">
              <React.Suspense fallback={(
                <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400" role="status" aria-label="Loading 3D scene">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200" />
                  <p className="text-sm">Loading 3D scene…</p>
                </div>
              )}>
                {Renderer ? <Renderer /> : null}
              </React.Suspense>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">{Renderer ? <Renderer /> : null}</div>
          )}
        </ErrorBoundary>
      </div>

      {BUILD_IN_LAB[id]?.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl glass-1 p-4">
          <p className="text-small text-ink-2">Now make it happen yourself — configure this topology in the terminal.</p>
          <div className="flex flex-wrap gap-2">
            {BUILD_IN_LAB[id].map((labId) => (
              // Terminal-first: hand the lab context to the launcher (?start=) which shows
              // "To begin, type: lab start <name>". The learner types it — we never auto-launch.
              <Link key={labId} to={`/labs?start=${labId}`} className="inline-flex items-center gap-2 glass-btn rounded-control px-4 py-2 text-small font-semibold">
                Build this in the Interactive Lab <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {refs.length > 0 && (
        <div className="mt-6 rounded-xl glass-1 p-4">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-2">Related flashcards</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {refs.map((r) => (
              <Link key={r.moduleId + r.concept} to={`/module/${r.moduleId}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-caption transition hover:border-white/25 hover:bg-white/[0.12]">
                <span className="font-semibold text-ink-1">{r.moduleTitle}</span>
                <span className="text-ink-2">· {r.concept}</span>
                <span className="text-blue-400">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-2 transition hover:text-ink-1">
          <ArrowLeft size={15} /> All subjects
        </button>
      </div>
    </div>
  );
}

export default function Lab() {
  useDocumentTitle('Visual Lab · Road to CISSP');
  const [active, setActive] = useState(() => {
    const item = new URLSearchParams(window.location.search).get('item');
    return item && RENDERERS[resolveId(item)] ? resolveId(item) : null;
  });
  const topRef = useRef(null);

  // Keep the URL in sync so a subject can be shared/deep-linked and the back button works.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (active) url.searchParams.set('item', active);
    else url.searchParams.delete('item');
    window.history.replaceState(null, '', url);
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [active]);

  const open = useCallback((id) => setActive(resolveId(id)), []);
  const back = useCallback(() => setActive(null), []);

  return (
    <div className="min-h-screen text-ink-1">
      <div ref={topRef} className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/practice" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 transition hover:text-ink-1">
          <ArrowLeft size={15} /> Practice
        </Link>

        <header className="mb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Visual Lab</h1>
              <p className="mt-2 max-w-xl text-body leading-relaxed text-ink-2">
                Interactive 3D models, animated protocols, and hands-on tools. Pick a subject to explore
                — rotate, play, and step through how each one works.
              </p>
            </div>
            <Link to="/challenge" className="inline-flex items-center gap-2 glass-btn rounded-control px-4 py-2 text-small font-semibold">
              <Zap size={16} /> Challenge Mode
            </Link>
          </div>
        </header>

        {active ? <Stage id={active} onBack={back} /> : <LabGallery subjects={SUBJECTS} categories={CATEGORIES} onSelect={open} />}
      </div>
    </div>
  );
}
