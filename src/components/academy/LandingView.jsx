import React from 'react';
import { ArrowRight, BookOpen, Crown, Map, Repeat, Target, Terminal } from 'lucide-react';
import { Button, Card, IconTile, PageContainer, SectionHeader, Stat } from '@/components/ui-glass';
import { allCards, allDecks, CISSP_DOMAINS, getTrack, ROADMAP, tracks } from '@/data/academy';
import { iconFor } from '@/components/academy/icons';

const fmt = (n) => n.toLocaleString('en-US');

/** Live card count across one or more tracks. Never hardcoded. */
function cardsFor(trackIds) {
  return trackIds.reduce((total, id) => {
    const track = getTrack(id);
    if (!track) return total;
    return total + track.tiers.reduce(
      (sum, tier) => sum + tier.decks.reduce((n, deck) => n + deck.cards.length, 0),
      0,
    );
  }, 0);
}

function trackTitles(trackIds) {
  return trackIds.map((id) => getTrack(id)?.title).filter(Boolean).join(' · ');
}

/** The five learning pillars, each backed by one or two flashcard tracks. */
const PILLARS = [
  {
    id: 'networking',
    title: 'Networking',
    desc: 'Packets, subnets, and routing — the ground everything else stands on.',
    icon: 'Network',
    color: '#3B82F6',
    trackIds: ['network', 'routing'],
    to: '/academy/network',
  },
  {
    id: 'security',
    title: 'Security',
    desc: 'Defend and attack: security fundamentals plus hands-on blue and red team skills.',
    icon: 'ShieldCheck',
    color: '#F43F5E',
    trackIds: ['security', 'cyber'],
    to: '/academy/security',
  },
  {
    id: 'python',
    title: 'Python',
    desc: 'From print() to production automation and security tooling.',
    icon: 'Code2',
    color: '#EAB308',
    trackIds: ['python'],
    to: '/academy/python',
  },
  {
    id: 'cloud',
    title: 'Cloud',
    desc: 'Service models to Well-Architected design to cloud-native security.',
    icon: 'Cloud',
    color: '#6366F1',
    trackIds: ['cloud'],
    to: '/academy/cloud',
  },
  {
    id: 'linux',
    title: 'Linux',
    desc: 'Own the command line: the OS that runs the cloud, the SOC, and every server.',
    icon: 'Terminal',
    color: '#84CC16',
    trackIds: ['linux'],
    to: '/academy/linux',
  },
  {
    id: 'ai',
    title: 'AI Engineering',
    desc: 'ML fundamentals to production LLM apps, agents, and AI security.',
    icon: 'Brain',
    color: '#A855F7',
    trackIds: ['ai'],
    to: '/academy/ai',
  },
];

const STEPS = [
  {
    icon: BookOpen,
    color: '#3B82F6',
    title: 'Learn',
    desc: 'Flashcards and guided lessons build every concept from zero — no prerequisites assumed.',
  },
  {
    icon: Target,
    color: '#F43F5E',
    title: 'Drill',
    desc: 'Quizzes and boss battles test your recall under pressure, exam-style.',
  },
  {
    icon: Terminal,
    color: '#84CC16',
    title: 'Build',
    desc: 'Hands-on labs in real terminals: configure routers, triage logs, automate with Python.',
  },
  {
    icon: Repeat,
    color: '#F59E0B',
    title: 'Retain',
    desc: 'Spaced repetition and daily streaks lock it in for exam day — and beyond.',
  },
];

function PillarCard({ pillar }) {
  const Icon = iconFor(pillar.icon);
  const count = cardsFor(pillar.trackIds);
  return (
    <Card to={pillar.to} className="group">
      <div className="flex items-start gap-4">
        <IconTile icon={Icon} color={pillar.color} />
        <div className="min-w-0 flex-1">
          <h3 className="text-heading text-ink-1">{pillar.title}</h3>
          <p className="mt-1 text-small text-ink-2">{pillar.desc}</p>
          <p className="mt-3 text-caption font-medium text-ink-2">
            {trackTitles(pillar.trackIds)} · <span className="tabular-nums">{fmt(count)} cards</span>
          </p>
        </div>
        <ArrowRight
          size={18}
          className="mt-1 shrink-0 text-ink-2 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </div>
    </Card>
  );
}

