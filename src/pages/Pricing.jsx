import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FlaskConical, Target, RefreshCw, Check, X, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/ui-glass';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription, FREE_LABS } from '@/lib/subscription';
import { useIapProducts, purchaseIap, isIapPlatform, IAP_PRODUCT_IDS } from '@/lib/iap';
import { labTitle } from '@/data/deckLabs';
import { getAttributionTag } from '@/lib/attribution';
import { COUNTS } from '@/data/counts';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// The two free-tier labs, named and linked — a visitor deciding whether to
// try a lab must know exactly which ones need no plan (Spencer, 2026-11-16).
// Titles come from the lab registry fallback (deckLabs) and ids from the
// free-tier source of truth (subscription.js); never hardcode either list.
const FREE_LAB_LINKS = [...FREE_LABS].map((labId) => ({
  labId,
  title: labTitle(labId),
}));

const FEATURES = [
  { icon: BookOpen, title: 'Every track, every lesson', text: 'Networking, Security+, Linux, Python, Cloud, and the CISSP capstone — all flashcards, lessons, and cheat sheets.' },
  {
    icon: FlaskConical,
    title: `All ${COUNTS.labs} hands-on labs`,
    text: (
      <>
        Real terminals: Cisco IOS, Linux triage, Python automation, cloud sandboxes. The free tier gets two —{' '}
        {FREE_LAB_LINKS.map((lab, i) => (
          <span key={lab.labId}>
            {i > 0 && ' and '}
            <Link to={`/labs/${lab.labId}`} className="font-semibold text-ink-1 underline decoration-black/30 underline-offset-2 hover:decoration-black/60">
              {lab.title}
            </Link>
          </span>
        ))}
        , free with no plan needed; members get them all.
      </>
    ),
  },
  { icon: Target, title: 'Exam simulators', text: 'Timed Security+ and CISSP practice exams with domain-weighted scoring and per-domain breakdowns.' },
  { icon: RefreshCw, title: 'Progress that syncs', text: 'Streaks, XP, badges, and Leitner review saved to your account across every device.' },
];

// Fallbacks match billing.PRICE_FALLBACK / ANNUAL_PRICE_FALLBACK; replaced by
// the live Stripe prices. `configured` gates the annual button only: monthly
// checkout surfaces a 503 cleanly when billing is unconfigured, as before.
const MONTHLY_FALLBACK = { display: '$29', interval: 'month', amount: '29.00', currency: 'USD', configured: false };
const ANNUAL_FALLBACK = { display: '$250', interval: 'year', amount: '250.00', currency: 'USD', configured: false };
const INTERVAL_LABEL = { month: 'month', year: 'year', week: 'week', day: 'day' };
const INTERVAL_SHORT = { month: 'mo', year: 'yr', week: 'wk', day: 'day' };

const INCLUDED = ['All learning tracks, zero to CISSP', `All ${COUNTS.labs} hands-on labs`, 'Security+ & CISSP exam simulators', 'Progress sync across devices', 'New content every month'];

