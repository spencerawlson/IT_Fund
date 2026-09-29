// Client for the interactive-lab backend (backend/labs). Uses relative /api paths so the Vite dev
// proxy (-> :8000) and the Vercel rewrite (-> backend service) both work. The bearer token comes
// from the same place AuthContext stores it; labs require a signed-in user.
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
  validate: (id) => labRequest(`/sessions/${id}/validate`, { method: 'POST' }),
  reset: (id) => labRequest(`/sessions/${id}/reset`, { method: 'POST' }),
  destroy: (id) => labRequest(`/sessions/${id}`, { method: 'DELETE' }),
};
