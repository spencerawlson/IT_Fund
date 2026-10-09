import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BookOpen, CheckCircle2, Crown, Flame, Map, Repeat, Sparkles, Target, Terminal, Zap,
} from 'lucide-react';
import { Button, Card, IconTile, PageContainer, SectionHeader, Stat } from '@/components/ui-glass';
import { allCards, allDecks, CISSP_DOMAINS, getTrack, ROADMAP, tracks } from '@/data/academy';
import { iconFor } from '@/components/academy/icons';

const fmt = (n) => n.toLocaleString('en-US');
const ACCENT = 'rgb(124 58 237)';

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

/** The learning pillars, each backed by one or two flashcard tracks. */
const PILLARS = [
  { id: 'networking', title: 'Networking', desc: 'Packets, subnets, and routing — the ground everything else stands on.', icon: 'Network', color: '#3B82F6', trackIds: ['network', 'routing'], to: '/academy/network' },
  { id: 'security', title: 'Security', desc: 'Defend and attack: security fundamentals plus hands-on blue and red team skills.', icon: 'ShieldCheck', color: '#F43F5E', trackIds: ['security', 'cyber'], to: '/academy/security' },
  { id: 'python', title: 'Python', desc: 'From print() to production automation and security tooling.', icon: 'Code2', color: '#EAB308', trackIds: ['python'], to: '/academy/python' },
  { id: 'cpp', title: 'C++', desc: 'Systems programming: performance, pointers, the STL and modern memory-safe C++.', icon: 'Code2', color: '#00599C', trackIds: ['cpp'], to: '/academy/cpp' },
  { id: 'go', title: 'Go', desc: 'Simple, fast and concurrent: goroutines, channels and the language of cloud-native tooling.', icon: 'Code2', color: '#00ADD8', trackIds: ['go'], to: '/academy/go' },
  { id: 'rust', title: 'Rust', desc: 'Memory-safe systems programming: ownership, borrowing and fearless concurrency, no GC.', icon: 'Code2', color: '#CE422B', trackIds: ['rust'], to: '/academy/rust' },
  { id: 'sql', title: 'SQL', desc: 'Query, shape and protect relational data: joins, aggregation, indexing and injection defence.', icon: 'Database', color: '#0891B2', trackIds: ['sql'], to: '/academy/sql' },
  { id: 'docker', title: 'Docker', desc: 'Build, ship and run apps in portable containers: images, Compose, and image security.', icon: 'Container', color: '#2496ED', trackIds: ['docker'], to: '/academy/docker' },
  { id: 'kubernetes', title: 'Kubernetes', desc: 'Orchestrate containers at scale: pods, Services, rollouts, autoscaling and cluster security.', icon: 'Ship', color: '#326CE5', trackIds: ['kubernetes'], to: '/academy/kubernetes' },
  { id: 'cloud', title: 'Cloud', desc: 'Service models to Well-Architected design to cloud-native security.', icon: 'Cloud', color: '#6366F1', trackIds: ['cloud'], to: '/academy/cloud' },
  { id: 'terraform', title: 'Terraform', desc: 'Infrastructure as Code: plan and provision cloud infra as versioned, reviewable code.', icon: 'Layers', color: '#7B42BC', trackIds: ['terraform'], to: '/academy/terraform' },
  { id: 'linux', title: 'Linux', desc: 'Own the command line: the OS that runs the cloud, the SOC, and every server.', icon: 'Terminal', color: '#84CC16', trackIds: ['linux'], to: '/academy/linux' },
  { id: 'ai', title: 'AI Engineering', desc: 'ML fundamentals to production LLM apps, agents, and AI security.', icon: 'Brain', color: '#A855F7', trackIds: ['ai'], to: '/academy/ai' },
];

const STEPS = [
  { icon: BookOpen, color: '#3B82F6', title: 'Learn', desc: 'Flashcards and guided lessons build every concept from zero — no prerequisites assumed.' },
  { icon: Target, color: '#F43F5E', title: 'Drill', desc: 'Quizzes and boss battles test your recall under pressure, exam-style.' },
  { icon: Terminal, color: '#84CC16', title: 'Build', desc: 'Hands-on labs in real terminals: configure routers, triage logs, automate with Python.' },
  { icon: Repeat, color: '#F59E0B', title: 'Retain', desc: 'Spaced repetition and daily streaks lock it in for exam day — and beyond.' },
];

/** Honest, verifiable claims — no account wall, local progress, free to start (see lib/academy). */
const CLAIMS = ['Free to start', 'No account needed', 'Progress saved as you go'];

/** A clipped layer of soft violet glow blobs, painted behind a section's content. The clip stops a
 *  wide blurred blob from forcing horizontal scroll; -z-10 keeps it behind the (translucent) glass. */
function GlowLayer({ children }) {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">{children}</div>;
}
function Glow({ className, style }) {
  return <span className={`absolute block rounded-full blur-[90px] ${className}`} style={style} />;
}

