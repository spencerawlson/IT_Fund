// Migrating adapter (PR 3: compatibility layer).
//
// Wraps any ProgressAdapter (usually the localStorage adapter) and translates
// legacy (positional) card ids to UUIDs on load, using the map built from the
// current public bundle. When anything was translated, the translated state
// is persisted back to the wrapped adapter immediately (write-back on first
// load) and listeners are notified exactly once. The write-back never pushes
// by itself — it only writes to local storage; the server push is driven by
// serverAdapter.save() / flush() / the retry ladder as before.
//
// Translation also runs on save(), so storage is always UUID-only: a merge
// that combined a legacy server copy with a UUID local copy (e.g. sync()
// against an old backend) can never persist — or push — a mixed-scheme state.
import { translateState, buildCardIdMap } from './migrateCardIds';

export function migratingAdapter(base, idMap = buildCardIdMap()) {
  const listeners = new Set();
  const notify = (state) => listeners.forEach((fn) => fn(state));

  function load() {
    const raw = base.load();
    if (!raw || typeof raw !== 'object') return raw;
    const { state, translated } = translateState(raw, idMap);
    if (translated) {
      base.save(state); // write-back on first load
      notify(state);
    }
    return state;
  }

  function save(state) {
    if (!state || typeof state !== 'object') {
      base.save(state);
      return;
    }
    const { state: translatedState } = translateState(state, idMap);
    base.save(translatedState);
  }

  return {
    load,
    save,

    onExternalChange(cb) {
      listeners.add(cb);
      const offBase = base.onExternalChange(cb);
      return () => {
        listeners.delete(cb);
        offBase();
      };
    },
  };
}
