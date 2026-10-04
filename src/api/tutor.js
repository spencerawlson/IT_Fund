// Client for the backend AI tutor (backend/ai_tutor.py). The OpenAI key never reaches the browser.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchTutorStatus() {
  const res = await fetch(`${API_BASE}/ai/status`);
  const type = res.headers.get('content-type') || '';
  // A static host without the backend answers with index.html; treat that as "off".
  if (!res.ok || !type.includes('application/json')) return { enabled: false };
  return res.json();
}

/**
 * Streams a tutor answer. Calls onToken(text) for each chunk and resolves with the full text.
 * Throws an Error with a learner-friendly message on failure.
 */
export async function streamTutor(body, { onToken, signal } = {}) {
  const res = await fetch(`${API_BASE}/ai/tutor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // session cookie: the tutor requires a signed-in learner
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json()).detail;
    } catch {
      // non-JSON error body
    }
    const message =
      res.status === 401
        ? 'Sign in to use the AI tutor.'
        : res.status === 429
        ? 'You’ve hit the tutor limit for now. Try again a bit later.'
        : res.status === 503
          ? 'The AI tutor isn’t set up on this server.'
          : typeof detail === 'string' && detail
            ? detail
            : 'The tutor couldn’t answer. Please try again.';
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop();
    for (const event of events) {
      const line = event.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      const data = JSON.parse(line.slice(6));
      if (data.error) throw new Error(data.error);
      if (data.t) {
        full += data.t;
        onToken?.(data.t, full);
      }
    }
  }
  return full;
}
