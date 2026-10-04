import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { modules } from '@/data/modules';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const TRACKS = [
  {
    id: 'cloud-engineer',
    title: 'Cloud Engineer',
    description: 'Core cloud, networking, Linux, containers, observability, and infrastructure automation.',
    modules: ['cloud-foundations', 'cloud-networking', 'cloud-storage', 'cloud-architecture', 'cicd-gitops'],
    labs: ['aws', 'azure', 'gcp', 'kubernetes', 'linux-lab', 'python-lab'],
  },
  {
    id: 'security-analyst',
    title: 'Security Analyst',
    description: 'Threats, identity, zero trust, TLS, incidents, and practical defense playbooks.',
    modules: ['cybersecurity-fundamentals', 'cloud-security', 'cryptography-essentials', 'troubleshooting-methodology'],
    labs: ['security-incident', 'tls', 'firewall', 'encryption', 'terminal'],
  },
  {
    id: 'devops-engineer',
    title: 'DevOps / SRE',
    description: 'CI/CD, GitOps, IaC, release strategy, monitoring, containers, and runbooks.',
    modules: ['devops-automation', 'cicd-gitops', 'system-design-reliability', 'troubleshooting-methodology'],
    labs: ['cicd', 'git-flow', 'kubernetes', 'python-lab', 'terminal'],
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    description: 'APIs, data modeling, SQL, caching, reliability, and automation scripting.',
    modules: ['database-fundamentals', 'cloud-architecture', 'cicd-gitops'],
    labs: ['sql-lab', 'python-lab', 'terminal'],
  },
  {
    id: 'network-engineer',
    title: 'Network Engineer',
    description: 'OSI, TCP/UDP, DNS, routing, load balancing, VPN, and structured troubleshooting.',
    modules: ['it-fundamentals-internals', 'osi-protocols', 'network-devices-tools', 'cloud-networking'],
    labs: ['tcp', 'udp', 'dns', 'routing', 'load-balancer'],
  },
  {
    id: 'platform-engineer',
    title: 'Platform Engineer',
    description: 'Kubernetes, GitOps, IaC, release strategy, observability, and reliability playbooks.',
    modules: ['kubernetes-container-orchestration', 'cicd-gitops', 'cloud-architecture', 'troubleshooting-methodology'],
    labs: ['kubernetes', 'git-flow', 'python-lab', 'terminal'],
  },
];

function resolveTitle(id) {
  const m = modules.find((x) => x.id === id);
  return m ? m.title : id;
}

export default function Tracks() {
  useDocumentTitle('Tracks · Road to CISSP');
  return (
    <div className="min-h-screen text-ink-1">

      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/academy/courses" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 transition hover:text-ink-1">
          <ArrowLeft size={15} /> Courses
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Career{' '}
            Tracks
          </h1>
          <p className="mt-2 max-w-xl text-body leading-relaxed text-ink-2">
            Pick a track. Each path chains modules and visual labs into a practical learning route.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRACKS.map((t) => (
            <div key={t.id} className="rounded-control glass-1 p-5">
              <h2 className="text-base font-bold text-ink-1">{t.title}</h2>
              <p className="mt-1 text-small text-ink-2">{t.description}</p>

              <div className="mt-3 space-y-2 text-caption text-ink-2">
                <div>
                  <p className="text-ink-2">Modules</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {t.modules.map((id) => (
                      <Link key={id} to={`/module/${id}`} className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 transition hover:border-white/25 hover:bg-white/[0.12]">
                        {resolveTitle(id)}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-ink-2">Labs</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {t.labs.map((id) => (
                      <Link key={id} to={`/lab?item=${id}`} className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 transition hover:border-white/25 hover:bg-white/[0.12]">
                        {id}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
