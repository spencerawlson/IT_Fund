import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button, Card } from '@/components/ui-glass';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';
import FaqSection, { faqJsonLd } from '@/components/FaqSection';
import { COUNTS } from '@/data/counts';

const PAGE_TITLE = 'How long does CISSP preparation take? · Road to CISSP';
const PAGE_DESCRIPTION =
  'Most people working full time need three to six months of steady study. What moves the timeline, a realistic weekly plan, and how to know you are ready.';

const FAQS = [
  {
    q: 'Can I pass the CISSP in one month?',
    a: 'Almost certainly not, unless you already work in security leadership and only need to refresh the domains. The exam covers eight broad domains and tests judgment, not recall. Cramming the breadth in four weeks leaves no time for the timed practice that turns knowledge into exam-day decisions.',
  },
  {
    q: 'Do I need the five years of experience before I take the exam?',
    a: 'No. You can sit the exam without the experience — if you pass, you become an Associate of ISC2 and have six years to earn the five years of experience needed for full certification. Full CISSP certification needs five years of cumulative paid work in two or more of the eight domains; a degree or an approved credential waives one year.',
  },
  {
    q: 'When should I book the exam?',
    a: 'Book it when your practice says you are ready, not when your calendar says you hope to be. A good rule: book once your timed simulator scores are consistently passing and no domain is lagging far behind the rest. A date on the calendar is a powerful motivator — but only after the scores support it.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'How long does CISSP preparation take?',
      description: PAGE_DESCRIPTION,
      author: { '@type': 'Organization', name: 'Road to CISSP', url: 'https://www.road2cissp.com' },
    },
    faqJsonLd(FAQS),
  ],
};

