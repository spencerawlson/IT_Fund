// Offline-first ProgressAdapter backed by the server. localStorage stays the working copy, so the
// app is instant and works offline; writes are debounced and pushed to the server, and a version
// conflict (another device saved first) triggers fetch -> merge -> retry. On sign-in, call sync()
// once to pull the server copy and merge it with local progress so nothing is lost.
import { progressApi } from '@/api/progress';
import { localStorageAdapter } from './storage';
import { mergeProgress } from './merge';

const MAX_RETRIES = 3;

export function serverAdapter({ key = 'itfund-academy-v1', base, client = progressApi, debounceMs = 2000 } = {}) {
  const local = base || localStorageAdapter(key);
  const listeners = new Set();
  let version = 0;
  let timer = null;
  let dirty = false;

  const notify = () => listeners.forEach((fn) => fn());

  async function push(state, attempt = 0) {
    try {
      const { version: v } = await client.put(state, version);
      version = v;
      return true;
    } catch (e) {
      if (e.status === 409 && attempt < MAX_RETRIES) {
        // Someone else wrote first. Merge their copy with ours and try again.
        const server = e.server || (await client.get());
        version = server.version;
        const merged = mergeProgress(local.load() || {}, server.state || {});
        local.save(merged);
        notify();
        return push(merged, attempt + 1);
      }
      // Network error or retries exhausted: keep the local copy; next save() retries.
      return false;
    }
  }

  return {
    load() {
      return local.load();
    },

    save(state) {
      local.save(state); // instant, offline-safe
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        dirty = false;
        push(state);
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

    /** Pull server progress and merge it into local. Call once after sign-in. */
    async sync() {
      const { state: serverState, version: v } = await client.get();
      version = v;
      const localState = local.load();
      if (localState && Object.keys(localState).length) {
        const merged = mergeProgress(localState, serverState || {});
        local.save(merged);
        notify();
        await push(merged); // upload the merged result, advancing the version
      } else {
        local.save(serverState || {});
        notify();
      }
    },

    /** Force any pending debounced write immediately (e.g. on tab hide). */
    async flush() {
      if (!dirty) return;
      clearTimeout(timer);
      dirty = false;
      await push(local.load());
    },
  };
}