function PlanCard({ label, badge, price, perLine, buttonLabel, disabled, disabledNote, onSubscribe, busy, busyLabel, subscribed }) {
  return (
    <Card level={2} padding="lg" className="text-center">
      {badge && (
        <p className="mx-auto w-fit rounded-full bg-action/10 px-3 py-1 text-caption font-semibold uppercase tracking-[0.15em] text-action">{badge}</p>
      )}
      <p className="mt-3 text-caption font-semibold uppercase tracking-[0.2em] text-ink-3">{label}</p>
      <p className="mt-3">
        <span className="text-[3rem] font-bold leading-none tracking-tight text-ink-1">{price.display}</span>
        <span className="text-body text-ink-2"> / {INTERVAL_LABEL[price.interval] || price.interval}</span>
      </p>
      <p className="mx-auto mt-2 max-w-xs text-small text-ink-2">{perLine}</p>
      <div className="mt-6">
        {subscribed ? (
          <p className="text-body font-semibold text-success">You have full access — enjoy the labs.</p>
        ) : (
          <Button size="lg" onClick={onSubscribe} disabled={disabled || busy} className="w-full sm:w-auto">
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
            {busy ? (busyLabel || 'Starting checkout…') : buttonLabel}
          </Button>
        )}
        {disabledNote && (
          <p className="mt-3 text-small text-ink-2">{disabledNote}</p>
        )}
      </div>
    </Card>
  );
}

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const { subscribed, refresh: refreshSubscription } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Starting checkout…');
  const [error, setError] = useState(null);
  // In-app purchases (Guideline 3.1.1): in the iOS shell the subscription
  // is sold through the App Store, never through Stripe Checkout — the
  // Stripe entry points below are gated out whenever this is true. The
  // App Store is the source of truth for whether the products exist yet:
  // `available` is false until they are created in App Store Connect,
  // and the buy buttons hide until then. The website keeps Stripe.
  const onIap = isIapPlatform();
  const iap = useIapProducts();
  const iapProductByPlan = useMemo(() => {
    const byPlan = {};
    for (const p of iap.products || []) {
      if (p.plan) byPlan[p.plan] = p;
    }
    return byPlan;
  }, [iap.products]);
  // Single source of truth: the live Stripe prices, so the page, the structured
  // data, and the actual charge never drift. Falls back if billing is unconfigured.
  const [plans, setPlans] = useState({ monthly: MONTHLY_FALLBACK, annual: ANNUAL_FALLBACK });

  useEffect(() => {
    let live = true;
    const toPlan = (p, fallback) => ({
      display: p.display || fallback.display,
      interval: p.interval || fallback.interval,
      amount: p.unit_amount != null ? (p.unit_amount / 100).toFixed(2) : fallback.amount,
      currency: (p.currency || 'usd').toUpperCase(),
      configured: p.configured === true,
    });
    fetch(`${API_BASE}/billing/plans`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!live || !p) return;
        setPlans({
          monthly: toPlan(p.monthly || {}, MONTHLY_FALLBACK),
          annual: toPlan(p.annual || {}, ANNUAL_FALLBACK),
        });
      })
      .catch(() => {
        // Backend without /billing/plans: monthly from /billing/price,
        // annual stays on the not-configured fallback.
        fetch(`${API_BASE}/billing/price`)
          .then((r) => (r.ok ? r.json() : null))
          .then((p) => {
            if (live && p) setPlans((prev) => ({ ...prev, monthly: toPlan(p, MONTHLY_FALLBACK) }));
          })
          .catch(() => { /* keep fallbacks */ });
      });
    return () => { live = false; };
  }, []);

  const { monthly, annual } = plans;
  const monthlyShort = INTERVAL_SHORT[monthly.interval] || monthly.interval;
  const annualShort = INTERVAL_SHORT[annual.interval] || annual.interval;
  // Savings vs twelve monthly payments, from the live prices so the line
  // stays true if either price changes: $29 x 12 = $348, $348 - $250 = $98.
  const yearlySaving = parseFloat(monthly.amount) * 12 - parseFloat(annual.amount);
  const annualMonthlyEquivalent = (parseFloat(annual.amount) / 12).toFixed(2);

  // In the iOS shell the prices come from the App Store, not Stripe: the
  // tier amounts can differ by currency, so the displayed price and the
  // savings line are computed from the App Store products when they are
  // available. Until they are, the Stripe fallbacks stand in as the
  // informational price (the buttons stay disabled, so nothing can be
  // bought at a price the store does not know).
  const iapMonthly = iapProductByPlan.monthly;
  const iapAnnual = iapProductByPlan.annual;
  const displayMonthly = onIap && iapMonthly
    ? { display: iapMonthly.displayPrice, interval: 'month' }
    : monthly;
  const displayAnnual = onIap && iapAnnual
    ? { display: iapAnnual.displayPrice, interval: 'year' }
    : annual;
  const iapYearlySaving = onIap && iapMonthly && iapAnnual
    ? (iapMonthly.price * 12 - iapAnnual.price)
    : yearlySaving;
  const iapAnnualMonthlyEquivalent = onIap && iapAnnual
    ? (iapAnnual.price / 12).toFixed(2)
    : annualMonthlyEquivalent;
  const annualPerLine = onIap && iapAnnual && iapYearlySaving > 0
    ? `About $${iapAnnualMonthlyEquivalent} a month — save $${iapYearlySaving.toFixed(0)} a year vs paying monthly.`
    : `About $${annualMonthlyEquivalent} a month — save $${yearlySaving.toFixed(0)} a year vs paying monthly.`;
  // While the App Store products load, the buttons wait; once loaded with
  // none, the subscription is not set up in App Store Connect yet.
  const iapNotReadyNote = onIap && !iap.available && !iap.loading
    ? 'Subscriptions are being set up in the App Store — check back soon.'
    : null;

  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: 'Road to CISSP membership',
        description: `Full access: all learning tracks, ${COUNTS.labs} hands-on labs, Security+ & CISSP exam simulators, and progress sync.`,
        offers: [
          {
            '@type': 'Offer',
            price: monthly.amount,
            priceCurrency: monthly.currency,
            url: 'https://www.road2cissp.com/pricing',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            price: annual.amount,
            priceCurrency: annual.currency,
            url: 'https://www.road2cissp.com/pricing',
            availability: annual.configured ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        ],
      },
    ],
  }), [monthly.amount, monthly.currency, annual.amount, annual.currency, annual.configured]);

  const subscribe = async (plan) => {
    if (!isAuthenticated) {
      window.location.href = '/signin';
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (onIap) {
        // App Store purchase: the StoreKit sheet, then the signed
        // transaction is verified server-side and the entitlement granted
        // (see src/lib/iap.js). No Stripe, no WebView checkout.
        setBusyLabel('Waiting for the App Store…');
        const result = await purchaseIap(IAP_PRODUCT_IDS[plan === 'annual' ? 'yearly' : 'monthly']);
        if (result.state === 'cancelled') {
          setBusy(false);
          return;
        }
        if (result.state === 'pending') {
          setError('Waiting for approval — the purchase will complete once it is approved (check the App Store).');
          setBusy(false);
          return;
        }
        await refreshSubscription();
        setBusy(false);
        return;
      }
      const attributionTag = getAttributionTag();
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          ...(attributionTag ? { attribution_tag: attributionTag } : {}),
        }),
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
        title={`Pricing — Road to CISSP membership, ${monthly.display}/${monthlyShort}`}
        description={`One subscription unlocks every track, ${COUNTS.labs} hands-on labs, and Security+ & CISSP exam simulators. ${monthly.display}/${monthlyShort} or ${annual.display}/${annualShort}, cancel anytime. Free tier with no account needed.`}
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
            Every track, every lab, every exam sim — pick monthly or yearly, cancel anytime.
          </p>
        </section>

        {/* Plan cards */}
        <section className="mx-auto max-w-3xl pb-16">
          <div className="grid gap-4 sm:grid-cols-2">
            <PlanCard
              label="Monthly"
              price={displayMonthly}
              perLine="Billed every month. Cancel anytime."
              buttonLabel={onIap
                ? (isAuthenticated ? `Subscribe with Apple — ${displayMonthly.display}` : 'Sign in to subscribe')
                : (isAuthenticated ? `Subscribe — ${monthly.display}/${monthlyShort}` : 'Sign in to subscribe')}
              disabled={onIap && !iap.available}
              disabledNote={iapNotReadyNote}
              onSubscribe={() => subscribe('monthly')}
              busy={busy}
              busyLabel={busyLabel}
              subscribed={subscribed}
            />
            <PlanCard
              label="Annual"
              badge="Best value"
              price={displayAnnual}
              perLine={annualPerLine}
              buttonLabel={onIap
                ? (isAuthenticated ? `Subscribe with Apple — ${displayAnnual.display}` : 'Sign in to subscribe')
                : (annual.configured ? (isAuthenticated ? `Subscribe — ${annual.display}/${annualShort}` : 'Sign in to subscribe') : 'Annual billing coming soon')}
              disabled={onIap ? !iap.available : !annual.configured}
              disabledNote={onIap ? iapNotReadyNote : (annual.configured ? null : 'The $250/yr price is being set up — monthly is available now.')}
              onSubscribe={() => subscribe('annual')}
              busy={busy}
              busyLabel={busyLabel}
              subscribed={subscribed}
            />
          </div>
          {error && (
            <p className="mt-4 flex items-center justify-center gap-2 text-small text-danger">
              <X size={15} aria-hidden="true" /> {error}
            </p>
          )}
          <p className="mt-4 text-center text-small text-ink-3">
            {onIap ? 'Cancel anytime in iOS Settings. Billed through the App Store.' : 'Cancel anytime. Secure checkout by Stripe.'}
          </p>
          {/* B-29 (audit 2026-11-16): surface the refund + grace terms where the
              buyer decides. Wording is the FAQ/Terms policy, shortened — the
              FAQ and Terms stay the single source of truth. In the iOS app
              refunds go through Apple, not support (see Terms). */}
          <p className="mx-auto mt-3 max-w-xl text-center text-small text-ink-2">
            {onIap ? (
              <>
                <strong className="font-semibold text-ink-1">Bought in the app? App Store purchases are refunded by Apple</strong>
                {' '}— request one at{' '}
                <a href="https://reportaproblem.apple.com" target="_blank" rel="noreferrer" className="underline decoration-black/30 underline-offset-2 hover:text-ink-1">reportaproblem.apple.com</a>
                {' '}(sign in with the Apple ID you subscribed with).{' '}
                <Link to="/terms" className="underline decoration-black/30 underline-offset-2 hover:text-ink-1">Terms</Link>
              </>
            ) : (
              <>
                <strong className="font-semibold text-ink-1">First subscription? Full refund if you ask within 14 days</strong>
                {' '}— email{' '}
                <a href="mailto:support@road2cissp.com" className="underline decoration-black/30 underline-offset-2 hover:text-ink-1">support@road2cissp.com</a>.
                If a payment fails, you keep full access for 7 days while you fix it.{' '}
                <Link to="/terms" className="underline decoration-black/30 underline-offset-2 hover:text-ink-1">Terms</Link>
              </>
            )}
          </p>

          {/* Everything included — same access on either plan */}
          <Card level={1} padding="lg" className="mt-8">
            <h2 className="text-center text-heading font-semibold text-ink-1">Everything included, either way you pay</h2>
            <ul className="mx-auto mt-6 max-w-sm space-y-3 text-left">
              {INCLUDED.map((f) => (
                <li key={f} className="flex gap-3 text-body text-ink-1">
                  <Check size={18} className="mt-1 shrink-0 text-success" aria-hidden="true" /> {f}
                </li>
              ))}
            </ul>
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

      </main>
    </div>
  );
}
