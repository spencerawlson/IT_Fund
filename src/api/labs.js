// Client for the interactive-lab backend (backend/labs). Uses the hosted backend target
// (VITE_API_BASE_URL) when set, same-origin /api fallback for local dev (Vite proxy).
// credentials:include keeps the lab session on the same backend that owns the account
// session cookie (api.road2cissp.com in production).
// TOKEN_KEY is the legacy demo bearer token, still accepted by the backend as a fallback.
const TOKEN_KEY = 'it_fund_access_token';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function labRequest(path, { method = 'GET', body } = {}) {
  const token = (() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  })();
  const res = await fetch(`${API_BASE}/labs${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.detail || data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const labsApi = {
  listDefinitions: () => labRequest('/definitions'),
  history: () => labRequest('/history'),
  start: (labId) => labRequest(`/${labId}/start`, { method: 'POST' }),
  getSession: (id) => labRequest(`/sessions/${id}`),
  recordFindings: (id, findings) => labRequest(`/sessions/${id}/findings`, { method: 'POST', body: { findings } }),
  exec: (id, command) => labRequest(`/sessions/${id}/exec`, { method: 'POST', body: { command } }),
  validate: (id) => labRequest(`/sessions/${id}/validate`, { method: 'POST' }),
  reset: (id) => labRequest(`/sessions/${id}/reset`, { method: 'POST' }),
  destroy: (id) => labRequest(`/sessions/${id}`, { method: 'DELETE' }),
};
