// Admin API client. Same-origin /api (or VITE_API_BASE_URL), cookies
// included — the admin session lives in an HttpOnly cookie, never in JS.
//
// CSRF (admin platform step 2): every state-changing admin request carries
// X-CSRF-Token. The server hands the token over in JSON (status / login /
// MFA activation) because the API is on another host than the site, so the
// page could not read a token cookie. It lives in memory only.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
let csrfToken = '';

function remember(data) {
  if (data && typeof data.csrf_token === 'string') csrfToken = data.csrf_token;
  return data;
}

async function req(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (!SAFE.has(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (res.status === 401) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const err = new Error(data?.detail || `Admin request failed (${res.status})`);
    err.status = res.status;
    err.detail = data?.detail || null;
    throw err;
  }
  return res.json();
}

export const adminApi = {
  status: () => req('/admin/status').then(remember),
  // Sign-in = the site account (Google/GitHub) + a code from the authenticator app.
  login: (code) => req('/admin/login', { method: 'POST', body: JSON.stringify({ code }) }).then(remember),
  mfaSetup: () => req('/admin/mfa/setup', { method: 'POST', body: JSON.stringify({}) }),
  mfaActivate: (code) => req('/admin/mfa/activate', { method: 'POST', body: JSON.stringify({ code }) }).then(remember),
  logout: () => req('/admin/logout', { method: 'POST', body: JSON.stringify({}) }).finally(() => { csrfToken = ''; }),
  /** Where a site sign-in starts, returning to /admin afterwards. */
  signInUrl: (provider) => `${API_BASE}/auth/${provider}/login?next=${encodeURIComponent('/admin')}`,
  providers: () => req('/auth/providers'),
  overview: () => req('/admin/overview'),
  accounts: ({ q = '', page = 1, pageSize = 25 } = {}) =>
    req(`/admin/accounts?q=${encodeURIComponent(q)}&page=${page}&page_size=${pageSize}`),
  subscriptions: () => req('/admin/subscriptions'),
  aiCalls: ({ days = 30, page = 1, pageSize = 25 } = {}) =>
    req(`/admin/ai-calls?days=${days}&page=${page}&page_size=${pageSize}`),
  addAccount: ({ display_name, email, note }) =>
    req('/admin/accounts', { method: 'POST', body: JSON.stringify({ display_name, email, note: note || '' }) }),
  grantAccess: (userId, note) =>
    req(`/admin/accounts/${encodeURIComponent(userId)}/manual-grant`, {
      method: 'POST',
      body: JSON.stringify({ note: note || '' }),
    }),
  updateAccount: (userId, { display_name, email }) =>
    req(`/admin/accounts/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ display_name, email }),
    }),
  deleteAccount: (userId) =>
    req(`/admin/accounts/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
  revokeAccess: (userId, note) =>
    req(`/admin/accounts/${encodeURIComponent(userId)}/manual-grant/revoke`, {
      method: 'POST',
      body: JSON.stringify({ note: note || '' }),
    }),
  report: ({ days = 30 } = {}) => req(`/admin/report?days=${days}`),
  reportCsvUrl: ({ days = 30 } = {}) => `${API_BASE}/admin/report.csv?days=${days}`,
};