/**
 * The hero's product visual — a collage built from the platform's own surfaces (a flashcard, a
 * real lab terminal, a streak chip) so a visitor sees what they'll actually use, not an abstract
 * graphic. Floating chips are hidden on the smallest screens to keep the layout tidy.
 */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <GlowLayer>
        <Glow className="h-72 w-72" style={{ top: '-1rem', right: '0', background: 'radial-gradient(closest-side, rgba(124,58,237,0.22), transparent)' }} />
        <Glow className="h-64 w-64" style={{ bottom: '-1rem', left: '0', background: 'radial-gradient(closest-side, rgba(59,130,246,0.16), transparent)' }} />
      </GlowLayer>

      {/* Preview window */}
      <div className="glass-strong relative rounded-card p-3 shadow-[0_30px_80px_-30px_rgba(76,29,149,0.45)]">
        <div className="flex items-center gap-2 px-2 pb-2.5 pt-1">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </span>
          <span className="ml-1 text-caption text-ink-3">Networking · Lesson 3 of 9</span>
          <span className="ml-auto flex items-center gap-2.5 text-caption font-semibold text-ink-2">
            <span className="inline-flex items-center gap-1"><Flame size={12} style={{ color: '#f97316' }} aria-hidden="true" /> 7</span>
            <span className="inline-flex items-center gap-1"><Zap size={12} style={{ color: ACCENT }} aria-hidden="true" /> +120 XP</span>
          </span>
        </div>

        {/* Flashcard */}
        <div className="rounded-control border border-black/[0.06] bg-white/75 p-4">
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-3">Flashcard</p>
          <p className="mt-2 text-body font-semibold text-ink-1">How many usable hosts does a /26 subnet give you?</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-small font-semibold" style={{ color: ACCENT, background: 'rgba(124,58,237,0.10)' }}>
            <CheckCircle2 size={14} aria-hidden="true" /> 62 usable
          </div>
        </div>

        {/* Mastery bar */}
        <div className="mt-3 px-0.5">
          <div className="mb-1 flex items-center justify-between text-caption text-ink-3">
            <span>Module mastery</span><span className="tabular-nums">60%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
            <div className="h-full rounded-full" style={{ width: '60%', background: ACCENT }} />
          </div>
        </div>

        {/* Real lab terminal strip */}
        <div className="mt-3 rounded-control bg-[#0b1020] p-3 font-mono text-[11px] leading-relaxed">
          <div className="text-emerald-300"><span className="text-emerald-400">student@lab:~$</span> show ip route</div>
          <div className="text-emerald-400/80">O&nbsp;&nbsp;&nbsp;10.2.2.0/24 [110/2] via 192.0.2.2</div>
          <div className="text-emerald-400/80">C&nbsp;&nbsp;&nbsp;10.1.1.0/24 is directly connected</div>
        </div>
      </div>
    </div>
  );
}

function PillarCard({ pillar }) {
  const Icon = iconFor(pillar.icon);
  const count = cardsFor(pillar.trackIds);
  return (
    <Card to={pillar.to} className="glass-hover group">
      <div className="flex items-start gap-4">
        <IconTile icon={Icon} color={pillar.color} />
        <div className="min-w-0 flex-1">
          <h3 className="text-heading text-ink-1">{pillar.title}</h3>
          <p className="mt-1 text-small text-ink-2">{pillar.desc}</p>
          <p className="mt-3 text-caption font-medium text-ink-2">
            {trackTitles(pillar.trackIds)} · <span className="tabular-nums">{fmt(count)} cards</span>
          </p>
        </div>
        <ArrowRight size={18} className="mt-1 shrink-0 text-ink-2 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </div>
    </Card>
  );
}

