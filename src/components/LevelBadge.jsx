import React from 'react';
import { Badge } from '@/components/ui-glass';

/** Difficulty level. A fact, not a status, so it uses the neutral badge (no traffic-light colours). */
export default function LevelBadge({ level }) {
  if (!level) return null;
  return <Badge>{level}</Badge>;
}
