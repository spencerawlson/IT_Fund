import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FlaskConical, Target, RefreshCw, Check, X, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/ui-glass';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { getAttributionTag } from '@/lib/attribution';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const FEATURES = [
  { icon: BookOpen, title: 'Every track, every lesson', text: 'Networking, Security+, Linux, Python, Cloud, and the CISSP capstone — all flashcards, lessons, and cheat sheets.' },
  { icon: FlaskConical, title: 'All 23+ hands-on labs', text: 'Real terminals: Cisco IOS, Linux triage, Python automation, cloud sandboxes. The free tier gets two; members get them all.' },
  { icon: Target, title: 'Exam simulators', text: 'Timed Security+ and CISSP practice exams with domain-weighted scoring and per-domain breakdowns.' },
  { icon: RefreshCw, title: 'Progress that syncs', text: 'Streaks, XP, badges, and Leitner review saved to your account across every device.' },
];

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel in one click from your account page — no emails, no phone calls, no retention gauntlet. You keep full access until the end of your billing period.',
  },
  {
    q: 'What happens to my progress if I cancel?',
    a: 'Nothing is deleted. Your streaks, XP, badges, and history stay on your account. You drop back to the free tier until you resubscribe.',
  },
  {
    q: 'What if I want a refund?',
    a: 'If this is your first subscription and you ask within 14 days of subscribing, you get your money back — email support@road2cissp.com with the date you subscribed. After that, refunds are decided case by case. A subscription refunded in full loses access and is cancelled, so you are not charged again.',
  },
  {
    q: 'What happens if my payment fails?',
    a: 'Your subscription goes past due and you keep full access for 7 days while you fix the payment — update your card in the Stripe Customer Portal, reached from your account page. After 7 days without a successful payment, access is revoked until you resubscribe.',
  },
  {
    q: 'What exactly is free?',
    a: 'Five sample lessons, 57 flashcards, two hands-on labs, and all marketing pages — no account or payment needed. Everything beyond that needs the subscription.',
  },
  {
    q: 'Is this enough to pass Security+ or CISSP?',
    a: 'That is the goal we build toward: flashcards mapped to official objectives, scenario-based practice, hands-on labs, and timed exam sims. We recommend pairing it with the official exam objectives checklist as you study.',
  },
];

// FAQ rich-result structured data, generated from the FAQS shown on the page.
const FAQ_ENTITIES = FAQS.map((f) => ({
  '@type': 'Question',
  name: f.q,
  acceptedAnswer: { '@type': 'Answer', text: f.a },
}));