/** First-run landing: the platform pitch for new visitors. Shown when no lesson progress exists. */
export default function LandingView() {
  const cardCount = allCards.length;
  const cisspCount = cardsFor(['cissp']);

  return (
    <PageContainer>
      {/* Hero */}
      <section aria-labelledby="landing-hero-heading" className="pb-4 pt-8 md:pt-14">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-ink-2">
          Road to CISSP
        </p>
        <h1
          id="landing-hero-heading"
          className="mt-4 max-w-[16ch] font-bold text-ink-1"
          style={{ fontSize: 'clamp(2.25rem, 1.6rem + 3.2vw, 3.5rem)', lineHeight: 1.08, letterSpacing: '-0.02em' }}
        >
          From IT foundations to cybersecurity expert.
        </h1>
        <p className="mt-5 max-w-reading text-body text-ink-2 md:text-lesson">
          Master networking, security, Python, cloud, and cybersecurity in one calm
          place — {fmt(cardCount)} flashcards, guided lessons, and hands-on labs
          that take you from your first subnet to the CISSP.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button to="/academy/roadmap" size="lg" icon={Map} className="sm:w-auto w-full justify-center">
            Start learning
          </Button>
          <Button to="/tracks" size="lg" variant="secondary" className="sm:w-auto w-full justify-center">
            Explore tracks
          </Button>
        </div>
      </section>

      {/* Live stats band */}
      <Card level={2} padding="md" className="mt-8" aria-label="Platform stats">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
          <Stat label="flashcards" value={fmt(cardCount)} />
          <Stat label="learning tracks" value={fmt(tracks.length)} />
          <Stat label="study decks" value={fmt(allDecks.length)} />
          <Stat label="CISSP domains" value={fmt(CISSP_DOMAINS.length)} />
        </dl>
      </Card>

      {/* Pillars */}
      <section aria-labelledby="pillars-heading" className="mt-14">
        <SectionHeader
          id="pillars-heading"
          title="Choose your battlefield"
          description="Six pillars, nine tracks — start anywhere, switch anytime. Your place is saved as you go."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {PILLARS.map((pillar) => (
            <PillarCard key={pillar.id} pillar={pillar} />
          ))}
        </div>

        {/* CISSP Capstone: the destination */}
        <Card to="/academy/cissp" className="group mt-4 border-amber-200/60">
          <div className="flex flex-wrap items-center gap-4">
            <IconTile icon={Crown} color="#F59E0B" size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold uppercase tracking-[0.18em] text-ink-2">
                The destination
              </p>
              <h3 className="mt-1 text-heading text-ink-1">CISSP Capstone</h3>
              <p className="mt-1 text-small text-ink-2">
                All {CISSP_DOMAINS.length} domains with the managerial mindset the exam
                demands — <span className="tabular-nums">{fmt(cisspCount)} cards</span>.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-small font-semibold text-ink-2 transition group-hover:text-ink-1">
              Enter the capstone <ArrowRight size={16} aria-hidden="true" />
            </span>
          </div>
        </Card>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading" className="mt-14">
        <SectionHeader
          id="how-heading"
          title="How the platform works"
          description="A loop, not a syllabus: every track runs the same four moves."
        />
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Card level={1} padding="md" className="h-full">
                <div className="flex items-center gap-3">
                  <IconTile icon={step.icon} color={step.color} />
                  <span className="text-caption font-semibold uppercase tracking-wider text-ink-2">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-heading text-ink-1">{step.title}</h3>
                <p className="mt-1 text-small text-ink-2">{step.desc}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Roadmap teaser */}
      <section aria-labelledby="roadmap-heading" className="mt-14">
        <Card to="/academy/roadmap" padding="lg" className="group">
          <div className="flex flex-wrap items-center gap-5">
            <IconTile icon={Map} color="#0EA5E9" size="lg" />
            <div className="min-w-0 flex-1">
              <h2 id="roadmap-heading" className="text-heading text-ink-1">
                The Road to CISSP
              </h2>
              <p className="mt-1 max-w-reading text-small text-ink-2">
                {ROADMAP.length} steps from foundations to exam day, mapped to free
                and industry certifications along the way. Follow it in order or
                jump to whatever you need today.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-small font-semibold text-ink-2 transition group-hover:text-ink-1">
              View the roadmap <ArrowRight size={16} aria-hidden="true" />
            </span>
          </div>
        </Card>
      </section>

      {/* Final CTA */}
      <section aria-label="Get started" className="mt-14 pb-6 text-center">
        <h2 className="mx-auto max-w-[20ch] text-title text-ink-1">
          Your security career starts with a single card.
        </h2>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to="/academy/roadmap" size="lg" icon={Map} className="sm:w-auto w-full justify-center">
            Start learning
          </Button>
          <Button to="/tracks" size="lg" variant="secondary" className="sm:w-auto w-full justify-center">
            Explore tracks
          </Button>
        </div>
      </section>
    </PageContainer>
  );
}