/** First-run landing: the platform pitch for new visitors. Shown when no lesson progress exists. */
export default function LandingView() {
  const reduce = useReducedMotion();
  const cardCount = allCards.length;
  const cisspCount = cardsFor(['cissp']);

  const fade = (delay = 0) => (reduce
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay } });

  return (
    <PageContainer wide>
      {/* ---------------- Hero ---------------- */}
      <section aria-labelledby="landing-hero-heading" className="relative pb-6 pt-6 md:pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
          <motion.div {...fade(0)}>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-caption font-semibold" style={{ borderColor: 'rgba(124,58,237,0.25)', color: ACCENT, background: 'rgba(124,58,237,0.06)' }}>
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: ACCENT }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: ACCENT }} />
              </span>
              Free to start · No account needed
            </span>

            <h1 id="landing-hero-heading" className="mt-5 font-bold text-ink-1" style={{ fontSize: 'clamp(2.25rem, 1.5rem + 3.4vw, 3.6rem)', lineHeight: 1.06, letterSpacing: '-0.02em' }}>
              From IT foundations to{' '}
              <span style={{ color: ACCENT }}>cybersecurity expert.</span>
            </h1>

            <p className="mt-5 max-w-reading text-body text-ink-2 md:text-lesson">
              Master networking, security, Python, cloud, and cybersecurity in one calm
              place — {fmt(cardCount)} flashcards, guided lessons, and hands-on labs that
              take you from your first subnet to the CISSP.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/academy/roadmap" size="lg" icon={Map} className="w-full justify-center sm:w-auto">Start learning</Button>
              <Button to="/tracks" size="lg" variant="secondary" className="w-full justify-center sm:w-auto">Explore tracks</Button>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
              {CLAIMS.map((c) => (
                <li key={c} className="inline-flex items-center gap-1.5 text-caption font-medium text-ink-2">
                  <CheckCircle2 size={14} style={{ color: ACCENT }} aria-hidden="true" /> {c}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div {...fade(0.12)}>
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      {/* ---------------- Live stats band ---------------- */}
      <Card level={2} padding="md" className="mt-10" aria-label="Platform stats">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
          <Stat label="flashcards" value={fmt(cardCount)} icon={BookOpen} />
          <Stat label="learning tracks" value={fmt(tracks.length)} icon={Map} />
          <Stat label="study decks" value={fmt(allDecks.length)} icon={Sparkles} />
          <Stat label="CISSP domains" value={fmt(CISSP_DOMAINS.length)} icon={Crown} />
        </dl>
      </Card>

      {/* ---------------- Pillars ---------------- */}
      <section aria-labelledby="pillars-heading" className="relative mt-16">
        <GlowLayer>
          <Glow className="h-72 w-[36rem] max-w-full" style={{ top: '3rem', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(closest-side, rgba(124,58,237,0.10), transparent)' }} />
        </GlowLayer>
        <SectionHeader
          id="pillars-heading"
          title="Choose your battlefield"
          description="Six pillars, nine tracks — start anywhere, switch anytime. Your place is saved as you go."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {PILLARS.map((pillar) => <PillarCard key={pillar.id} pillar={pillar} />)}
        </div>

        {/* CISSP Capstone: the destination */}
        <Card to="/academy/cissp" className="glass-hover group mt-4" style={{ borderColor: 'rgba(245,158,11,0.4)' }}>
          <div className="flex flex-wrap items-center gap-4">
            <IconTile icon={Crown} color="#F59E0B" size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold uppercase tracking-[0.18em] text-ink-2">The destination</p>
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

      {/* ---------------- How it works ---------------- */}
      <section aria-labelledby="how-heading" className="mt-16">
        <SectionHeader
          id="how-heading"
          title="How the platform works"
          description="A loop, not a syllabus: every track runs the same four moves."
        />
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Card level={1} padding="md" className="glass-hover h-full">
                <div className="flex items-center gap-3">
                  <IconTile icon={step.icon} color={step.color} />
                  <span className="text-caption font-semibold uppercase tracking-wider text-ink-2">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 text-heading text-ink-1">{step.title}</h3>
                <p className="mt-1 text-small text-ink-2">{step.desc}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- Roadmap teaser ---------------- */}
      <section aria-labelledby="roadmap-heading" className="mt-16">
        <Card to="/academy/roadmap" padding="lg" className="glass-hover group">
          <div className="flex flex-wrap items-center gap-5">
            <IconTile icon={Map} color="#0EA5E9" size="lg" />
            <div className="min-w-0 flex-1">
              <h2 id="roadmap-heading" className="text-heading text-ink-1">The Road to CISSP</h2>
              <p className="mt-1 max-w-reading text-small text-ink-2">
                {ROADMAP.length} steps from foundations to exam day, mapped to free and
                industry certifications along the way. Follow it in order or jump to
                whatever you need today.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-small font-semibold text-ink-2 transition group-hover:text-ink-1">
              View the roadmap <ArrowRight size={16} aria-hidden="true" />
            </span>
          </div>
        </Card>
      </section>

      {/* ---------------- Final CTA band ---------------- */}
      <section aria-label="Get started" className="relative mb-8 mt-16">
        <GlowLayer>
          <Glow className="h-72 w-[42rem] max-w-full" style={{ top: '-3rem', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(closest-side, rgba(124,58,237,0.18), transparent)' }} />
        </GlowLayer>
        <div className="glass-1 rounded-card px-6 py-10 text-center sm:px-8">
          <h2 className="mx-auto max-w-[22ch] text-title text-ink-1">
            Your security career starts with a single card.
          </h2>
          <p className="mx-auto mt-3 max-w-reading text-body text-ink-2">
            No sign-up, no setup. Pick a track and start your first lesson right now.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to="/academy/roadmap" size="lg" icon={Map} className="w-full justify-center sm:w-auto">Start learning</Button>
            <Button to="/tracks" size="lg" variant="secondary" className="w-full justify-center sm:w-auto">Explore tracks</Button>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
