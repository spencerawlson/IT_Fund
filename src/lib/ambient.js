/**
 * Ambient background preference. Default ON; the animation itself is
 * ultra-subtle (240s opacity breath) and disabled entirely under
 * prefers-reduced-motion. Persisted in localStorage; applied as
 * `data-ambient` on <html> so CSS can switch without React re-rendering.
 */
const KEY = 'itfund-ambient-bg';

export function getAmbientEnabled() {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v !== 'off';
  } catch {
    return true;
  }
}

export function setAmbientEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode etc. — the attribute still applies for this session */
  }
  applyAmbientPreference();
}

export function applyAmbientPreference() {
  document.documentElement.dataset.ambient = getAmbientEnabled() ? 'on' : 'off';
}
