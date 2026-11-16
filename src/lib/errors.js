// Learner-facing error text for failed network calls.
//
// A fetch that never reaches the server (offline, DNS, a deploy window)
// rejects with a bare TypeError("Failed to fetch") — meaningless to a
// learner, and it used to leak verbatim into the mission terminal page's
// error banner and the tutor panel (2026-11-16 live report). Map it to a
// plain-language message; every other error keeps its own message, and a
// caller-supplied fallback covers errors with no message at all.
export function isNetworkError(err) {
  return !!err && (err.name === 'TypeError' || err.message === 'Failed to fetch');
}

export function friendlyErrorMessage(err, {
  network = 'Could not reach the server — check your connection and try again.',
  fallback = 'Something went wrong. Please try again.',
} = {}) {
  if (isNetworkError(err)) return network;
  if (err && typeof err.message === 'string' && err.message) return err.message;
  return fallback;
}
