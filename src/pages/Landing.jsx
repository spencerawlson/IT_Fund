import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { BookOpen, FlaskConical, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui-glass';
import { useAuth } from '@/lib/AuthContext';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';
import SeatsPill from '@/components/SeatsPill';
import LandingBackground from '@/components/landing/LandingBackground';
import { fetchSeats } from '@/api/seats';
import { openConsentSettings } from '@/lib/consent';
import { COUNTS } from '@/data/counts';

// Public front door: what Road to CISSP is, and a path to sign up / sign in.
// Signed-in visitors go straight to the app.
const WHO_IT_IS_FOR = [
  {
    title: 'Starting out',
    text: 'New to IT? Start with the fundamentals and work toward your first cert.',
  },
  {
    title: 'Working in IT',
    text: 'Level up with hands-on labs in real terminals — the skills certs assume you have.',
  },
  {
    title: 'Switching careers',
    text: 'A clear path into tech: guided lessons, real practice, and timed exam sims.',
  },
];

// The certification road, in the order learners actually take it. Depth badges
// are honest: "Exam sim" only where a timed simulator ships, otherwise the
// track's real contents (lessons + labs + cards).
const CERT_ROAD = [
  {
    code: 'SY0-701', name: 'Security+', tag: 'Start here',
    detail: `Our flagship: ${COUNTS.tracks.cyber.cardsPlus} flashcards, ${COUNTS.tracks.cyber.decks} lessons, hands-on labs.`,
    exam: true,
  },
  {
    code: 'N10-009', name: 'Network+', tag: null,
    detail: 'Networking lessons, subnetting practice, and routing labs.',
    exam: false,
  },
  {
    code: 'Linux+', name: 'Linux+', tag: null,
    detail: 'Linux lessons and terminal labs — the skills certs assume you have.',
    exam: false,
  },
  {
    code: 'CS0-003', name: 'CySA+', tag: null,
    detail: '160 flashcards, 8 lessons, blue-team labs.',
    exam: true,
  },
  {
    code: 'SAA-C03', name: 'AWS Solutions Architect', tag: null,
    detail: '198 flashcards, 11 lessons, architecture scenarios.',
    exam: true,
  },
  {
    code: 'SCS-C02', name: 'AWS Security Specialty', tag: null,
    detail: '161 flashcards, 10 lessons, cloud security labs.',
    exam: true,
  },
  {
    code: 'CISSP', name: 'CISSP', tag: 'The capstone',
    detail: 'All 8 domains, timed exam engine, 19 deep-dive lessons.',
    exam: true,
  },
];

// The five official social profiles. Single source of truth for the footer
// links below and the Organization sameAs in HOME_JSON_LD — one list, no drift.
const SOCIAL_LINKS = [
  { label: 'YouTube', href: 'https://www.youtube.com/@road2cissp' },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61596190452892' },
  { label: 'X', href: 'https://x.com/road2cissp' },
  { label: 'Instagram', href: 'https://www.instagram.com/road2cissp/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/road2cissp' },
];

// Homepage JSON-LD: WebSite + Organization (sameAs = the five social
// profiles). The prerender script splits @graph nodes into
// separate ld+json blocks in the static HTML (same pattern as Pricing).
const HOME_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.road2cissp.com/#website',
      url: 'https://www.road2cissp.com/',
      name: 'Road to CISSP',
      description: 'Go from IT fundamentals to the CISSP: objective-mapped flashcards, hands-on labs in real terminals, and timed exam simulators. Start free.',
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.road2cissp.com/#organization',
      name: 'Road to CISSP',
      url: 'https://www.road2cissp.com/',
      sameAs: SOCIAL_LINKS.map((s) => s.href),
    },
  ],
};

