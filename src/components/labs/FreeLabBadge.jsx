import React from 'react';
import { Badge } from '@/components/ui-glass';

// The free-lab marker (Spencer, 2026-11-16): a visitor must be able to tell at
// a glance which labs they can try without a plan. Wording is his: "Free" +
// "No plan needed". One component so the wording cannot drift between the
// surfaces that list labs. The terminal console has its own text version
// (freeLabel in useLabConsole) because it renders plain text, not JSX.
export function FreeLabBadge() {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge>Free</Badge>
      <span className="text-caption text-ink-2">No plan needed</span>
    </span>
  );
}
