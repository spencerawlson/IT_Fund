import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, ShieldCheck, Check, RefreshCw, CreditCard, Loader2 } from 'lucide-react';
import { Button, Card, IconTile, PageContainer, PageHeader } from '@/components/ui-glass';
import AppleLogo from '@/components/AppleLogo';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';
import Seo from '@/components/Seo';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription, useLabUsage } from '@/lib/subscription';
import { useIapProducts, purchaseIap, showManageSubscriptions, isIapPlatform, IAP_PRODUCT_IDS } from '@/lib/iap';
import LabUsageMeter from '@/components/LabUsageMeter';
import { getAttributionTag } from '@/lib/attribution';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Fallbacks match billing.PRICE_FALLBACK / ANNUAL_PRICE_FALLBACK; replaced by
// the live Stripe prices. `configured` gates the annual option only: monthly
// checkout surfaces a 503 cleanly when billing is unconfigured, as before.
const MONTHLY_FALLBACK = { display: '$29', interval: 'month', amount: '29.00', currency: 'USD', configured: false };
const ANNUAL_FALLBACK = { display: '$250', interval: 'year', amount: '250.00', currency: 'USD', configured: false };

// Subscription status for signed-in users: current plan, renewal date, manage/cancel.
// Exported for tests: the mounted interaction tests render this section
// directly (the page itself adds AuthProvider/ThemeProvider/router).
export function SubscriptionSection() {
  const { subscribed, status, provider, currentPeriodEnd, loading, refresh } = useSubscription();
  // Phase 0 lab-hours meter: renders only when metered (subscribers); a
  // failed fetch shows "Lab usage unavailable" and never blocks the page.
  const { usage: labUsage } = useLabUsage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  // In-app purchases (Guideline 3.1.1): in the iOS shell the subscription
  // is sold through the App Store, never through Stripe Checkout. The
  // provider (from /billing/status) decides where "Manage subscription"
  // goes: Apple subscribers manage in iOS Settings, Stripe subscribers
  // in the Customer Portal. The website keeps Stripe.
  const onIap = isIapPlatform();
  const iap = useIapProducts();
  const iapProductByPlan = useMemo(() => {
    const byPlan = {};
    for (const p of iap.products || []) {
      if (p.plan) byPlan[p.plan] = p;
    }
    return byPlan;
  }, [iap.products]);
  // Billing period: monthly is the default. Prices come from the live
  // /billing/plans endpoint (same source as /pricing); the fallbacks are
  // the decided prices, so the toggle is never empty while loading.
  const [plan, setPlan] = useState('monthly');
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
  // Savings vs twelve monthly payments, from the live prices so the line
  // stays true if either price changes: $29 x 12 = $348, $348 - $250 = $98.
  const yearlySaving = parseFloat(monthly.amount) * 12 - parseFloat(annual.amount);
  const annualMonthlyEquivalent = (parseFloat(annual.amount) / 12).toFixed(2);

  // In the iOS shell the prices come from the App Store, not Stripe (see
  // Pricing.jsx for the same derivation): the tier amounts can differ by
  // currency, so the radio labels and the savings line use the App Store
  // products when they are available.
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
  // The line under the billing-period toggle. On the web it is exactly
  // the old behaviour: the savings line on annual when configured, the
  // "being set up" message whenever annual is unconfigured (either plan
  // selected). On iOS the same shape, from the App Store prices — and
  // the "being set up" note until the products exist.
  const periodNote = plan === 'annual'
    ? (onIap
      ? (iap.available && iapYearlySaving > 0
        ? `About $${iapAnnualMonthlyEquivalent} a month — save $${iapYearlySaving.toFixed(0)} a year vs paying monthly.`
        : !iap.available && !iap.loading
          ? 'Subscriptions are being set up in the App Store — check back soon.'
          : null)
      : (annual.configured
        ? `About $${annualMonthlyEquivalent} a month — save $${yearlySaving.toFixed(0)} a year vs paying monthly.`
        : `The ${annual.display}/yr price is being set up — monthly is available now.`))
    : (onIap
      ? (!iap.available && !iap.loading
        ? 'Subscriptions are being set up in the App Store — check back soon.'
        : null)
      : (!annual.configured
        ? `The ${annual.display}/yr price is being set up — monthly is available now.`
        : null));

  const manage = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (provider === 'apple') {
        // Bought through the App Store: Apple manages it, not Stripe.
        // In the app the system sheet opens; on the website there is no
        // sheet, so the user is told where to go (iOS Settings).
        if (onIap) {
          await showManageSubscriptions();
        } else {
          setNotice('Your subscription was bought through the App Store — manage or cancel it in iOS Settings (your name → Subscriptions).');
        }
        setBusy(false);
        return;
      }
      const res = await fetch(`${API_BASE}/billing/portal`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Could not open the billing portal.');
      window.location.href = data.portal_url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  // Free-tier subscribe: the Stripe checkout the pricing page uses on the
  // website; in the iOS shell the App Store purchase instead (Guideline
  // 3.1.1). The account page is the subscription home for signed-in users,
  // so the subscribe action lives here instead of a link to /pricing.
  const subscribe = async (selectedPlan) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (onIap) {
        const result = await purchaseIap(IAP_PRODUCT_IDS[selectedPlan === 'annual' ? 'yearly' : 'monthly']);
        if (result.state === 'cancelled') {
          setBusy(false);
          return;
        }
        if (result.state === 'pending') {
          setNotice('Waiting for approval — the purchase will complete once it is approved (check the App Store).');
          setBusy(false);
          return;
        }
        await refresh();
        setBusy(false);
        return;
      }
      const attributionTag = getAttributionTag();
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
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

  if (loading) {
    return (
      <Card level={2} padding="lg" className="mt-4">
        <p className="text-small text-ink-2">Loading subscription…</p>
      </Card>
    );
  }

  const renewal = currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null;

  return (
    <Card level={2} padding="lg" className="mt-4">
      <p className="flex items-center gap-2 text-heading font-semibold text-ink-1">
        <CreditCard size={18} aria-hidden="true" /> Subscription
      </p>
      {subscribed ? (
        <>
          <p className="mt-3 text-body text-ink-1">
            <span className="font-semibold text-success">Premium active</span>
            {renewal && <span className="text-ink-2"> — renews {renewal}</span>}
          </p>
          <div className="mt-3">
            <LabUsageMeter usage={labUsage} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={manage} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
              Manage subscription
            </Button>
            <Button variant="ghost" size="sm" onClick={refresh}>Refresh status</Button>
          </div>
          {error && <p className="mt-3 text-small text-danger">{error}</p>}
          {notice && <p className="mt-3 text-small text-ink-2">{notice}</p>}
          <p className="mt-3 text-small text-ink-3">
            {provider === 'apple'
              ? 'Manage or cancel anytime in iOS Settings (your name → Subscriptions).'
              : provider === 'manual'
                ? 'Your access was granted by the administrator — there is nothing to manage here.'
                : 'Update payment method or cancel anytime from the Stripe portal.'}
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-body text-ink-2">
            You&apos;re on the <span className="font-semibold text-ink-1">free tier</span>
            {status !== 'none' && status !== 'anonymous' && ` (status: ${status})`}.
            Premium unlocks every track, all labs, and the exam simulators.
          </p>
          {/* Billing period: same monthly/annual choice as /pricing, with the
              live prices. Annual stays disabled until its price is
              configured, so an unconfigured annual plan can never break
              checkout. */}
          <div className="mt-4">
            <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-xl border border-black/10 bg-slate-100 p-1">
              <button
                type="button"
                role="radio"
                aria-checked={plan === 'monthly'}
                data-plan="monthly"
                onClick={() => setPlan('monthly')}
                disabled={busy}
                className={`rounded-lg px-3 py-1.5 text-caption font-semibold transition ${plan === 'monthly' ? 'bg-white text-ink-1 shadow-sm ring-1 ring-black/10' : 'text-ink-2 hover:text-ink-1'}`}
              >
                Monthly — {displayMonthly.display}/mo
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={plan === 'annual'}
                data-plan="annual"
                onClick={() => setPlan('annual')}
                disabled={busy || (onIap ? !iap.available : !annual.configured)}
                className={`rounded-lg px-3 py-1.5 text-caption font-semibold transition ${plan === 'annual' ? 'bg-white text-ink-1 shadow-sm ring-1 ring-black/10' : 'text-ink-2 hover:text-ink-1'} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Annual — {displayAnnual.display}/yr
              </button>
            </div>
            <p className="mt-2 text-small text-ink-2">
              {periodNote}
            </p>
          </div>
          <div className="mt-4">
            <Button onClick={() => subscribe(plan)} disabled={busy || (plan === 'annual' && (onIap ? !iap.available : !annual.configured)) || (onIap && !iap.available)}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
              {busy ? (onIap ? 'Waiting for the App Store…' : 'Starting checkout…') : (onIap ? `Subscribe with Apple — ${plan === 'annual' ? `${displayAnnual.display}/yr` : `${displayMonthly.display}/mo`}` : `Subscribe — ${plan === 'annual' ? `${annual.display}/yr` : `${monthly.display}/mo`}`)}
            </Button>
          </div>
          {error && <p className="mt-3 text-small text-danger">{error}</p>}
          {notice && <p className="mt-3 text-small text-ink-2">{notice}</p>}
          {onIap && !iap.available && !iap.loading && (
            <p className="mt-3 text-small text-ink-2">Subscriptions are being set up in the App Store — check back soon.</p>
          )}
        </>
      )}
    </Card>
  );
}

// Sign-in is optional: it only adds cross-device sync. Anonymous learners keep working with progress
// saved in this browser. When signed in, this page is the account view (profile + sign out).
export default function SignIn() {
  useDocumentTitle('Sign in · Road to CISSP');
  const { isAuthenticated, isLoadingAuth, user, signInWith, signOut } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // After a self-service delete the session is already revoked server-side;
  // signOut clears the local state (native token, sync) and we go home.
  const handleAccountDeleted = async () => {
    await signOut();
    navigate('/');
  };
  const oauthFailed = params.get('error') === 'oauth';
  // Seats full: the OAuth callback refused to create a new account because
  // the platform hit the 10,000-seat cap (see backend/auth/identity.py).
  // No waitlist exists — the message says so plainly and nothing is offered.
  const seatsFull = params.get('error') === 'seats_full';
  // Which OAuth providers the server actually has configured, so we only show
  // buttons that work. null = not yet known -> show both (optimistic fallback,
  // so a slow/failed fetch never hides sign-in).
  const [providers, setProviders] = useState(null);
  useEffect(() => {
    let live = true;
    fetch(`${API_BASE}/auth/providers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d && Array.isArray(d.providers)) setProviders(d.providers); })
      .catch(() => { /* keep fallback: show both */ });
    return () => { live = false; };
  }, []);
  const showProvider = (p) => providers === null || providers.includes(p);

  if (isLoadingAuth) {
    return <PageContainer><p className="text-ink-2">Loading…</p></PageContainer>;
  }

  if (isAuthenticated) {
    return (
      <PageContainer>
        <PageHeader title="Your account" description="Your progress syncs to your account across devices." />
        <Card level={2} padding="lg">
          <div className="flex items-center gap-4">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-12 w-12 rounded-full border border-black/10" />
            ) : (
              <IconTile icon={LogIn} />
            )}
            <div className="min-w-0">
              <p className="text-heading text-ink-1">{user.display_name || 'Signed in'}</p>
              <p className="mt-0.5 text-small text-ink-2">
                Signed in with {user.providers?.join(' and ') || 'OAuth'}
              </p>
            </div>
          </div>
          <p className="mt-5 flex items-center gap-2 text-small text-success">
            <RefreshCw size={15} aria-hidden="true" /> Progress synced
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {/* Link another provider: one button per configured provider the
                account does not have yet (Apple included, once configured).
                Linking reuses the verified-email auto-merge, so it lands on
                this same account, never a second one. */}
            {['google', 'github', 'apple']
              .filter((p) => !user.providers?.includes(p) && showProvider(p))
              .map((p) => {
                const label = p === 'apple' ? 'Apple' : p === 'google' ? 'Google' : 'GitHub';
                return (
                  <Button key={p} variant="secondary" icon={LogIn} onClick={() => signInWith(p)}>
                    {`Link ${label}`}
                  </Button>
                );
              })}
            <Button variant="ghost" icon={LogOut} onClick={signOut}>Sign out</Button>
          </div>
        </Card>
        <SubscriptionSection />
        <DeleteAccountSection onDeleted={handleAccountDeleted} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Seo
        title="Sign in · Road to CISSP"
        description="Sign in to save your progress across devices. It's optional — everything works without an account, with your progress kept in this browser."
        path="/signin"
        robots="noindex"
      />
      <PageHeader
        title="Sign in to sync"
        description="Sign in to save your progress across devices. It’s optional — everything works without an account, with your progress kept in this browser."
      />
      <Card level={2} padding="lg" className="max-w-reading">
        {oauthFailed && (
          <p role="alert" className="mb-4 text-small text-danger">
            Sign-in didn&apos;t complete. Please try again.
          </p>
        )}
        {seatsFull && (
          <p role="alert" className="mb-4 text-small text-danger">
            All seats are taken — sign-ups are closed.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {showProvider('google') && (
            <Button size="lg" icon={LogIn} onClick={() => signInWith('google')}>Continue with Google</Button>
          )}
          {showProvider('github') && (
            <Button size="lg" variant="secondary" icon={LogIn} onClick={() => signInWith('github')}>Continue with GitHub</Button>
          )}
          {showProvider('apple') && (
            // Sign in with Apple (Guideline 4.8, 2026-11-23): black button with
            // the Apple logo, per Apple's HIG — white on dark backgrounds, so
            // the dark theme flips it. Hidden until the server reports Apple
            // configured (GET /auth/providers), so an unconfigured Apple can
            // never show a broken button.
            <Button
              size="lg"
              icon={AppleLogo}
              onClick={() => signInWith('apple')}
              className="border-black bg-black text-white shadow-none hover:bg-black/85 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/85"
            >
              Sign in with Apple
            </Button>
          )}
          {providers && providers.length === 0 && (
            <p className="text-small text-ink-2">Account sign-in is being set up — for now, everything works without an account.</p>
          )}
          {import.meta.env.DEV && (
            // `/auth/dev-login` is POST-only on purpose (a GET that creates a session is
            // CSRF-able by construction), so this must be a real form submission, not a
            // `window.location.href` navigation — that issues a GET and 405s.
            <form method="POST" action={`${API_BASE}/auth/dev-login`}>
              <Button type="submit" size="lg" variant="ghost" className="w-full">
                Developer sign-in (local only)
              </Button>
            </form>
          )}
        </div>
        <div className="mt-6 border-t border-black/[0.08] pt-5">
          <p className="flex items-center gap-2 text-small font-semibold text-ink-1">
            <ShieldCheck size={16} aria-hidden="true" /> What we store
          </p>
          <ul className="mt-3 space-y-2 text-small text-ink-2">
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> Your name and avatar from the provider, and your learning progress.</li>
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> No password — sign-in is handled by Google, GitHub, or Apple.</li>
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> Sign in with more than one provider and we’ll link them to one account.</li>
          </ul>
        </div>
      </Card>
    </PageContainer>
  );
}
