// Admin API client. Same-origin /api (or VITE_API_BASE_URL), session cookie
// included — the admin session lives in an HttpOnly cookie, never in JS.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function req(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) },
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
  status: () => req('/admin/status'),
  login: (password) => req('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => req('/admin/logout', { method: 'POST', body: JSON.stringify({}) }),
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
