import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui-glass';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';

// Contact: email only, by design. There is no contact form — a form that
// submits nowhere is worse than a mailto link. The address below is the
// support channel; delivery (support@ -> the owner's inbox) is a DNS/host
// step, not something this repo configures.
export const SUPPORT_EMAIL = 'support@road2cissp.com';

export default function Contact() {
  return (
    <div className="min-h-screen text-ink-1">
      <Seo
        title="Contact · Road to CISSP"
        description="Email support@road2cissp.com — questions about your subscription, a lesson, a lab, or a refund."
        path="/contact"
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
          Contact
        </h1>
        <p className="mt-4 text-body text-ink-2">
          Questions about your subscription, a lesson, a lab, or a refund? Email us — there is no
          contact form; email is the way to reach a human.
        </p>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Email support</h2>
          <p className="mt-2 text-body text-ink-2">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-4 hover:text-ink-1">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p className="mt-4 text-body text-ink-2">
            To help us find your account, include the email address you signed up with and a short
            description of what happened or what you need. For a refund, include the date you
            subscribed — the refund policy is on the Terms page.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading font-semibold text-ink-1">Before you write</h2>
          <p className="mt-2 text-body text-ink-2">
            Common questions are answered on the{' '}
            <Link to="/pricing" className="underline decoration-black/30 underline-offset-4 hover:text-ink-1">pricing page</Link>
            {' '}— cancelling, what the free tier includes, and refunds. Billing itself is handled
            by Stripe: card changes and cancellations are self-serve from your account page, in
            the Stripe Customer Portal.
          </p>
        </section>
      </main>

      <footer className="border-t border-black/10 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span className="text-caption text-ink-3">Road to CISSP — learn IT by doing it.</span>
          <div className="flex gap-4 text-caption text-ink-3">
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
