import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cpu, Network, ArrowRightLeft, Radio, Server, Shuffle, Gauge, Cloud, Layers, GitBranch, Calculator, TerminalSquare, Globe, Shield, KeyRound, Binary, Zap, CloudCog, Database, FileCode, Container, Lock, Route, ShieldAlert, Search } from 'lucide-react';
import Motherboard3D from '@/components/three/Motherboard3D';
import Switch3D from '@/components/three/Switch3D';
import ServerRack3D from '@/components/three/ServerRack3D';
import Vpc3D from '@/components/three/Vpc3D';
import LoadBalancer3D from '@/components/three/LoadBalancer3D';
import Osi3D from '@/components/three/Osi3D';
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
import { getModulesForLab, NOTES } from '@/data/labLinks';
import MiniSim from '@/components/lab/MiniSim';
import SubjectDropdown from '@/components/lab/SubjectDropdown';

const ITEMS = [
  { id: 'system-architecture', label: 'System Architecture', group: 'Practices', type: 'anim', icon: Server, desc: 'Design resilient blueprints, e.g., avoiding a single point of failure during a production latency spike.' },
  { id: 'cloud-migration', label: 'Cloud Migration', group: 'Cloud', type: 'anim', icon: CloudCog, desc: 'Plan a phased cutover from datacenter to cloud, minimizing downtime for a compromised instance.' },
  { id: 'incident-response', label: 'Incident Response', group: 'Security', type: 'anim', icon: ShieldAlert, desc: 'Run a playbook for a production latency spike or compromised instance.' },
  { id: 'git-workflow', label: 'Git Workflow', group: 'Practices', type: 'anim', icon: GitBranch, desc: 'Simulate trunk-based development vs. GitFlow when releasing during a production latency spike.' },
  { id: 'network-troubleshooting', label: 'Network Troubleshooting', group: 'Networking', type: 'anim', icon: Search, desc: 'Diagnose a production latency spike or compromised instance using layered isolation.' },
  { id: 'capacity-planning', label: 'Capacity Planning', group: 'Practices', type: 'anim', icon: Gauge, desc: 'Forecast load for holiday traffic or post-incident surge after a compromised instance.' },
  { id: 'motherboard', label: '3D Motherboard', group: '3D Models', type: '3d', icon: Cpu, desc: 'Drag to rotate, click parts to identify them.' },
  { id: 'switch', label: '3D Network Switch', group: '3D Models', type: '3d', icon: Network, desc: 'Explore ports, LEDs, and the chassis in 3D.' },
  { id: 'server-rack', label: '3D Server Rack', group: '3D Models', type: '3d', icon: Server, desc: 'Inspect servers, switch, PDU & UPS in a cloud rack.' },
  { id: 'tcp', label: 'TCP Animation', group: 'Protocols', type: 'anim', icon: ArrowRightLeft, desc: 'Watch the 3-way handshake & reliable delivery.' },
  { id: 'udp', label: 'UDP Animation', group: 'Protocols', type: 'anim', icon: Radio, desc: 'See fire-and-forget datagrams & packet loss.' },
  { id: 'osi', label: '3D OSI Model', group: 'Protocols', type: '3d', icon: Layers, desc: 'Explore the 7 network layers as a 3D stack.' },
  { id: 'vpc', label: '3D Virtual Network', group: 'Cloud', type: '3d', icon: Cloud, desc: 'Explore a VPC: subnets, gateways, LB & instances.' },
  { id: 'lb-3d', label: '3D Load Balancer', group: 'Cloud', type: '3d', icon: Shuffle, desc: 'See a load balancer fan out to its target group.' },
  { id: 'load-balancer', label: 'Load Balancer', group: 'Cloud', type: 'anim', icon: Shuffle, desc: 'Watch traffic distribute & health checks in action.' },
  { id: 'auto-scaling', label: 'Auto-Scaling', group: 'Cloud', type: 'anim', icon: Gauge, desc: 'See instances scale out & in with demand.' },
  { id: 'cicd', label: 'CI/CD Pipeline', group: 'Cloud', type: 'anim', icon: GitBranch, desc: 'Watch code flow from commit to production.' },
  { id: 'subnet', label: 'Subnet Calculator', group: 'Tools', type: 'tool', icon: Calculator, desc: 'Enter IP + CIDR to see network, broadcast, host range & counts.' },
  { id: 'terminal', label: 'CLI Terminal', group: 'Tools', type: 'tool', icon: TerminalSquare, desc: 'Practice Bash & PowerShell commands in a safe shell.' },
  { id: 'dns', label: 'DNS Resolution', group: 'Protocols', type: 'anim', icon: Globe, desc: 'Watch a URL resolve through root, TLD & authoritative servers.' },
  { id: 'firewall', label: 'Firewall', group: 'Security', type: 'anim', icon: Shield, desc: 'See packets allowed or dropped by firewall rules.' },
  { id: 'encryption', label: 'Encryption', group: 'Security', type: 'anim', icon: KeyRound, desc: 'Watch plaintext become ciphertext and back.' },
  { id: 'number-system', label: 'Number Converter', group: 'Tools', type: 'tool', icon: Binary, desc: 'Convert binary ↔ hex ↔ decimal ↔ ASCII with bit toggles.' },
  { id: 'aws', label: 'AWS Architecture', group: 'Cloud Providers', type: 'anim', icon: CloudCog, desc: 'Walk through a complete AWS request path: edge, ALB, compute, data, and observability.' },
  { id: 'azure', label: 'Azure Architecture', group: 'Cloud Providers', type: 'anim', icon: CloudCog, desc: 'Explore Azure Front Door, App Gateway, compute, and Entra identity in one flow.' },
  { id: 'gcp', label: 'GCP Architecture', group: 'Cloud Providers', type: 'anim', icon: CloudCog, desc: 'See global load balancing, GKE, managed data services, and IAM.' },
  { id: 'database', label: 'Database Flow', group: 'Storage', type: 'anim', icon: Database, desc: 'Follow a request through schema, query, indexing, transactions, replication, and sharding.' },
  { id: 'troubleshooting', label: 'Troubleshooting', group: 'Practices', type: 'anim', icon: Search, desc: 'Learn structured incident handling: reproduce, isolate, mitigate, then find root cause.' },
  { id: 'git-flow', label: 'Git Flow', group: 'Practices', type: 'anim', icon: GitBranch, desc: 'Follow a change from workspace commit through branch, PR, merge, and release.' },
  { id: 'linux-lab', label: 'Linux Terminal', group: 'Tools', type: 'tool', icon: TerminalSquare, desc: 'Practice common Bash commands with simulated output.' },
  { id: 'python-lab', label: 'Python Automation', group: 'Automation', type: 'tool', icon: FileCode, desc: 'Read files, call APIs, and parse CSV with guided tasks.' },
  { id: 'sql-lab', label: 'SQL Lab', group: 'Data', type: 'tool', icon: Database, desc: 'Run small SQL tasks: select, join, group, create, insert, update.' },
  { id: 'kubernetes', label: 'Kubernetes Animation', group: 'Cloud Runtime', type: 'anim', icon: Container, desc: 'Follow deploy→pods→service→health→autoscale→config.' },
  { id: 'tls', label: 'TLS Handshake', group: 'Security', type: 'anim', icon: Lock, desc: 'Visualize certificate validation, key exchange, and encrypted records.' },
  { id: 'routing', label: 'Routing & NAT', group: 'Networking', type: 'anim', icon: Route, desc: 'Follow route lookup, forwarding, NAT, and VPN behavior.' },
  { id: 'security-incident', label: 'Security Incident', group: 'Security', type: 'anim', icon: ShieldAlert, desc: 'Trace a breach from phishing through detection and response.' },
];