export default function HowLongCisspTakes() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen text-ink-1">
      <Seo
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        path="/guides/how-long-does-cissp-take"
        jsonLd={jsonLd}
      />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="text-body font-bold tracking-tight">Road to CISSP</Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" to="/labs">Labs</Button>
          <Button variant="secondary" size="sm" to="/signin">Sign in</Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h1 className="text-[clamp(2rem,1.75rem+2vw,3rem)] font-bold leading-[1.1] tracking-tight text-ink-1">
          How long does CISSP preparation take?
        </h1>
        <p className="mt-4 text-body text-ink-2">
          For most people working full time, three to six months of steady study. That is the range ISC2 itself gives for candidates who already have the five years of experience. If you are starting from IT fundamentals, plan on six to twelve months instead.
        </p>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">What moves the timeline</h2>
          <p className="mt-2 text-body text-ink-2">
            Three things decide where you land in that range. First, experience: a security practitioner with five years across several domains is mostly organising and filling gaps, while a newcomer is learning the fundamentals and the CISSP view at the same time. Second, hours per week: an hour a day, five days a week, compounds far faster than a heroic weekend every fortnight — spaced, regular study is what the flashcards and the Leitner review on this site are built for. Third, consistency: a missed week costs more than a missed day, because the material is broad and forgetting is fastest in the first days after you learn something. The honest answer to “how long” is therefore a range with a condition attached, not a single number — and anyone selling you a single number is selling you something else.
          </p>
        </section>

        <Card level={2} padding="md" className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">The exam itself</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-ink-1 marker:text-ink-3">
            <li>Computerised adaptive test (CAT): 100–150 items, 3 hours, and a scaled score of 700 out of 1,000 to pass.</li>
            <li>Eight domains, from security and risk management through to software development security.</li>
            <li>Full certification needs five years of cumulative paid work in two or more of the eight domains. A degree or an approved credential waives one year.</li>
            <li>Pass without the experience and you become an Associate of ISC2, with six years to earn it.</li>
            <li>The exam fee is separate from any course: ISC2 lists U.S. $749 for standard registration in the Americas, with pricing varying by region — check the current figure on{' '}
              <a href="https://www.isc2.org/register-for-exam/isc2-exam-pricing" target="_blank" rel="noreferrer" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">ISC2’s exam pricing page</a>.
            </li>
            <li>Note the horizon: from 15 April 2027 the exam will be based on a new exam outline, so check the current outline on isc2.org before you start.</li>
          </ul>
        </Card>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">A realistic plan while working full time</h2>
          <p className="mt-2 text-body text-ink-2">
            Road to CISSP is built as {COUNTS.totalDecks} lessons, {COUNTS.labs} hands-on labs, {COUNTS.totalCardsPlus} flashcards, timed exam simulators, and three missions — Glasshouse, Broken Shield, and Packet Flood. A plan that fits a full-time job uses all five, in phases:
          </p>
          <ul className="mt-2 max-w-reading list-disc space-y-2 pl-5 text-body text-ink-1 marker:text-ink-3">
            <li><strong>Months 1–2 — foundations.</strong> Work through the{' '}
              <Link to="/academy/roadmap" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">roadmap</Link>
              {' '}from networking and security fundamentals upward. One lesson a day, flashcards every day — short sessions beat long ones at this stage.</li>
            <li><strong>Months 3–4 — the domains, with doing.</strong> One domain at a time, each paired with its labs: configure, triage, script, and audit in a real terminal, so the concept becomes a decision you have actually made. One lab a week is a sustainable pace.</li>
            <li><strong>Months 5–6 — prove it.</strong> Timed{' '}
              <Link to="/academy/exam" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">practice exams</Link>
              {' '}under exam conditions, the missions for multi-step incident work, and flashcards targeted at whatever the simulator says is weak. Study time shifts from learning new material to closing gaps.</li>
          </ul>
          <p className="mt-2 text-body text-ink-2">
            The weekly rhythm that holds up: five short sessions of 45–60 minutes on weekdays, one longer session at the weekend for a lab or a full practice exam, and flashcards daily — even on days you do nothing else. If a week goes wrong, shrink the sessions rather than skipping them; a 20-minute flashcard review keeps the thread alive where a skipped week breaks it. The{' '}
            <Link to="/labs" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">labs page</Link>
            {' '}shows what the hands-on work looks like, and the{' '}
            <Link to="/pricing" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">pricing page</Link>
            {' '}covers what is free and what needs Pro.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">How to know you are ready</h2>
          <p className="mt-2 text-body text-ink-2">
            Readiness is a measurement, not a feeling. Three signals together mean you are close: your timed simulator scores are consistently passing rather than passing once; no single domain is lagging far behind the rest — the roadmap tracks mastery per domain, and aiming for around 80% in every domain is a sound bar; and you can explain why the wrong answers are wrong, not just pick the right one. If you can teach a domain back in your own words, you own it. If you only recognise the right answer when you see it, you do not — yet. The{' '}
            <Link to="/faq" className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">FAQ</Link>
            {' '}covers how the simulators and domain tracking work.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">If you fail</h2>
          <p className="mt-2 text-body text-ink-2">
            Failing the CISSP is common — many certified professionals did not pass on the first attempt — and it is not a verdict on your ability. ISC2’s retake policy sets a waiting period after each attempt: 30 test-free days after the first attempt, 60 days after the second, and 90 days after the third and any later attempt, with a maximum of four attempts in a 12-month period. Use the wait well: the test centre gives you a proficiency breakdown by domain, so your next round of study has a map instead of a guess. ISC2’s own instructors recommend getting back into preparation within three months of the attempt, while the material is still fresh — wait longer than six months and you will be relearning more than reviewing. Fix the weakest domains first, retake the simulators, and book again when the scores — not the calendar — say you are ready.
          </p>
        </section>

        <FaqSection faqs={FAQS} id="how-long-faq" />
      </main>

      <footer className="border-t border-black/10 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span className="text-caption text-ink-3">Road to CISSP — learn IT by doing it.</span>
          <div className="flex gap-4 text-caption text-ink-3">
            <Link to="/faq" className="hover:text-ink-1">FAQ</Link>
            {isAuthenticated ? (
              <Link to="/signin" className="hover:text-ink-1">Account</Link>
            ) : (
              <Link to="/pricing" className="hover:text-ink-1">Pricing</Link>
            )}
            <Link to="/privacy" className="hover:text-ink-1">Privacy</Link>
            <Link to="/terms" className="hover:text-ink-1">Terms</Link>
            <Link to="/contact" className="hover:text-ink-1">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
