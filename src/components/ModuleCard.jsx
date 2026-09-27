import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, HardDrive, Network, Share2, Cloud, Boxes, Database, ShieldCheck, Workflow, Terminal, Lock, GitBranch, Trophy, ArrowRight } from 'lucide-react';
import { categoryColors } from '@/data/modules';
import ProgressRing from './ProgressRing';
import LevelBadge from './LevelBadge';

const icons = { Cpu, HardDrive, Network, Share2, Cloud, Boxes, Database, ShieldCheck, Workflow, Terminal, Lock, GitBranch, Trophy };

export default function ModuleCard({ module, percent }) {
  const Icon = icons[module.icon] || Network;
  const cat = categoryColors[module.category] || categoryColors.Networking;
  return (
    <Link
      to={`/module/${module.id}`}
      className={`group relative overflow-hidden rounded-2xl glass p-5 transition-all hover:border-white/20 hover:border-white/30 ${cat.glow} hover:shadow-xl`}
    >
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: cat.dot }}
      />
      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
          style={{ backgroundColor: `${cat.dot}15`, color: cat.dot }}
        >
          <Icon size={22} />
        </div>
        <ProgressRing percent={percent} color={cat.dot} />
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Module {module.number}</p>
          <LevelBadge level={module.level} />
        </div>
        <h3 className="mt-1 text-lg font-bold leading-tight text-white">{module.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{module.subtitle}</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-xs text-slate-400">{module.concepts.length} concepts</span>
        <span className="flex items-center gap-1 text-xs font-semibold text-white transition-transform group-hover:translate-x-0.5">
          Study <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}