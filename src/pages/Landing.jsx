import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { BookOpen, FlaskConical, Bot, Target, TerminalSquare, Award, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui-glass';
import { useAuth } from '@/lib/AuthContext';
import useDocumentTitle from '@/hooks/useDocumentTitle';

// Public front door: what Road to CISSP is, and a path to sign up / sign in.
// Signed-in visitors go straight to the app.
const FEATURES = [
  {
    icon: BookOpen,
    title: '800+ flashcards, mapped to objectives',
    text: 'Every card tied to a real cert objective — IT fundamentals through CISSP domains. Learn, quiz, and boss-fight your way up.',
  },
  {
    icon: FlaskConical,
    title: 'Hands-on labs, for real',
    text: 'Real terminals, real tools: Cisco IOS, Linux triage, Python automation, cloud sandboxes — some running in live containers, not simulations.',
  },
  {
    icon: Bot,
    title: 'An AI tutor that knows the material',
    text: 'Stuck on a concept? Get hints, explanations, and worked examples grounded in the actual lessons.',
  },
  {
    icon: Target,
    title: 'CISSP practice exams',
    text: 'Timed exam engine with the real domains, adaptive review, and weak-spot analysis before test day.',
  },
  {
    icon: TerminalSquare,
    title: 'Linux & Python tracks',
    text: 'Ten Linux decks and a full Python automation path — the hands-on skills certs assume you have.',
  },
  {
    icon: Award,
    title: 'Progress that sticks',
    text: 'Streaks, XP, badges, and Leitner-spaced review. Sign in and it syncs across your devices.',
  },
];

const STEPS = [
  { n: '1', title: 'Learn', text: 'Guided lessons and flashcards take you from zero to the cert objectives.' },
  { n: '2', title: 'Do', text: 'Prove it in hands-on labs — real commands, real output, real mistakes.' },
  { n: '3', title: 'Pass', text: 'Timed practice exams tell you exactly when you\u2019re ready for the real thing.' },
];

export default function Landing() {
  useDocumentTitle('Road to CISSP — From IT fundamentals to cloud expert');
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen text-ink-1">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="text-body font-bold tracking-tight">Road to CISSP</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" to="/labs">Labs</Button>
          <Button variant="secondary" size="sm" to="/signin">Sign in</Button>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="py-14 text-center sm:py-20">
          <p className="text-caption font-semibold uppercase tracking-[0.2em] text-ink-3">
            IT fundamentals → cloud expert
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-[clamp(2.25rem,2rem+3vw,3.75rem)] font-bold leading-[1.1] tracking-tight text-ink-1">
            Learn IT by doing it — all the way to CISSP.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-body text-ink-2">
            Flashcards mapped to real cert objectives, hands-on labs with actual
            terminals and tools, an AI tutor, and timed practice exams.
            Free to start, no credit card.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" to="/signin" icon={ArrowRight}>
              Start learning free
            </Button>
            <Button size="lg" variant="secondary" to="/labs" icon={FlaskConical}>
              Try a lab
            </Button>
          </div>
          <p className="mt-4 text-caption text-ink-3">
            Sign up with Google or GitHub — no password needed.
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Highlights">
          {[
            ['800+', 'flashcards'],
            ['20+', 'hands-on labs'],
            ['8', 'CISSP domains'],
            ['24/7', 'AI tutor'],
          ].map(([n, label]) => (
            <div key={label} className="glass-2 rounded-card px-4 py-5 text-center">
              <p className="text-heading font-bold text-ink-1">{n}</p>
              <p className="mt-1 text-caption text-ink-2">{label}</p>
            </div>
          ))}
        </section>

        {/* Features */}
        <section className="py-16 sm:py-20" aria-label="Features">
          <h2 className="text-center text-title font-bold text-ink-1">Everything you need, in one place</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-2 rounded-card p-5">
                <f.icon size={22} className="text-ink-2" aria-hidden="true" />
                <h3 className="mt-3 text-body font-semibold text-ink-1">{f.title}</h3>
                <p className="mt-1.5 text-small text-ink-2">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="pb-16 sm:pb-20" aria-label="How it works">
          <h2 className="text-center text-title font-bold text-ink-1">How it works</h2>
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-card border border-white/10 p-5 text-center">
                <p className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-heading font-bold text-ink-1">
                  {s.n}
                </p>
                <h3 className="mt-3 text-body font-semibold text-ink-1">{s.title}</h3>
                <p className="mt-1.5 text-small text-ink-2">{s.text}</p>
              </div>
            ))}
          </div>
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
              <Button size="lg" to="/signin" icon={ArrowRight}>Create free account</Button>
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

      <footer className="border-t border-white/10 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span className="text-caption text-ink-3">Road to CISSP — learn IT by doing it.</span>
          <div className="flex gap-4 text-caption text-ink-3">
            <Link to="/labs" className="hover:text-ink-1">Labs</Link>
            <Link to="/library" className="hover:text-ink-1">Library</Link>
            <Link to="/signin" className="hover:text-ink-1">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