export default function Lab() {
  const [active, setActive] = useState(() => new URLSearchParams(window.location.search).get('item') || 'system-architecture');
  const item = ITEMS.find((i) => i.id === active);
  const is3D = item?.type === '3d';
  const panelRef = useRef(null);

  useEffect(() => {
    if (!panelRef.current) return;
    const id = requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, [active]);

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={15} /> Study Hub
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Visual{' '}
            <span className="bg-gradient-to-r from-purple-400 to-teal-300 bg-clip-text text-transparent">Lab</span>
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-400">
            Interact with hardware in 3D and watch network protocols come to life. Rotate models, click components, and press play on the animations.
          </p>
          <Link to="/challenge" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:opacity-90">
            <Zap size={16} /> Challenge Mode
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <div className="sticky top-6 self-start">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Subject</label>
            <SubjectDropdown items={ITEMS} active={active} onChange={setActive} />
          </div>

          <div ref={panelRef} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">{item.label}</h2>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            </div>

            {NOTES[active] && (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-slate-300">
                {NOTES[active]}
              </div>
            )}

            {is3D ? (
              <div className="h-[460px] w-full sm:h-[560px]">
                {active === 'motherboard' && <Motherboard3D />}
                {active === 'switch' && <Switch3D />}
                {active === 'server-rack' && <ServerRack3D />}
                {active === 'vpc' && <Vpc3D />}
                {active === 'lb-3d' && <LoadBalancer3D />}
                {active === 'osi' && <Osi3D />}
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                {active === 'tcp' && <TcpAnimation />}
                {active === 'udp' && <UdpAnimation />}
                {active === 'load-balancer' && <LoadBalancerAnimation />}
                {active === 'auto-scaling' && <AutoScalingAnimation />}
                {active === 'cicd' && <CICDAnimation />}
                {active === 'subnet' && <SubnetCalculator />}
                {active === 'terminal' && <TerminalSimulator />}
                {active === 'dns' && <DnsAnimation />}
                {active === 'firewall' && <FirewallAnimation />}
                {active === 'encryption' && <EncryptionAnimation />}
                {active === 'number-system' && <NumberSystemConverter />}
                {active === 'aws' && <AwsAnimation />}
                {active === 'azure' && <AzureAnimation />}
                {active === 'gcp' && <GcpAnimation />}
                {active === 'database' && <DatabaseAnimation />}
                {active === 'troubleshooting' && <TroubleshootingAnimation />}
                {active === 'git-flow' && <GitFlowAnimation />}
                {active === 'linux-lab' && <LinuxTerminalLab />}
                {active === 'python-lab' && <PythonAutomationLab />}
                {active === 'sql-lab' && <SqlLab />}
                {active === 'kubernetes' && <KubernetesAnimation />}
                {active === 'tls' && <TlsAnimation />}
                {active === 'routing' && <RoutingAnimation />}
                {active === 'security-incident' && <SecurityIncidentAnimation />}
                {active === 'system-architecture' && (
                  <MiniSim
                    steps={[
                      { title: 'Client', body: 'Sends request to LB over HTTPS with retries and timeout.', accent: 'white' },
                      { title: 'Load Balancer', body: 'Routes by path, checks health, fails over fast.', accent: 'blue' },
                      { title: 'App Pool', body: 'Stateless instances in two availability zones with rolling updates.', accent: 'white' },
                      { title: 'Cache', body: 'Redis cluster for hot reads, fallback to database on miss.', accent: 'white' },
                      { title: 'Database', body: 'Primary with async replica, automated failover, point-in-time recovery enabled.', accent: 'white' },
                      { title: 'Observability', body: 'Metrics, logs, and traces cover every hop with P90 latency SLO.', accent: 'teal' },
                    ]}
                    tags={['Multi-AZ', 'Graceful failover', 'Circuit breaker', 'Health checks']}
                  />
                )}
                {active === 'cloud-migration' && (
                  <MiniSim
                    steps={[
                      { title: 'Assess', body: 'Inventory apps, dependencies, data gravity, and compliance requirements.', accent: 'white' },
                      { title: 'Lift & Shift', body: 'Rehost with minimal change using infrastructure exports and image replication.', accent: 'blue' },
                      { title: 'Refactor', body: 'Replace monoliths with managed services, queues, and containers where it pays.', accent: 'white' },
                      { title: 'Optimize', body: 'Rightsize instances, autoscale, use savings plans, and remove idle resources.', accent: 'teal' },
                    ]}
                    tags={['Wave planning', 'Cutover window', 'Rollback plan', 'DNS switch']}
                  />
                )}
                {active === 'incident-response' && (
                  <MiniSim
                    steps={[
                      { title: 'Detect', body: 'Alert fires from latency spike; page on-call; preserve logs and timeline.', accent: 'rose' },
                      { title: 'Contain', body: 'Isolate dependency, enable circuit breaker, throttle traffic, and freeze risky changes.', accent: 'amber' },
                      { title: 'Recover', body: 'Restore from last healthy state, validate SLOs, then investigate root cause in parallel.', accent: 'teal' },
                    ]}
                    tags={['Timeline', 'Impact radius', 'Communication', 'Postmortem']}
                  />
                )}
                {active === 'git-workflow' && (
                  <MiniSim
                    steps={[
                      { title: 'Branch', body: 'Create short-lived feature branch from trunk with issue key prefix.', accent: 'white' },
                      { title: 'Commit', body: 'Small, reviewable commits with message convention and linked ticket.', accent: 'blue' },
                      { title: 'PR & CI', body: 'Automated lint, test, security scan, and preview environment validation.', accent: 'white' },
                      { title: 'Merge', body: 'Fast-forward or squash-merge after approval; release tag triggers deploy.', accent: 'teal' },
                    ]}
                    tags={['Trunk-based', 'Protected branches', 'Semantic versioning']}
                  />
                )}
                {active === 'network-troubleshooting' && (
                  <MiniSim
                    steps={[
                      { title: 'L1/L2', body: 'Check cable, duplex, VLAN assignment, port status, and ARP table consistency.', accent: 'white' },
                      { title: 'L3', body: 'Run traceroute, check route tables, MTU, ACLs, and firewall hits.', accent: 'blue' },
                      { title: 'L4/L7', body: 'Inspect TCP handshake, packet capture, TLS settings, and app response behavior.', accent: 'white' },
                      { title: 'DNS', body: 'Test resolution path, TTL effects, and compare recursive vs authoritative answers.', accent: 'white' },
                      { title: 'Cloud', body: 'Verify VPC routes, NAT gateway, endpoint policies, and provider status page.', accent: 'amber' },
                      { title: 'Traffic', body: 'Use synthetic probes, flow logs, and sampled packets to confirm exact loss path.', accent: 'teal' },
                    ]}
                    tags={['Layered isolation', 'Baselines', 'One variable']}
                  />
                )}
                {active === 'capacity-planning' && (
                  <MiniSim
                    steps={[
                      { title: 'Workload Inputs', body: 'Baseline QPS, peak multiplier, session length, and request payload size.', accent: 'white' },
                      { title: 'Headroom Model', body: 'Target 60–70% CPU utilization at peak with buffer for instance failures.', accent: 'blue' },
                      { title: 'Burst Plan', body: 'Reserve surge capacity via scheduled scaling or warm standby pools.', accent: 'white' },
                      { title: 'Load Test', body: 'Run synthetic peak traffic in staging; validate autoscaling rules and cold-start latency.', accent: 'teal' },
                      { title: 'Cost Profile', body: 'On-demand baseline, spot/preemptible batch, savings plans, and idle right-sizing.', accent: 'white' },
                      { title: 'Review Cycle', body: 'Monthly forecast review, traffic anomaly checks, and zone health audits.', accent: 'white' },
                    ]}
                    tags={['Utilization target', 'Burst budget', 'Multi-region', 'Chaos validation']}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {(() => {
          const refs = getModulesForLab(active);
          if (!refs.length) return null;
          return (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Related flashcards</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {refs.map((r) => (
                  <Link key={r.moduleId + r.concept} to={`/module/${r.moduleId}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs transition hover:border-white/25 hover:bg-white/[0.07]">
                    <span className="font-semibold text-white">{r.moduleTitle}</span>
                    <span className="text-slate-500">· {r.concept}</span>
                    <span className="text-blue-400">→</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {active === 'tcp' && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
              <h3 className="font-bold text-blue-300">TCP</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="text-blue-300">↔</span> Connection-oriented (3-way handshake)</li>
                <li className="flex items-center gap-2"><span className="text-blue-300">↔</span> Reliable — retransmits lost data</li>
                <li className="flex items-center gap-2"><span className="text-blue-300">↔</span> Ordered delivery</li>
                <li className="flex items-center gap-2 text-slate-500"><span>↔</span> Slower due to overhead</li>
                <li className="pt-1 text-xs text-slate-500">Used for: web, email, file transfer</li>
              </ul>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
              <h3 className="font-bold text-amber-300">UDP</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="text-amber-300">⇢</span> Connectionless — sends immediately</li>
                <li className="flex items-center gap-2"><span className="text-amber-300">⇢</span> Fast and lightweight</li>
                <li className="flex items-center gap-2 text-slate-500"><span>⇢</span> No delivery guarantee</li>
                <li className="flex items-center gap-2 text-slate-500"><span>⇢</span> No ordering or retransmission</li>
                <li className="pt-1 text-xs text-slate-500">Used for: DNS, video, VoIP, gaming</li>
              </ul>
            </div>
          </div>
        )}

        {active === 'load-balancer' && (
          <MiniSim
            title="Load Balancer"
            accent="indigo"
            tags={['Layer 4/7', 'Health checks', 'Failover']}
            steps={[
              { title: 'Round-Robin', body: 'Spreads requests evenly across servers in rotation.', accent: 'indigo' },
              { title: 'Least-Connections', body: 'Routes traffic to the server with the fewest active connections.', accent: 'indigo' },
              { title: 'Health Checks', body: 'Pings each server on a schedule; removes unhealthy targets automatically.', accent: 'teal' },
              { title: 'Failover', body: 'When a server fails, LB stops sending traffic and another server takes over.', accent: 'rose' },
            ]}
          />
        )}

        {active === 'auto-scaling' && (
          <MiniSim
            title="Auto-Scaling"
            accent="blue"
            tags={['Cloud', 'Elastic', 'Cost-aware']}
            steps={[
              { title: 'Scale Out', body: 'Adds instances when load rises beyond target utilization.', accent: 'blue' },
              { title: 'Scale In', body: 'Removes idle instances when load drops back below threshold.', accent: 'amber' },
              { title: 'Cooldown', body: 'After scaling, waits for metrics to stabilize before triggering again.', accent: 'white' },
              { title: 'Scheduled Scaling', body: 'Pre-scales capacity for known traffic patterns like product launches.', accent: 'teal' },
            ]}
          />
        )}
      </div>
    </div>
  );
}
