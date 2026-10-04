import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Timer } from 'lucide-react';
import { Button, Card, ListLink, PageContainer, PageHeader, ProgressBar, SectionHeader } from '@/components/ui-glass';
import { tracks, ROADMAP, CISSP_DOMAINS, decksForDomain, RESOURCES } from '@/data/academy';
import { COURSES, courseHref } from '@/data/catalog';
import { useAcademy, mastery, grantBadge } from '@/lib/academy';
import { cn } from '@/lib/utils';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const READY_PCT = 80;

/** Half from the CISSP capstone deck for the domain, half from every other deck that feeds it. */
function domainReadiness(state, domainId) {
  const decks = decksForDomain(domainId);
  const capstone = decks.filter((d) => d.trackId === 'cissp' && d.id === `cissp-d${domainId}`);
  const support = decks.filter((d) => !capstone.includes(d));
  const cap = mastery(state, capstone.flatMap((d) => d.cards));
  const sup = mastery(state, support.flatMap((d) => d.cards));
  return { pct: Math.round(cap * 0.5 + sup * 0.5), decks: support, capstone: capstone[0] };
}

const tierCards = (trackId, tierId) =>
  tracks.find((t) => t.id === trackId).tiers.find((t) => t.id === tierId).decks.flatMap((d) => d.cards);

function StepMarker({ n, done, current }) {
  return (
    <span
      className={cn(
        'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-small font-semibold',
        done ? 'border-success/40 bg-[#0b1f1a] text-success' : current ? 'border-action bg-[#1f1706] text-action' : 'border-white/15 bg-[var(--bg-base)] text-ink-2',
      )}
    >
      {done ? <Check size={16} aria-hidden="true" /> : n}
    </span>
  );
}

