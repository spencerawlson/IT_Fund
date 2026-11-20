// Offline-first ProgressAdapter backed by the server. localStorage stays the working copy, so the
// app is instant and works offline; writes are debounced and pushed to the server, and a version
// conflict (another device saved first) triggers fetch -> merge -> retry. On sign-in, call sync()
// once to pull the server copy and merge it with local progress so nothing is lost.
//
// A failed push is never silently dropped (PR 1: progress integrity). A `pending` flag is set on
// save() and cleared only when a push succeeds; on failure a retry timer re-attempts the latest
// local state on a backoff ladder (5 s, 15 s, 30 s, capped at 60 s, with jitter), a browser
// `online` event retries immediately, and flush() pushes whenever anything is pending. A failed
// sync() leaves the adapter pending so the retry ladder re-attempts the sync; the local copy is
// never discarded on sync failure.
import { progressApi } from '@/api/progress';
import { localStorageAdapter } from './storage';
import { mergeProgress } from './merge';

const MAX_RETRIES = 3;
// Backoff ladder for a failed push/sync (5 s, 15 s, 30 s, then 60 s, with jitter).
const RETRY_DELAYS = [5000, 15000, 30000, 60000];

export function serverAdapter({ key = 'itfund-academy-v1', base, client = progressApi, debounceMs = 2000 } = {}) {
  const local = base || localStorageAdapter(key);
  const listeners = new Set();
  let version = 0;
  let timer = null;
  let retryTimer = null;
  let retryStep = 0;
  let pending = false;
  let pendingSync = false;
  let retrying = false;

  const notify = () => listeners.forEach((fn) => fn());

  function jittered(ms) {
    return ms * (0.8 + Math.random() * 0.4);
  }

  function clearRetryTimer() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function scheduleRetry() {
    clearRetryTimer();
    const delay = RETRY_DELAYS[Math.min(retryStep, RETRY_DELAYS.length - 1)];
    retryStep += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      attemptRetry();
    }, jittered(delay));
  }

  /** A push landed: nothing is pending any more. */
  function markClean() {
    pending = false;
    pendingSync = false;
    retryStep = 0;
    clearRetryTimer();
  }

  /** A push failed: the work stays pending and a retry is scheduled. */
  function markPending() {
    pending = true;
    scheduleRetry();
  }

  async function attemptRetry() {
    if (!pending || retrying) return;
    retrying = true;
    try {
      if (pendingSync) {
        try {
          await sync();
        } catch {
          // sync() already scheduled the next retry on a get failure.
        }
      } else {
        // Re-attempt the latest local state, not a stale snapshot.
        await push(local.load());
      }
    } finally {
      retrying = false;
    }
  }

  function handleOnline() {
    if (pending) attemptRetry();
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('online', handleOnline);
  }

  async function push(state, attempt = 0) {
    try {
      const { version: v } = await client.put(state, version);
      version = v;
      markClean();
      return true;
    } catch (e) {
      if (e.status === 409 && attempt < MAX_RETRIES) {
        // Someone else wrote first. Merge their copy with ours and try again.
        let server;
        try {
          server = e.server || (await client.get());
        } catch {
          markPending();
          return false;
        }
        version = server.version;
        const merged = mergeProgress(local.load() || {}, server.state || {});
        local.save(merged);
        notify();
        return push(merged, attempt + 1);
      }
      // Network error or retries exhausted: keep the local copy and the
      // pending flag; the retry ladder re-attempts the latest local state.
      markPending();
      return false;
    }
  }

  /** Pull server progress and merge it into local. Call once after sign-in. */
  async function sync() {
    let serverState;
    let v;
    try {
      ({ state: serverState, version: v } = await client.get());
    } catch (e) {
      // Sync failed: keep the local copy untouched and retry the sync later.
      pending = true;
      pendingSync = true;
      scheduleRetry();
      throw e;
    }
    version = v;
    const localState = local.load();
    if (localState && Object.keys(localState).length) {
      const merged = mergeProgress(localState, serverState || {});
      local.save(merged);
      notify();
      const ok = await push(merged); // upload the merged result, advancing the version
      // push() already scheduled a retry if the upload failed; the pending
      // work is now a plain push of the latest local state, not a re-sync.
      if (!ok) pendingSync = false;
    } else {
      local.save(serverState || {});
      notify();
      markClean();
    }
  }

  return {
    load() {
      return local.load();
    },

    save(state) {
      local.save(state); // instant, offline-safe
      pending = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        push(local.load());
      }, debounceMs);
    },

    onExternalChange(cb) {
      listeners.add(cb);
      const offBase = local.onExternalChange(cb);
      return () => {
        listeners.delete(cb);
        offBase();
      };
    },

    sync,

    /** Force any pending debounced write immediately (e.g. on tab hide). */
    async flush() {
      if (!pending) return false;
      clearTimeout(timer);
      return push(local.load());
    },
  };
}
