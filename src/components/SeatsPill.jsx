import React, { useEffect, useState } from 'react';
import { fetchSeats } from '@/api/seats';

// The live seats pill for the hero (above the CTAs): "N of 10,000 seats taken" with
// the number bold in the site's violet accent, on a tinted pill. Reads
// GET /public/seats. Renders nothing until the fetch resolves, and nothing
// if it fails — never a hardcoded or stale number. At the cap the pill fills
// with the purple action surface instead of the tinted outline ("full").
//
// `seats` is optional: when a parent already holds the fetched value (the
// landing page fetches it for its own seats-full logic), pass it in and no
// second request is made; otherwise the pill fetches itself.
export default function SeatsPill({ seats: seatsProp }) {
  const [seats, setSeats] = useState(seatsProp ?? null);
  useEffect(() => {
    if (seatsProp !== undefined) {
      setSeats(seatsProp);
      return undefined;
    }
    let live = true;
    fetchSeats().then((s) => { if (live) setSeats(s); });
    return () => { live = false; };
  }, [seatsProp]);

  if (seats === null) return null;
  const full = seats.totalAccounts >= seats.cap;
  const fmt = (n) => n.toLocaleString('en-CA');

  return (
    <span
      data-testid="seats-counter-pill"
      role="status"
      className={full
        ? 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-transparent bg-action-surface px-2.5 py-1.5 text-caption font-medium text-action-surface-ink sm:px-3 sm:text-small'
        : 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-action/25 bg-action/10 px-2.5 py-1.5 text-caption font-medium text-ink-1 sm:px-3 sm:text-small'}
    >
      <span className={full ? 'font-bold' : 'font-bold text-action'}>{fmt(seats.totalAccounts)}</span>
      {/* The {' '} is dropped by flex layout (whitespace-only flex items
          don't render), so the visible gap is the pill's gap-1, not this
          space — it only keeps the DOM text readable. */}
      {' '}of {fmt(seats.cap)} seats taken
    </span>
  );
}
