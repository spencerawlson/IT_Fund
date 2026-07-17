const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002';

async function request(path, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || text;
    } catch {
      // keep raw text
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) {
    return null;
  }
  return res.json();
}

export const api = {
  get: (path, token) => request(path, { method: 'GET' }, token),
  post: (path, body, token) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body)
    }, token),
  put: (path, body, token) =>
    request(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    }, token),
  delete: (path, token) =>
    request(path, { method: 'DELETE' }, token)
};

export const apiWithAuth = (token = localStorage.getItem('it_fund_access_token')) => ({
  get: (path) => api.get(path, token),
  post: (path, body) => api.post(path, body, token),
  put: (path, body) => api.put(path, body, token),
  delete: (path) => api.delete(path, token)
});
