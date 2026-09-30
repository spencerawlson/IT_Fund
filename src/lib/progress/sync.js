// Connects the Academy store to the server when signed in. AuthContext calls enable/disable as the
// session changes, and flush on tab-hide. localStorage remains the working copy either way, so the
// app never blocks on the network.
import { setProgressAdapter } from '@/lib/academy';
import { localStorageAdapter } from './storage';
import { serverAdapter } from './serverAdapter';

const KEY = 'itfund-academy-v1';
let current = null;

/** Switch to the server-backed adapter and merge server progress into local (once, on sign-in). */
export async function enableServerSync() {
  current = serverAdapter({ key: KEY });
  setProgressAdapter(current);
  try {
    await current.sync();
  } catch {
    // Offline or server error: keep working from the local copy; a later save() retries.
  }
}

/** Revert to the plain local adapter (on sign-out). */
export function disableServerSync() {
  current = null;
  setProgressAdapter(localStorageAdapter(KEY));
}

/** Push any pending debounced write immediately (tab hidden / closing). */
export function flushServerSync() {
  return current?.flush?.();
}
