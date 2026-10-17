// Native (Capacitor iOS/Android) integration. Everything here is a no-op on the website.
//
// Why it exists: the bundled app runs on https://localhost (Android) / capacitor://localhost (iOS)
// and calls api.road2cissp.com cross-site, so the API's cookies never reach it, and Google refuses
// OAuth inside embedded WebViews. So in the apps:
//   - sign-in runs in the system browser and comes back through a deep link with a one-time code,
//     redeemed with a PKCE verifier for a session token (backend/auth/native.py);
//   - every API request carries that token as `Authorization: Bearer`, plus a stable guest id
//     (`X-RTC-Guest`) so labs can tell this visitor apart without the guest cookie.

export const NATIVE_REDIRECT = 'com.road2cissp.app://auth/callback';
const TOKEN_KEY = 'rtc_native_token';
const GUEST_KEY = 'rtc_native_guest';
const VERIFIER_KEY = 'rtc_native_pkce';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const isNative = () => !!globalThis.Capacitor?.isNativePlatform?.();
export const nativePlatform = () => (isNative() ? globalThis.Capacitor.getPlatform() : 'web');

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

export const getNativeToken = () => store.get(TOKEN_KEY);
export const clearNativeToken = () => store.del(TOKEN_KEY);

// ---------- PKCE (RFC 7636, S256) ----------

const b64url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function makeVerifier() {
  return b64url(crypto.getRandomValues(new Uint8Array(48))); // 64 chars, within 43-128
}

export async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

// ---------- Request headers ----------

function guestId() {
  let id = store.get(GUEST_KEY);
  if (!id) {
    id = b64url(crypto.getRandomValues(new Uint8Array(24)));
    store.set(GUEST_KEY, id);
  }
  return id;
}

/** Headers the API needs from the app, for a request to `url`; empty for anything else. */
export function nativeHeadersFor(url, { apiBase = API_BASE, token = getNativeToken(), guest = guestId } = {}) {
  if (!/^https?:\/\//.test(apiBase) || typeof url !== 'string' || !url.startsWith(apiBase)) return {};
  const headers = { 'X-RTC-Guest': guest() };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Wrap fetch so every API call from the app carries its credentials. Call once at startup. */
export function installNativeFetch() {
  if (!isNative() || globalThis.fetch.__rtcNative) return;
  const original = globalThis.fetch.bind(globalThis);
  const wrapped = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    const extra = nativeHeadersFor(url);
    if (!Object.keys(extra).length) return original(input, init);
    const headers = new Headers(init.headers || (typeof input === 'string' ? undefined : input.headers));
    for (const [k, v] of Object.entries(extra)) if (!headers.has(k)) headers.set(k, v);
    return original(input, { ...init, headers });
  };
  wrapped.__rtcNative = true;
  globalThis.fetch = wrapped;
}

// ---------- Sign-in ----------

export async function nativeSignIn(provider) {
  const { Browser } = await import('@capacitor/browser');
  const verifier = makeVerifier();
  store.set(VERIFIER_KEY, verifier);
  const challenge = await challengeFor(verifier);
  const url = `${API_BASE}/auth/${provider}/login?client=native&code_challenge=${challenge}`;
  await Browser.open({ url, presentationStyle: 'popover' });
}

/**
 * Handle a deep link. Returns 'signed-in', 'error' or null (not ours).
 * Exchanges the one-time code for a session token and stores it.
 */
export async function handleNativeAuthUrl(rawUrl, fetchImpl = globalThis.fetch) {
  if (!rawUrl?.startsWith(NATIVE_REDIRECT)) return null;
  // The in-app browser may already be gone (iOS dismisses it on redirect); that's fine.
  try { await (await import('@capacitor/browser')).Browser.close(); } catch { /* already closed */ }
  const params = new URL(rawUrl.replace(/^[^:]+:\/\//, 'https://x/')).searchParams;
  const code = params.get('code');
  const verifier = store.get(VERIFIER_KEY);
  store.del(VERIFIER_KEY);
  if (!code || !verifier) return 'error';
  try {
    const res = await fetchImpl(`${API_BASE}/auth/native/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier }),
    });
    if (!res.ok) return 'error';
    store.set(TOKEN_KEY, (await res.json()).token);
    return 'signed-in';
  } catch {
    return 'error';
  }
}

// ---------- App shell: deep links, back button, status bar, splash ----------

/** Wire native-only behaviour. `onAuth(result)` runs after a sign-in deep link. */
export async function initNativeShell({ onAuth }) {
  if (!isNative()) return () => {};
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ]);

  const subs = [];
  subs.push(await App.addListener('appUrlOpen', async ({ url }) => {
    const result = await handleNativeAuthUrl(url);
    if (result) onAuth?.(result);
  }));

  // Android hardware back: go back in the app, and only leave it from the first screen.
  subs.push(await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  }));

  // Light app: dark status-bar icons on a white bar.
  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (nativePlatform() === 'android') await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
  } catch { /* not supported on this platform */ }

  try { await SplashScreen.hide(); } catch { /* already hidden */ }

  // If the app was cold-started by the sign-in deep link, handle it now.
  try {
    const launch = await App.getLaunchUrl();
    if (launch?.url) {
      const result = await handleNativeAuthUrl(launch.url);
      if (result) onAuth?.(result);
    }
  } catch { /* no launch url */ }

  return () => subs.forEach((s) => s.remove());
}