export default function Landing() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  // Live seats counter (public /public/seats): total accounts vs the 10,000
  // seat cap. null = not loaded (or the fetch failed) — the hero pill
  // renders nothing rather than a wrong number. When the cap is reached,
  // sign-ups are closed: the signup CTAs are disabled and the hero says so
  // plainly. Returning users can still sign in, and labs still work without
  // an account. The fetched value is passed to the hero pill so the page
  // makes only one seats request.
  const [seats, setSeats] = useState(null);
  useEffect(() => {
    let live = true;
    fetchSeats().then((s) => { if (live) setSeats(s); });
    return () => { live = false; };
  }, []);
  const seatsFull = seats !== null && seats.totalAccounts >= seats.cap;
  const fmt = (n) => n.toLocaleString('en-CA');

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden text-ink-1">
      <LandingBackground />
      <Seo
        title="Road to CISSP — Networking, Security & Cloud Training"
        description={`Go from IT fundamentals to the CISSP: ${COUNTS.totalCardsPlus} objective-mapped flashcards, hands-on labs in real terminals, and timed exam simulators. Start free.`}
        path="/"
        jsonLd={HOME_JSON_LD}
      />
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <span className="whitespace-nowrap text-body font-bold tracking-tight">Road to CISSP</span>
        {/* Phones get one primary "Sign in" (both buttons open /signin); wider screens show both. */}
        <div className="flex items-center gap-1 whitespace-nowrap sm:gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" to="/signin" className={seatsFull ? 'inline-flex' : 'hidden sm:inline-flex'}>Sign in</Button>
          {!seatsFull && (
            <Button variant="secondary" size="sm" to="/signin?signup=1">Create free account</Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="py-14 text-center sm:py-20">
          <h1 className="mx-auto max-w-3xl text-[clamp(2.25rem,2rem+3vw,3.75rem)] font-bold leading-[1.1] tracking-tight text-ink-1">
            Learn IT by doing it — all the way to CISSP.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-body text-ink-2">
            Flashcards mapped to real cert objectives, hands-on labs in real
            terminals, and timed practice exams. Free to start.
          </p>
          {/* Live seats pill — directly above the CTAs, the counter's one
              home on the page. Renders nothing until the fetch resolves. */}
          <div className="mt-8 flex justify-center">
            <SeatsPill seats={seats} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" to="/signin" icon={ArrowRight} disabled={seatsFull}>
              Start learning free
            </Button>
            <Button size="lg" variant="secondary" to="/labs" icon={FlaskConical}>
              Try a lab
            </Button>
          </div>
          {/* At the cap the pill above reads "10,000 of 10,000" and this
              note explains sign-ups are closed. */}
          {seatsFull && (
            <p className="mt-2 text-center text-small font-semibold text-ink-1" role="status">
              All {fmt(seats.cap)} seats are taken — sign-ups are closed.
            </p>
          )}
        </section>

        {/* Proof: one quiet line, not a grid */}
        <p className="pb-4 text-center text-small text-ink-3">
          {COUNTS.totalCardsPlus} flashcards · {COUNTS.labs} hands-on labs · 8 CISSP domains · 5 timed exam simulators
        </p>

        {/* Who it's for */}
        <section className="py-16 sm:py-20" aria-label="Who it's for">
          <h2 className="text-center text-title font-bold text-ink-1">Who it&apos;s for</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {WHO_IT_IS_FOR.map((a) => (
              <div key={a.title} className="glass-2 rounded-card p-5">
                <h3 className="text-body font-semibold text-ink-1">{a.title}</h3>
                <p className="mt-1.5 text-small text-ink-2">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Certification road */}
        <section className="pb-16 sm:pb-20" aria-label="Certifications">
          <p className="text-center text-caption font-semibold uppercase tracking-[0.2em] text-ink-3">
            The road
          </p>
          <h2 className="mt-2 text-center text-title font-bold text-ink-1">
            Every cert on the way to CISSP
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-body text-ink-2">
            One subscription covers the whole journey — from your first
            certification to the capstone.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CERT_ROAD.map((c) => (
              <li key={c.code} className="glass-2 rounded-card relative p-5">
                {c.tag && (
                  <span className="absolute right-4 top-4 text-caption font-semibold uppercase tracking-wider text-action">
                    {c.tag}
                  </span>
                )}
                <p className="font-mono text-caption text-ink-3">{c.code}</p>
                <h3 className="mt-1 text-body font-semibold text-ink-1">{c.name}</h3>
                <p className="mt-1.5 text-small text-ink-2">{c.detail}</p>
                <p className="mt-3 flex items-center gap-1.5 text-caption text-ink-2">
                  {c.exam ? (
                    <>
                      <Check size={14} className="shrink-0 text-success" aria-hidden="true" /> Timed exam simulator
                    </>
                  ) : (
                    <>
                      <BookOpen size={14} className="shrink-0 text-ink-3" aria-hidden="true" /> Lessons, labs &amp; flashcards
                    </>
                  )}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-center text-small text-ink-3">
            Plus skills tracks: Python, Docker, Kubernetes, Terraform, SQL, and more.
          </p>
        </section>

        {/* Final CTA */}
        <section className="pb-20 text-center" aria-label="Get started">
          <div className="glass-1 rounded-card px-6 py-12">
            <h2 className="text-title font-bold text-ink-1">Your first cert is closer than you think.</h2>
            <p className="mx-auto mt-3 max-w-xl text-body text-ink-2">
              Join with Google or GitHub in one click. Your progress syncs
              across devices from day one.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {/* R-11: the hero's "Start learning free" is the page's one
                  primary CTA; this closing action is secondary. Disabled
                  when seats are full — sign-ups are closed. */}
              <Button size="lg" variant="secondary" to="/signin" icon={ArrowRight} disabled={seatsFull}>Create free account</Button>
              <Button size="lg" variant="ghost" to="/signin">Sign in</Button>
            </div>
            <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-small text-ink-2">
              {['Free to start — no credit card', 'No password — Google or GitHub sign-in', 'Works without an account too'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check size={16} className="shrink-0 text-success" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span className="text-caption text-ink-3">Road to CISSP — learn IT by doing it.</span>
          <div className="flex gap-4 text-caption text-ink-3">
            <Link to="/labs" className="hover:text-ink-1">Labs</Link>
            <Link to="/library" className="hover:text-ink-1">Library</Link>
            <Link to="/faq" className="hover:text-ink-1">FAQ</Link>
            <Link to="/pricing" className="hover:text-ink-1">Pricing</Link>
            <Link to="/privacy" className="hover:text-ink-1">Privacy</Link>
            <Link to="/terms" className="hover:text-ink-1">Terms</Link>
            <button type="button" onClick={openConsentSettings} className="hover:text-ink-1">Cookie settings</button>
            <Link to="/contact" className="hover:text-ink-1">Contact</Link>
            <Link to="/signin" className="hover:text-ink-1">Sign in</Link>
          </div>
        </div>
        <div className="mx-auto mt-4 flex max-w-6xl flex-wrap items-center gap-4 px-4 sm:px-6">
          <span className="text-caption text-ink-3">Follow us:</span>
          <div className="flex flex-wrap gap-4 text-caption text-ink-3">
            {SOCIAL_LINKS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={`Road to CISSP on ${s.label}`} className="hover:text-ink-1">{s.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
