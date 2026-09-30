import React from 'react';
import { Cpu, HardDrive, Network, Share2, Cloud, Boxes, Database, ShieldCheck, Workflow, Terminal, Lock, GitBranch, Trophy, ArrowRight } from 'lucide-react';
import { Card, CardFooter, IconTile, ProgressRing } from '@/components/ui-glass';
import { categoryColors } from '@/data/modules';
import LevelBadge from './LevelBadge';

const icons = { Cpu, HardDrive, Network, Share2, Cloud, Boxes, Database, ShieldCheck, Workflow, Terminal, Lock, GitBranch, Trophy };

/** Library tile for one of the original modules. The category colour tints the icon only. */
export default function ModuleCard({ module, percent }) {
  const Icon = icons[module.icon] || Network;
  const cat = categoryColors[module.category] || categoryColors.Networking;
  return (
    <Card to={`/module/${module.id}`} className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={Icon} color={cat.dot} />
        <ProgressRing value={percent} label={`${module.title} progress`} size={44} />
      </div>
      <div className="mt-4">
        <LevelBadge level={module.level} />
      </div>
      <h3 className="mt-1 text-heading text-ink-1">{module.title}</h3>
      <p className="mt-1 flex-1 text-small text-ink-2">{module.subtitle}</p>
      <CardFooter>
        <span className="text-small text-ink-2">{module.concepts.length} concepts</span>
        <span className="inline-flex items-center gap-1 text-small font-semibold text-ink-1">
          Study <ArrowRight size={14} aria-hidden="true" />
        </span>
      </CardFooter>
    </Card>
  );
}
