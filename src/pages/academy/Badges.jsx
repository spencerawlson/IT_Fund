// All 10 academy badges with earned/locked states. Read-only view over the game engine.
import React from 'react';
import { Award, Flame, Zap, Layers, Swords, Crown, ShieldCheck, Footprints, Lock } from 'lucide-react';
import { Card, PageContainer, PageHeader, IconTile } from '@/components/ui-glass';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import Seo from '@/components/Seo';
import FaqSection, { faqJsonLd } from '@/components/FaqSection';
import { BADGES, useAcademy } from '@/lib/academy';

const ICONS = { Footprints, Flame, Zap, Layers, Swords, Crown, Award, ShieldCheck };

function BadgeCard({ id, badge, earned }) {
  const Icon = ICONS[badge.icon] || Award;
  const ignited = earned && id.startsWith('streak-');
  return (
    <Card level={2} padding="md" className={earned ? '' : 'opacity-75'}>
      <div className="flex items-start gap-4">
        <span className={ignited ? 'streak-ignited inline-flex rounded-control' : 'inline-flex'}>
          <IconTile icon={earned ? Icon : Lock} color={earned ? '#f59e0b' : '#64748b'} />
        </span>
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

// FAQ, in the product's own words — rendered below and mirrored as FAQPage
// JSON-LD on this page's <Seo> (single source of truth, no drift).
const FAQS = [
  {
    q: 'How do I earn a badge?',
    a: 'Badges are awarded automatically as you study. Review your first card for First Steps, keep a daily streak for On a Roll, Week Warrior and Unbreakable, master a deck for Deck Master, and beat a tier boss for Boss Slayer.',
  },
  {
    q: 'What is a streak?',
    a: 'Studying on consecutive days. Three days in a row earns On a Roll, seven earns Week Warrior, and thirty earns Unbreakable.',
  },
  {
    q: 'What does the CISSP-Ready badge mean?',
    a: 'You reached 80% readiness in all eight CISSP domains — the same bar the roadmap uses for exam-ready. It is a readiness marker, not a certification.',
  },
  {
    q: 'What is the mastered box?',
    a: 'Cards move through review boxes as you answer them correctly — the Leitner system: get a card right and it waits longer before coming back; get it wrong and it returns sooner. One hundred cards in the mastered box earns Century.',
    sources: [
      { label: 'Leitner system', href: 'https://en.wikipedia.org/wiki/Leitner_system' },
    ],
  },
  {
    q: 'Do badges count toward a certification?',
    a: 'No. Badges are motivation inside Road to CISSP — they unlock nothing and never expire; they just mark progress. Certifications themselves are issued by the vendors: the CISSP by ISC2, Security+ by CompTIA.',
    sources: [
      { label: 'ISC2 CISSP', href: 'https://www.isc2.org/certifications/cissp' },
      { label: 'CompTIA Security+', href: 'https://www.comptia.org/certifications/security' },
    ],
  },
];

export default function Badges() {
  useDocumentTitle('Badges · Road to CISSP');
  const state = useAcademy();
  const earned = new Set(state.badges || []);
  const entries = Object.entries(BADGES);
  const earnedCount = entries.filter(([id]) => earned.has(id)).length;

  return (
    <PageContainer>
      <Seo
        title="Badges — study streaks and mastery · Road to CISSP"
        description="Badges are awarded automatically as you study — keep the streak alive and master your decks."
        path="/academy/badges"
        jsonLd={faqJsonLd(FAQS)}
      />
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
      <div className="mt-12">
        <FaqSection faqs={FAQS} />
      </div>
    </PageContainer>
  );
}
