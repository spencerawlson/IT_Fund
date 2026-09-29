import React from 'react';
import { categoryColors } from '@/data/modules';

export default function CategoryBadge({ category }) {
  const c = categoryColors[category] || categoryColors.Networking;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-semibold ${c.pill}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {category}
    </span>
  );
}