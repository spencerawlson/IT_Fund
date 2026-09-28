// Where learner progress is persisted. The Academy store (src/lib/academy.js) only talks to
// this interface, so moving progress to the server means adding an adapter, not touching pages.
//
//   interface ProgressAdapter {
//     load(): object | null          // synchronous: returns the last known state
//     save(state: object): void      // persist (a server adapter would also queue a PUT)
//     onExternalChange(cb): () => void  // another tab/device changed the state
//   }
//
// Today: localStorageAdapter (per browser). Planned: a server adapter that hydrates from an
// authenticated `/api/academy/progress` endpoint and writes through to it, keeping localStorage
// as an offline cache. That needs real accounts and a database first (see docs/ACADEMY.md).

export function localStorageAdapter(key) {
  return {
    load() {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch {
        return null; // blocked or corrupt storage: start fresh for this session
      }
    },
    save(state) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // Storage full or blocked: the in-memory state still works for this session.
      }
    },
    onExternalChange(cb) {
      const onStorage = (e) => {
        if (e.key === key) cb();
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
}

/** In-memory adapter for tests and non-browser environments. */
export function memoryAdapter(initial = null) {
  let value = initial;
  return {
    load: () => value,
    save: (state) => {
      value = state;
    },
    onExternalChange: () => () => {},
  };
}
