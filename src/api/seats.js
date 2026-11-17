// Public seats counter: total accounts created vs the seat cap.
//
// No auth — the count and cap are public information, served by
// GET /public/seats (backend/public.py). Returns null on any failure so the
// landing page renders nothing instead of a wrong number.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchSeats() {
  try {
    const res = await fetch(`${API_BASE}/public/seats`);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.total_accounts !== 'number' || typeof data?.cap !== 'number') return null;
    return { totalAccounts: data.total_accounts, cap: data.cap };
  } catch {
    return null;
  }
}
