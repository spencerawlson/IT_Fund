import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FlaskConical, Target, RefreshCw, Check, X, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/ui-glass';
import { useAuth } from '@/lib/AuthContext';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const FEATURES = [
  { icon: BookOpen, title: 'Every track, every lesson', text: 'Networking, Security+, Linux, Python, Cloud, and the CISSP capstone — all flashcards, lessons, and cheat sheets.' },
  { icon: FlaskConical, title: 'All 23+ hands-on labs', text: 'Real terminals: Cisco IOS, Linux triage, Python automation, cloud sandboxes. The free tier gets one; members get them all.' },
  { icon: Target, title: 'Exam simulators', text: 'Timed Security+ and CISSP practice exams with domain-weighted scoring and per-domain breakdowns.' },
  { icon: RefreshCw, title: 'Progress that syncs', text: 'Streaks, XP, badges, and Leitner review saved to your account across every device.' },
];

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel in one click from your account page — no emails, no phone calls, no retention gauntlet. You keep premium access until the end of your billing period.',
  },
  {
    q: 'What happens to my progress if I cancel?',
    a: 'Nothing is deleted. Your streaks, XP, badges, and history stay on your account. You drop back to the free tier until you resubscribe.',
  },
  {
    q: 'What exactly is free?',
    a: 'One sample lesson, 50 flashcards, one hands-on lab, and all marketing pages — no account or payment needed. Everything beyond that is premium.',
  },
  {
    q: 'Is this enough to pass Security+ or CISSP?',
    a: 'That is the goal we build toward: flashcards mapped to official objectives, scenario-based practice, hands-on labs, and timed exam sims. We recommend pairing it with the official exam objectives checklist as you study.',
  },
];

export default function Pricing() {
  useDocumentTitle('Pricing · Road to CISSP');
  const { isAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const subscribe = async () => {
    if (!isAuthenticated) {
      window.location.href = '/signin';
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
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
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="text-body font-bold tracking-tight">Road to CISSP</Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" to="/labs">Labs</Button>
          <Button variant="secondary" size="sm" to="/signin">Sign in</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="py-14 text-center sm:py-20">
          <p className="text-caption font-semibold uppercase tracking-[0.2em] text-ink-3">
            One plan. Everything included.
          </p>
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
            <p className="text-caption font-semibold uppercase tracking-[0.2em] text-ink-3">Premium</p>
            <p className="mt-3">
              <span className="text-[3rem] font-bold leading-none tracking-tight text-ink-1">$19</span>
              <span className="text-body text-ink-2"> / month</span>
            </p>
            <ul className="mx-auto mt-6 max-w-sm space-y-3 text-left">
              {['All learning tracks, zero to CISSP', 'All 23+ hands-on labs', 'Security+ & CISSP exam simulators', 'Progress sync across devices', 'New content every month'].map((f) => (
                <li key={f} className="flex gap-3 text-body text-ink-1">
                  <Check size={18} className="mt-1 shrink-0 text-success" aria-hidden="true" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button size="lg" onClick={subscribe} disabled={busy} className="w-full sm:w-auto">
                {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
                {busy ? 'Starting checkout…' : isAuthenticated ? 'Subscribe — $19/mo' : 'Sign in to subscribe'}
              </Button>
              {error && (
                <p className="mt-3 flex items-center justify-center gap-2 text-small text-error">
                  <X size={15} aria-hidden="true" /> {error}
                </p>
              )}
              <p className="mt-3 text-small text-ink-3">Cancel anytime. Secure checkout by Stripe.</p>
            </div>
          </Card>
        </section>

        {/* Features */}
        <section className="pb-16">
          <h2 className="text-center text-title font-bold tracking-tight text-ink-1">What premium unlocks</h2>
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
        </section>
      </main>
    </div>
  );
}
