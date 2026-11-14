import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui-glass';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';

// Terms of service, drawn only from what the codebase does. No invented
// contact channels, no promises the code does not keep.
export default function Terms() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen text-ink-1">
      <Seo
        title="Terms of Service · Road to CISSP"
        description="The terms for using Road to CISSP: one $19/month plan, cancel anytime, free tier limits, and what the practice exams do and do not promise."
        path="/terms"
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
          Terms of Service
        </h1>
        <p className="mt-4 text-body text-ink-2">
          Last updated 11 November 2026. By using Road to CISSP you agree to these terms. They describe the subscription, the free tier, and the limits of what this site promises.
        </p>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">The plan and the price</h2>
          <p className="mt-2 text-body text-ink-2">
            There is one plan: $19 per month. It unlocks every track, every lesson, every hands-on lab, and every exam simulator, and it syncs your progress across devices. Payment is taken through Stripe Checkout.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Cancelling</h2>
          <p className="mt-2 text-body text-ink-2">
            You can cancel anytime from the Stripe Customer Portal, reached from your account on the sign-in page. You keep full access until the end of the billing period you have paid for. Your progress — streaks, XP, badges, and history — is not deleted when you cancel: you drop back to the free tier until you resubscribe.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Refunds and failed payments</h2>
          <p className="mt-2 text-body text-ink-2">
            If this is your first subscription and you ask within 14 days of subscribing, you get
            your money back — email{' '}
            <a href="mailto:support@road2cissp.com" className="underline decoration-black/30 underline-offset-4 hover:text-ink-1">support@road2cissp.com</a>
            {' '}with the date you subscribed. After that, refunds are decided case by case: email
            us and we will look at it. When a subscription is refunded in full, access ends and
            the subscription is cancelled, so you are not charged again.
          </p>
          <p className="mt-2 text-body text-ink-2">
            If a renewal payment fails, your subscription goes past due and you keep full access
            for 7 days while you fix the payment — update your card in the Stripe Customer Portal,
            reached from your account on the sign-in page. After 7 days without a successful
            payment, access is revoked until you resubscribe.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">The free tier</h2>
          <p className="mt-2 text-body text-ink-2">
            The free tier needs no account and no payment: 5 sample lessons, 57 flashcards across 5 decks, and 2 hands-on labs, plus all marketing pages. Everything beyond that needs the subscription.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">How you may use the content</h2>
          <p className="mt-2 text-body text-ink-2">
            The lessons, flashcards, labs, and practice exams are for your personal study. Do not resell, republish, or redistribute them, and do not use automated scraping to copy the curriculum.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">What practice scores mean</h2>
          <p className="mt-2 text-body text-ink-2">
            Practice exam scores are a knowledge check, not a prediction. The simulators are fixed-length, multiple-choice practice with their own pass marks; the real CISSP is computer-adaptive and passes at a 700/1000 scaled score, and CompTIA and AWS exams use their own scaled scores. A passing practice score does not guarantee a pass on the real exam.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Not affiliated with the cert vendors</h2>
          <p className="mt-2 text-body text-ink-2">
            Road to CISSP is not affiliated with, endorsed by, or sponsored by ISC2 or CompTIA. ISC2, CISSP, CompTIA, and Security+ are trademarks of their respective owners. Our courses prepare you for their exams; they do not speak for them.
          </p>
        </section>

        <p className="mt-10 text-small text-ink-3">
          If these terms change, the &ldquo;last updated&rdquo; date above changes with them.
        </p>
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
