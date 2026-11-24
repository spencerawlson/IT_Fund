import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui-glass';
import Seo from '@/components/Seo';
import ThemeToggle from '@/components/ThemeToggle';

// Learner reviews of Road to CISSP. Only admin-approved reviews are ever
// listed here (GET /api/public/reviews returns approved rows only, newest
// first, capped at 50). The page launches with an honest empty state — no
// seeded or fake reviews. Signed-in learners can submit one review
// (rating 1–5, text, optional display name); it waits for moderation and
// the author sees "Thanks — your review is awaiting moderation."
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function stars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function ReviewCard({ review }) {
  return (
    <article className="rounded-xl border border-black/10 bg-white px-5 py-4">
      <p className="text-body text-ink-1" aria-label={`${review.rating} out of 5 stars`}>
        <span aria-hidden="true">{stars(review.rating)}</span>
      </p>
      <p className="mt-2 text-body text-ink-1">{review.body}</p>
      <p className="mt-3 text-small text-ink-2">
        {review.display_name}
        {review.created_at ? ` · ${new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}
      </p>
    </article>
  );
}

function ReviewForm({ onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, body: body.trim(), display_name: displayName.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || 'Could not submit your review.');
      }
      try {
        localStorage.setItem('r2c-review-submitted', '1');
      } catch {
        // Dismissal/submission flags are best-effort; the review is stored either way.
      }
      onSubmitted();
    } catch (err) {
      setError(err.message || 'Could not submit your review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-10 rounded-xl border border-black/10 bg-white px-5 py-5">
      <h2 className="text-heading text-ink-1">Leave a review</h2>
      <div className="mt-4">
        <span className="block text-small font-semibold text-ink-1" id="review-rating-label">Rating</span>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-labelledby="review-rating-label">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} out of 5 stars`}
              onClick={() => setRating(n)}
              className={`rounded-control border px-3 py-1.5 text-body ${rating === n ? 'border-black/30 glass-1 font-semibold text-ink-1' : 'border-black/10 text-ink-2'}`}
            >
              {n}★
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-small font-semibold text-ink-1" htmlFor="review-body">
          Your review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          placeholder="What helped you learn? What would you tell another learner?"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-body text-ink-1 placeholder:text-ink-3 focus:border-violet-500 focus:outline-none"
        />
      </div>
      <div className="mt-4">
        <label className="block text-small font-semibold text-ink-1" htmlFor="review-name">
          Display name (optional)
        </label>
        <input
          id="review-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={120}
          placeholder="Anonymous learner"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-body text-ink-1 placeholder:text-ink-3 focus:border-violet-500 focus:outline-none"
        />
      </div>
      {error && (
        <p role="alert" className="mt-3 text-small font-semibold text-red-700">{error}</p>
      )}
      <div className="mt-5">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </form>
  );
}

export default function Reviews() {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`${API_BASE}/public/reviews`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (live) setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      })
      .catch(() => {
        if (live) setReviews([]);
      });
    return () => { live = false; };
  }, []);

  return (
    <div className="min-h-screen text-ink-1">
      <Seo
        title="Reviews · Road to CISSP"
        description="Learner reviews of Road to CISSP — hands-on labs, lessons, and exam prep."
        path="/reviews"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Reviews · Road to CISSP',
          description: 'Learner reviews of Road to CISSP — hands-on labs, lessons, and exam prep.',
          url: 'https://www.road2cissp.com/reviews',
        }}
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
          Learner reviews
        </h1>
        <p className="mt-4 text-body text-ink-2">
          Honest reviews from learners studying with Road to CISSP — the hands-on labs, lessons, and exam prep, in their own words.
        </p>

        {reviews === null ? (
          <p className="mt-10 text-body text-ink-2">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-10 text-body text-ink-2">No reviews yet — be the first.</p>
        ) : (
          <div className="mt-10 space-y-4">
            {reviews.map((r, i) => (
              <ReviewCard key={`${r.created_at || ''}-${i}`} review={r} />
            ))}
          </div>
        )}

        {submitted ? (
          <p className="mt-10 rounded-xl border border-black/10 bg-white px-5 py-4 text-body text-ink-1">
            Thanks — your review is awaiting moderation.
          </p>
        ) : isAuthenticated ? (
          <ReviewForm onSubmitted={() => setSubmitted(true)} />
        ) : (
          <p className="mt-10 rounded-xl border border-black/10 bg-white px-5 py-4 text-body text-ink-2">
            <Link to="/signin" className="underline decoration-black/30 underline-offset-4 hover:text-ink-1">Sign in</Link>
            {' '}to leave a review.
          </p>
        )}
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
