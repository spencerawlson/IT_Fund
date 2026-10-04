// All 10 academy badges with earned/locked states. Read-only view over the game engine.
import React from 'react';
import { Award, Flame, Zap, Layers, Swords, Crown, ShieldCheck, Footprints, Lock } from 'lucide-react';
import { Card, PageContainer, PageHeader, IconTile } from '@/components/ui-glass';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { BADGES, useAcademy } from '@/lib/academy';

const ICONS = { Footprints, Flame, Zap, Layers, Swords, Crown, Award, ShieldCheck };

function BadgeCard({ id, badge, earned }) {
  const Icon = ICONS[badge.icon] || Award;
  return (
    <Card level={2} padding="md" className={earned ? '' : 'opacity-75'}>
      <div className="flex items-start gap-4">
        <IconTile icon={earned ? Icon : Lock} color={earned ? '#f59e0b' : '#64748b'} />
        <div className="min-w-0 flex-1">
          <h2 className="text-heading text-ink-1">{badge.title}</h2>
          <p className="mt-1 text-small text-ink-2">{earned ? badge.desc : `Locked — ${badge.desc.charAt(0).toLowerCase()}${badge.desc.slice(1)}`}</p>
          <p className={`mt-2 text-caption font-semibold ${earned ? 'text-emerald-400' : 'text-ink-2'}`}>
            {earned ? 'Earned' : 'Locked'}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function Badges() {
  useDocumentTitle('Badges · Road to CISSP');
  const state = useAcademy();
  const earned = new Set(state.badges || []);
  const entries = Object.entries(BADGES);
  const earnedCount = entries.filter(([id]) => earned.has(id)).length;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Badges' }]}
        title="Badges"
        description={`${earnedCount} of ${entries.length} earned. Badges are awarded automatically as you study — keep the streak alive and master your decks.`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map(([id, badge]) => (
          <BadgeCard key={id} id={id} badge={badge} earned={earned.has(id)} />
        ))}
      </div>
    </PageContainer>
  );
}
