// Client for the server-side progress API (backend/progress_api.py). Same-origin (via the /api
// dev proxy and the Vercel rewrite), so the session cookie is sent automatically. A 409 carries the
// server's current copy so the caller can merge without a second request.
async function req(method, body, version) {
  const res = await fetch('/api/academy/progress', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(version != null ? { 'If-Match': String(version) } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, ok: res.ok, data };
}

export const progressApi = {
  async get() {
    const { ok, status, data } = await req('GET');
    if (!ok) throw Object.assign(new Error(`progress get failed (${status})`), { status });
    return data; // { state, version }
  },
  async put(state, version) {
    const { ok, status, data } = await req('PUT', { state }, version);
    if (status === 409) {
      throw Object.assign(new Error('version conflict'), { status: 409, server: data });
    }
    if (!ok) throw Object.assign(new Error(`progress put failed (${status})`), { status });
    return data; // { version }
  },
};
