// Self-service account deletion (Guideline 5.1.1(v)). Same-origin /api
// (or VITE_API_BASE_URL), cookies included — the session lives in an
// HttpOnly cookie on the web; the native shell's wrapped fetch adds the
// Bearer token, so the same call works from the Capacitor app.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function deleteOwnAccount() {
  const res = await fetch(`${API_BASE}/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const err = new Error(data?.detail || `Delete failed (${res.status})`);
    err.status = res.status;
    err.detail = data?.detail || null;
    throw err;
  }
  return res.json();
}
