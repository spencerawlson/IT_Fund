// Client for the Cyber Missions backend (backend/missions, also mounted under
// /api/missions/*). Mirrors src/api/labs.js: same base, same bearer fallback,
// credentials:include so the attempt stays on the backend that owns the
// account session cookie.
const TOKEN_KEY = 'it_fund_access_token';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function missionRequest(path, { method = 'GET', body } = {}) {
  const token = (() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  })();
  const res = await fetch(`${API_BASE}/missions${path}`, {
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

export const missionsApi = {
  listDefinitions: () => missionRequest('/definitions'),
  getMission: (id) => missionRequest(`/${id}`),
  start: (id) => missionRequest(`/${id}/start`, { method: 'POST' }),
  getAttempt: (id) => missionRequest(`/attempts/${id}`),
  action: (id, body) => missionRequest(`/attempts/${id}/action`, { method: 'POST', body }),
  complete: (id) => missionRequest(`/attempts/${id}/complete`, { method: 'POST' }),
  history: () => missionRequest('/history'),
};
