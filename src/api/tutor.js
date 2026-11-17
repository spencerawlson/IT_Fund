import { friendlyErrorMessage, isNetworkError } from '@/lib/errors';
// Client for the backend AI tutor (backend/ai_tutor.py). The OpenAI key never reaches the browser.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const NETWORK_MESSAGE = 'The tutor couldn’t be reached. Check your connection and try again.';

export async function fetchTutorStatus() {
  let res;
  try {
    res = await fetch(`${API_BASE}/ai/status`);
  } catch {
    // A fetch that never reaches the server (offline, refused connection,
    // WebKit CORS/pool failure on an intercepted call) is the same as "off"
    // — never let it reject, or the failure surfaces as an uncaught error
    // on every page that shows the tutor button.
    return { enabled: false };
  }
  const type = res.headers.get('content-type') || '';
  // A static host without the backend answers with index.html; treat that as "off".
  if (!res.ok || !type.includes('application/json')) return { enabled: false };
  return res.json();
}

/**
 * Streams a tutor answer. Calls onToken(text) for each chunk and resolves with the full text.
 * Throws an Error with a learner-friendly message on failure. A fetch that never reaches the
 * server rejects with a bare TypeError("Failed to fetch") — that text used to reach the lesson
 * panel verbatim on a transient first tap (2026-11-16 live report), so it is mapped here;
 * an abort is rethrown untouched (the caller treats it as a cancel, not an error).
 */
export async function streamTutor(body, { onToken, signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/ai/tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // session cookie: the tutor requires a signed-in learner
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error(friendlyErrorMessage(e, { network: NETWORK_MESSAGE, fallback: 'The tutor couldn’t answer. Please try again.' }));
  }
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
  try {
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
  } catch (e) {
    // A mid-stream drop rejects the reader with the same bare TypeError;
    // a server-sent error (data.error) is already meaningful and passes through.
    if (isNetworkError(e)) {
      throw new Error(friendlyErrorMessage(e, { network: NETWORK_MESSAGE, fallback: 'The tutor couldn’t answer. Please try again.' }));
    }
    throw e;
  }
  return full;
}
