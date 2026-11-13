import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui-glass';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';

// Privacy policy, drawn only from what the codebase does. No invented
// contact channels, no promises the code does not keep. If the product
// starts collecting something new, this page must be updated with it.
export default function Privacy() {
  return (
    <div className="min-h-screen text-ink-1">
      <Seo
        title="Privacy Policy · Road to CISSP"
        description="What Road to CISSP collects when you sign in, study, or subscribe — and what it does not collect, sell, or store."
        path="/privacy"
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
          Privacy Policy
        </h1>
        <p className="mt-4 text-body text-ink-2">
          Last updated 11 November 2026. This page describes what Road to CISSP collects, what it stores, and what it does not do with your data.
        </p>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Signing in</h2>
          <p className="mt-2 text-body text-ink-2">
            You sign in with Google or GitHub — the site has no passwords of its own. Your sign-in provider shares your email address, your name, and your profile picture with us, and we store those three things on your account so we can show who is signed in. Your session is kept in a HttpOnly session cookie, which your browser does not expose to page scripts.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">What we store about your study</h2>
          <p className="mt-2 text-body text-ink-2">
            When you are signed in, we store your learning progress on our servers: lesson and flashcard progress, streaks, XP and badges, exam attempts, and lab completions. If you use the AI tutor, we keep a log of your tutor calls so we can keep the feature working and within its limits. If you study without an account, your progress is kept only in your own browser and is never sent to us.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Payments</h2>
          <p className="mt-2 text-body text-ink-2">
            Subscriptions are $19 per month and are paid through Stripe Checkout. Your card details go to Stripe, not to us — they never touch this site. We store only your subscription status and the end of your current billing period, so we know whether your access is active.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Analytics</h2>
          <p className="mt-2 text-body text-ink-2">
            We measure visits with Plausible Analytics, a privacy-friendly analytics tool that does not use cookies and does not track you across sites. We do not run advertising trackers on this site.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">What we do not do</h2>
          <p className="mt-2 text-body text-ink-2">
            We do not sell your personal data to anyone, and we do not share it with third parties except the providers above (Google or GitHub for sign-in, Stripe for payments, Plausible for analytics), each of which receives only what it needs to do its job.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Deleting your account</h2>
          <p className="mt-2 text-body text-ink-2">
            There is currently no self-serve way to delete your account from inside the app. That is a gap we know about: until a self-serve option exists, this page will say so plainly rather than pretend otherwise.
          </p>
        </section>

        <p className="mt-10 text-small text-ink-3">
          If this policy changes, the &ldquo;last updated&rdquo; date above changes with it.
        </p>
      </main>

      <footer className="border-t border-black/10 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span className="text-caption text-ink-3">Road to CISSP — learn IT by doing it.</span>
          <div className="flex gap-4 text-caption text-ink-3">
            <Link to="/faq" className="hover:text-ink-1">FAQ</Link>
            <Link to="/pricing" className="hover:text-ink-1">Pricing</Link>
            <Link to="/privacy" className="hover:text-ink-1">Privacy</Link>
            <Link to="/terms" className="hover:text-ink-1">Terms</Link>
            <Link to="/contact" className="hover:text-ink-1">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