export default function CisspRoadmap() {
  useDocumentTitle('CISSP Roadmap · Road to CISSP');
  const state = useAcademy();
  const domains = CISSP_DOMAINS.map((d) => ({ ...d, ...domainReadiness(state, d.id) }));
  const weighted = Math.round(domains.reduce((s, d) => s + d.pct * d.weight, 0) / 100);
  const allReady = domains.every((d) => d.pct >= READY_PCT);
  const steps = ROADMAP.map((step) => ({ ...step, pct: mastery(state, step.tiers.flatMap(([t, tier]) => tierCards(t, tier))) }));
  const currentStep = steps.find((s) => s.pct < READY_PCT)?.step;

  useEffect(() => {
    if (allReady) grantBadge('cissp-ready');
  }, [allReady]);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Road to CISSP' }]}
        title="Road to CISSP"
        description="Seven steps that follow the path most successful candidates take: technical foundations, the CompTIA core, hands-on defence, cloud and AI, then the managerial view the CISSP tests. Every lesson is tagged with the domains it builds toward, so early study counts."
      />

      <section aria-labelledby="exam-heading" className="mb-12">
        <Card level={2} padding="md" className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 id="exam-heading" className="text-heading text-ink-1">Practice exam</h2>
            <p className="mt-1 text-small text-ink-2">100 questions, 3 hours, weighted by the official domain weights. 70% to pass.</p>
          </div>
          <Button to="/academy/exam" icon={Timer} className="shrink-0">Start practice exam</Button>
        </Card>
      </section>

      <section aria-labelledby="steps-heading">
        <SectionHeader id="steps-heading" title="The seven steps" description={`A step counts as done at ${READY_PCT}% mastery of its lessons.`} />
        <ol className="relative space-y-4">
          <span aria-hidden="true" className="absolute bottom-4 left-[17px] top-4 w-px bg-white/10" />
          {steps.map((step) => (
            <li key={step.step} className="flex gap-4">
              <StepMarker n={step.step} done={step.pct >= READY_PCT} current={step.step === currentStep} />
              <Card level={2} padding="md" className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-heading text-ink-1">{step.title}</h3>
                    <p className="mt-1 text-small text-ink-2">{step.desc}</p>
                  </div>
                  {step.step === currentStep && <span className="shrink-0 text-caption font-semibold uppercase tracking-wider text-action">Current</span>}
                </div>
                <ProgressBar className="mt-4" value={step.pct} label={`Step ${step.step} mastery`} />
                <p className="mt-3 text-small text-ink-2">
                  Milestone: <span className="text-ink-1">{step.milestone}</span> · about {step.months} months
                </p>
                <p className="mt-2 text-small text-ink-2">
                  Covers{' '}
                  {step.tiers.map(([t, tier], i) => {
                    const track = tracks.find((x) => x.id === t);
                    const label = track.tiers.find((x) => x.id === tier).label;
                    return (
                      <React.Fragment key={`${t}-${tier}`}>
                        {i > 0 && ', '}
                        <Link to={courseHref(COURSES.find((c) => c.trackId === t))} className="text-ink-1 underline decoration-white/20 underline-offset-4 hover:decoration-white/60">
                          {track.title} {label}
                        </Link>
                      </React.Fragment>
                    );
                  })}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="domains-heading" className="mt-14">
        <SectionHeader
          id="domains-heading"
          title="CISSP domain readiness"
          description={`Half from each domain’s capstone lesson, half from every earlier lesson tagged with it. Reach ${READY_PCT}% in all eight to be exam-ready.`}
          action={
            <div className="text-right">
              <p className="text-title tabular-nums text-ink-1">{weighted}%</p>
              <p className="text-caption text-ink-2">exam-weighted</p>
            </div>
          }
        />
        <Card level={2} padding="sm">
          <ul className="divide-y divide-white/[0.06]">
            {domains.map((d) => (
              <li key={d.id} className="px-3 py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="min-w-0 text-body font-semibold text-ink-1">
                    <span className="tabular-nums text-ink-2">{d.id}.</span> {d.title}
                  </p>
                  <p className="shrink-0 text-small text-ink-2">{d.weight}% of exam</p>
                </div>
                <ProgressBar className="mt-2" value={d.pct} label={`Domain ${d.id} readiness`} />
                <details className="group mt-2">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-small font-semibold text-ink-2 hover:text-ink-1">
                    What counts toward this <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <ul className="mt-2 space-y-1 text-small">
                    {d.capstone && (
                      <li>
                        <Link to={`/academy/cissp/deck/${d.capstone.id}?mode=learn`} className="font-semibold text-ink-1 underline decoration-white/20 underline-offset-4 hover:decoration-white/60">
                          Capstone: {d.capstone.title}
                        </Link>
                      </li>
                    )}
                    {d.decks.map((deck) => (
                      <li key={deck.id}>
                        <Link to={`/academy/${deck.trackId}/deck/${deck.id}?mode=learn`} className="text-ink-2 hover:text-ink-1">
                          {deck.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section aria-labelledby="facts-heading" className="mt-14">
        <SectionHeader id="facts-heading" title="Exam facts" description="ISC2 outline effective 15 April 2024." />
        <Card level={2} padding="lg">
          <ul className="max-w-reading list-disc space-y-2 pl-5 text-body text-ink-1 marker:text-ink-3">
            <li>The English exam is adaptive (CAT): 100–150 items, 3 hours, 700/1000 to pass.</li>
            <li>Full certification needs 5 years of paid work in 2 or more of the 8 domains. A degree or approved cert waives 1 year.</li>
            <li>Pass without the experience and you become an Associate of ISC2, with 6 years to earn it.</li>
            <li>Start with ISC2 Certified in Cybersecurity (CC): its official training and first exam attempt are free.</li>
          </ul>
          <ul className="-mx-3 mt-5 divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {['cissp-outline', 'isc2-cc', 'isc2-ethics'].map((id) => (
              <li key={id}><ListLink href={RESOURCES[id].url} title={RESOURCES[id].title} /></li>
            ))}
          </ul>
        </Card>
      </section>
    </PageContainer>
  );
}