// Fallback matches billing.PRICE_FALLBACK; replaced by the live Stripe price.
const PRICE_FALLBACK = { display: '$19', interval: 'month', amount: '19.00', currency: 'USD' };
const INTERVAL_LABEL = { month: 'month', year: 'year', week: 'week', day: 'day' };
const INTERVAL_SHORT = { month: 'mo', year: 'yr', week: 'wk', day: 'day' };

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const { subscribed } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Single source of truth: the live Stripe price, so the page, the structured
  // data, and the actual charge never drift. Falls back if billing is unconfigured.
  const [price, setPrice] = useState(PRICE_FALLBACK);

  useEffect(() => {
    let live = true;
    fetch(`${API_BASE}/billing/price`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!live || !p) return;
        setPrice({
          display: p.display || PRICE_FALLBACK.display,
          interval: p.interval || PRICE_FALLBACK.interval,
          amount: p.unit_amount != null ? (p.unit_amount / 100).toFixed(2) : PRICE_FALLBACK.amount,
          currency: (p.currency || 'usd').toUpperCase(),
        });
      })
      .catch(() => { /* keep fallback */ });
    return () => { live = false; };
  }, []);

  const intervalLabel = INTERVAL_LABEL[price.interval] || price.interval;
  const intervalShort = INTERVAL_SHORT[price.interval] || price.interval;

  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'FAQPage', mainEntity: FAQ_ENTITIES },
      {
        '@type': 'Product',
        name: 'Road to CISSP membership',
        description: 'Full access: all learning tracks, 23+ hands-on labs, Security+ & CISSP exam simulators, and progress sync.',
        offers: {
          '@type': 'Offer',
          price: price.amount,
          priceCurrency: price.currency,
          url: 'https://www.road2cissp.com/pricing',
          availability: 'https://schema.org/InStock',
        },
      },
    ],
  }), [price.amount, price.currency]);

  const subscribe = async () => {
    if (!isAuthenticated) {
      window.location.href = '/signin';
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const attributionTag = getAttributionTag();
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        ...(attributionTag ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attribution_tag: attributionTag }),
        } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.message || 'Checkout failed. Please try again.');
      window.location.href = data.checkout_url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen text-ink-1">
      <Seo
        title={`Pricing — Road to CISSP membership, ${price.display}/${intervalShort}`}
        description={`One subscription unlocks every track, 23+ hands-on labs, and Security+ & CISSP exam simulators. ${price.display}/${intervalShort}, cancel anytime. Free tier with no account needed.`}
        path="/pricing"
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

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="py-14 text-center sm:py-20">
          <div className="text-caption font-semibold uppercase tracking-[0.2em] text-ink-3">
            One plan. Everything included.
          </div>
          <h1 className="mx-auto mt-4 max-w-3xl text-[clamp(2.25rem,2rem+3vw,3.75rem)] font-bold leading-[1.1] tracking-tight text-ink-1">
            The only subscription you&apos;ll need, from first cert to CISSP.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-body text-ink-2">
            Every track, every lab, every exam sim — one price, cancel anytime.
          </p>
        </section>

        {/* Plan card */}
        <section className="mx-auto max-w-xl pb-16">
          <Card level={2} padding="lg" className="text-center">
            <p className="text-caption font-semibold uppercase tracking-[0.2em] text-ink-3">Subscription</p>
            <p className="mt-3">
              <span className="text-[3rem] font-bold leading-none tracking-tight text-ink-1">{price.display}</span>
              <span className="text-body text-ink-2"> / {intervalLabel}</span>
            </p>
            <ul className="mx-auto mt-6 max-w-sm space-y-3 text-left">
              {['All learning tracks, zero to CISSP', 'All 23+ hands-on labs', 'Security+ & CISSP exam simulators', 'Progress sync across devices', 'New content every month'].map((f) => (
                <li key={f} className="flex gap-3 text-body text-ink-1">
                  <Check size={18} className="mt-1 shrink-0 text-success" aria-hidden="true" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {subscribed ? (
                <p className="text-body font-semibold text-success">You have full access — enjoy the labs.</p>
              ) : (
                <Button size="lg" onClick={subscribe} disabled={busy} className="w-full sm:w-auto">
                  {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
                  {busy ? 'Starting checkout…' : isAuthenticated ? `Subscribe — ${price.display}/${intervalShort}` : 'Sign in to subscribe'}
                </Button>
              )}
              {error && (
                <p className="mt-3 flex items-center justify-center gap-2 text-small text-danger">
                  <X size={15} aria-hidden="true" /> {error}
                </p>
              )}
              <p className="mt-3 text-small text-ink-3">Cancel anytime. Secure checkout by Stripe.</p>
            </div>
          </Card>
        </section>

        {/* Features */}
        <section className="pb-16">
          <h2 className="text-center text-title font-bold tracking-tight text-ink-1">What the subscription unlocks</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title} level={1} padding="lg">
                <Icon size={22} className="text-action" aria-hidden="true" />
                <h3 className="mt-3 text-heading font-semibold text-ink-1">{title}</h3>
                <p className="mt-2 text-body text-ink-2">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl pb-20">
          <h2 className="text-center text-title font-bold tracking-tight text-ink-1">Questions</h2>
          <div className="mt-8 space-y-4">
            {FAQS.map(({ q, a }) => (
              <Card key={q} level={1} padding="lg">
                <h3 className="text-heading font-semibold text-ink-1">{q}</h3>
                <p className="mt-2 text-body text-ink-2">{a}</p>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center text-small text-ink-2">
            Before you book the exam, check the official objectives:{' '}
            <a href="https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline" target="_blank" rel="noreferrer" className="underline decoration-black/30 underline-offset-4 hover:text-ink-1">CISSP exam outline — ISC2</a>
            {', '}
            <a href="https://www.comptia.org/certifications/security" target="_blank" rel="noreferrer" className="underline decoration-black/30 underline-offset-4 hover:text-ink-1">Security+ exam objectives — CompTIA</a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
