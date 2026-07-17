import React from 'react';
import { levelColors } from '@/data/modules';

export default function LevelBadge({ level }) {
  if (!level) return null;
  const c = levelColors[level];
  if (!c) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.pill}`}>
      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: c.dot }} />
      {level}
    </span>
  );
}