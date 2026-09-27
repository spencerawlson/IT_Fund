import React from 'react';
import Navbar from '@/components/Navbar';
import { useBgTint } from '@/components/academy/LiquidBackground';
import { Link } from 'react-router-dom';
import { ArrowLeft, Map, Trophy, CheckCircle2 } from 'lucide-react';
import { modules, levelColors } from '@/data/modules';
import { getOverallProgress } from '@/lib/progress';

const PHASES = [
  { n: 1, title: 'IT Fundamentals', desc: 'How computers work — binary, hardware, boot, and file systems.', color: '#A855F7', ids: ['it-fundamentals-internals', 'module-2', 'module-3'] },
  { n: 2, title: 'Networking', desc: 'How data moves — OSI model, IP, protocols, and devices.', color: '#3B82F6', ids: ['module-31', 'osi-protocols', 'module-6', 'network-devices-tools'] },
  { n: 3, title: 'Operating Systems', desc: 'Managing Windows Active Directory and Linux servers.', color: '#06B6D4', ids: ['windows-active-directory', 'linux-administration'] },
  { n: 4, title: 'Virtualization & Containers', desc: 'Hypervisors, VMs, Docker, and Kubernetes.', color: '#0EA5E9', ids: ['virtualization'] },
  { n: 5, title: 'Cloud Computing', desc: 'Service models, VPCs, storage, and core cloud services.', color: '#6366F1', ids: ['cloud-foundations', 'cloud-networking', 'cloud-storage'] },
  { n: 6, title: 'Cybersecurity', desc: 'CIA triad, threats, defenses, and cryptography.', color: '#F43F5E', ids: ['cybersecurity-fundamentals', 'cryptography-essentials'] },
  { n: 7, title: 'Cloud Security', desc: 'IAM, zero trust, encryption, and shared responsibility.', color: '#8B5CF6', ids: ['cloud-security'] },
  { n: 8, title: 'DevOps & Automation', desc: 'Git, CI/CD, Infrastructure as Code, and monitoring.', color: '#F59E0B', ids: ['devops-automation'] },
  { n: 9, title: 'Advanced Cybersecurity', desc: 'Pentesting, SOC, incident response, and red/blue teams.', color: '#EF4444', ids: ['advanced-cybersecurity-soc'] },
  { n: 10, title: 'System Design & Architecture', desc: 'Distributed systems, observability, and reliability.', color: '#6366F1', ids: ['cloud-architecture', 'system-design-reliability'] },
  { n: 11, title: 'Certifications', desc: 'The certification path — CompTIA → CCNA → Security+ → AWS → CISSP.', color: '#22C55E', ids: ['certification-roadmap'] },
];

const CERTS = [
  { name: 'CompTIA A+', level: 'Beginner' },
  { name: 'Network+', level: 'Beginner' },
  { name: 'CCNA', level: 'Intermediate' },
  { name: 'Security+', level: 'Intermediate' },
  { name: 'CEH', level: 'Advanced' },
  { name: 'AWS Architect', level: 'Advanced' },
  { name: 'CISSP', level: 'Expert' },
];

export default function Roadmap() {
  useBgTint('#10B981');
  const overallPct = Math.round(modules.reduce((s, m) => s + getOverallProgress(m.id), 0) / modules.length);

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="relative mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={15} /> Study Hub
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <Map size={16} /> Your Path
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Learning{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-blue-300 bg-clip-text text-transparent">Roadmap</span>
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-400">
            A guided route through every layer of the IT, networking, cloud, and security curriculum — from first
            principles to expert system design.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-4 py-2.5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400">Overall Progress</span>
            <span className="text-lg font-bold text-emerald-400">{overallPct}%</span>
          </div>
        </header>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-white/10" />
          <div className="space-y-6">
            {PHASES.map((phase) => {
              const phaseMods = phase.ids.map((id) => modules.find((m) => m.id === id)).filter(Boolean);
              const phasePct = phaseMods.length
                ? Math.round(phaseMods.reduce((s, m) => s + getOverallProgress(m.id), 0) / phaseMods.length)
                : 0;
              const done = phasePct === 100;
              return (
                <div key={phase.n} className="relative pl-12">
                  <div
                    className={`absolute left-0 top-1.5 flex h-9 w-9 items-center justify-center rounded-full border-2 ${done ? 'border-emerald-500/50 bg-emerald-500/15' : 'border-white/15 bg-black/40 backdrop-blur-md'}`}
                  >
                    {done ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : (
                      <span className="text-xs font-bold" style={{ color: phase.color }}>{phase.n}</span>
                    )}
                  </div>
                  <div className="rounded-2xl glass p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-white">{phase.title}</h2>
                        <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{phase.desc}</p>
                      </div>
                      <p className="shrink-0 text-lg font-bold" style={{ color: phase.color }}>{phasePct}%</p>
                    </div>
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full transition-all" style={{ width: `${phasePct}%`, backgroundColor: phase.color }} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {phaseMods.map((m) => {
                        const pct = getOverallProgress(m.id);
                        const lvl = levelColors[m.level] || levelColors.Beginner;
                        return (
                          <Link
                            key={m.id}
                            to={`/module/${m.id}`}
                            className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs transition hover:border-white/25 hover:bg-white/[0.12]"
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: lvl.dot }} />
                            <span className="font-semibold text-white">{m.title}</span>
                            <span className="text-slate-400">· {pct}%</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Certification milestones */}
        <div className="mt-12 rounded-2xl glass p-5">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Certification Milestones</h2>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {CERTS.map((c, i) => {
              const lvl = levelColors[c.level] || levelColors.Beginner;
              return (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: lvl.dot }} />
                    <span className="text-xs font-semibold text-white">{c.name}</span>
                    <span className="text-[10px] text-slate-400">{c.level}</span>
                  </div>
                  {i < CERTS.length - 1 && <span className="text-slate-500">→</span>}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Open the Certifications module for details on each exam, prerequisites, and the roles they unlock.
          </p>
        </div>
      </div>
    </div>
  );
}