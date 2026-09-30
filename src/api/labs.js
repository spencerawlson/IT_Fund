// Client for the interactive-lab backend (backend/labs). Uses relative /api paths so the Vite dev
// proxy (-> :8000) and the Vercel rewrite (-> backend service) both work, which also means the
// cookies are sent automatically. Labs are open during development, with no sign-in: the backend
// owns a lab session by account session cookie if there is one, else by a guest cookie it sets
// itself (`resolve_visitor_id`). Nothing here needs to know which.
// TOKEN_KEY is the legacy demo bearer token, still accepted by the backend as a fallback.
const TOKEN_KEY = 'it_fund_access_token';

async function labRequest(path, { method = 'GET', body } = {}) {
  const token = (() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  })();
  const res = await fetch(`/api/labs${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
  start: (labId) => labRequest(`/${labId}/start`, { method: 'POST' }),
  getSession: (id) => labRequest(`/sessions/${id}`),
  recordFindings: (id, findings) => labRequest(`/sessions/${id}/findings`, { method: 'POST', body: { findings } }),
  exec: (id, command) => labRequest(`/sessions/${id}/exec`, { method: 'POST', body: { command } }),
  validate: (id) => labRequest(`/sessions/${id}/validate`, { method: 'POST' }),
  reset: (id) => labRequest(`/sessions/${id}/reset`, { method: 'POST' }),
  destroy: (id) => labRequest(`/sessions/${id}`, { method: 'DELETE' }),
};
