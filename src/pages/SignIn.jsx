import React, { useState } from 'react';
import { LogIn, LogOut, ShieldCheck, Check, RefreshCw, CreditCard, Loader2 } from 'lucide-react';
import { Button, Card, IconTile, PageContainer, PageHeader } from '@/components/ui-glass';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/lib/subscription';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Subscription status for signed-in users: current plan, renewal date, manage/cancel.
function SubscriptionSection() {
  const { subscribed, status, currentPeriodEnd, loading, refresh } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const manage = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/billing/portal`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Could not open the billing portal.');
      window.location.href = data.portal_url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card level={2} padding="lg" className="mt-4 max-w-reading">
        <p className="text-small text-ink-2">Loading subscription…</p>
      </Card>
    );
  }

  const renewal = currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null;

  return (
    <Card level={2} padding="lg" className="mt-4 max-w-reading">
      <p className="flex items-center gap-2 text-heading font-semibold text-ink-1">
        <CreditCard size={18} aria-hidden="true" /> Subscription
      </p>
      {subscribed ? (
        <>
          <p className="mt-3 text-body text-ink-1">
            <span className="font-semibold text-success">Premium active</span>
            {renewal && <span className="text-ink-2"> — renews {renewal}</span>}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={manage} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
              Manage subscription
            </Button>
            <Button variant="ghost" size="sm" onClick={refresh}>Refresh status</Button>
          </div>
          {error && <p className="mt-3 text-small text-error">{error}</p>}
          <p className="mt-3 text-small text-ink-3">Update payment method or cancel anytime from the Stripe portal.</p>
        </>
      ) : (
        <>
          <p className="mt-3 text-body text-ink-2">
            You&apos;re on the <span className="font-semibold text-ink-1">free tier</span>
            {status !== 'none' && status !== 'anonymous' && ` (status: ${status})`}.
            Premium unlocks every track, all labs, and the exam simulators.
          </p>
          <div className="mt-4">
            <Button to="/pricing">See plans — $19/mo</Button>
          </div>
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

  if (isLoadingAuth) {
    return <PageContainer><p className="text-ink-2">Loading…</p></PageContainer>;
  }

  if (isAuthenticated) {
    return (
      <PageContainer>
        <PageHeader title="Your account" description="Your progress syncs to your account across devices." />
        <Card level={2} padding="lg" className="max-w-reading">
          <div className="flex items-center gap-4">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-12 w-12 rounded-full border border-white/10" />
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
            {user.providers?.length === 1 && (
              <Button variant="secondary" icon={LogIn} onClick={() => signInWith(user.providers.includes('google') ? 'github' : 'google')}>
                Link {user.providers.includes('google') ? 'GitHub' : 'Google'}
              </Button>
            )}
            <Button variant="ghost" icon={LogOut} onClick={signOut}>Sign out</Button>
          </div>
        </Card>
        <SubscriptionSection />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Sign in to sync"
        description="Sign in to save your progress across devices. It’s optional — everything works without an account, with your progress kept in this browser."
      />
      <Card level={2} padding="lg" className="max-w-reading">
        <div className="flex flex-col gap-3">
          <Button size="lg" icon={LogIn} onClick={() => signInWith('google')}>Continue with Google</Button>
          <Button size="lg" variant="secondary" icon={LogIn} onClick={() => signInWith('github')}>Continue with GitHub</Button>
          {import.meta.env.DEV && (
            <Button size="lg" variant="ghost" onClick={() => { window.location.href = '/api/auth/dev-login'; }}>
              Developer sign-in (local only)
            </Button>
          )}
        </div>
        <div className="mt-6 border-t border-white/[0.08] pt-5">
          <p className="flex items-center gap-2 text-small font-semibold text-ink-1">
            <ShieldCheck size={16} aria-hidden="true" /> What we store
          </p>
          <ul className="mt-3 space-y-2 text-small text-ink-2">
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> Your name and avatar from the provider, and your learning progress.</li>
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> No password — sign-in is handled by Google or GitHub.</li>
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> Use both Google and GitHub and we’ll link them to one account.</li>
          </ul>
        </div>
      </Card>
    </PageContainer>
  );
}
