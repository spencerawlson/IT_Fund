import type { CapacitorConfig } from '@capacitor/cli';

// Road to CISSP native shell (Capacitor). The web app in `dist/` (vite build)
// is bundled into the iOS/Android projects under ./ios and ./android,
// which ARE committed to the repo (they hold native config, not secrets).
//
// Building for stores:
//  - iOS (.ipa) requires Xcode on macOS — no Mac here. Use CI: a GitHub
//    Actions `macos-latest` runner or Codemagic. Needs an Apple Developer
//    Program membership ($99/yr) for signing + App Store Connect upload.
//  - Android (.aab) builds anywhere with the Android SDK (CI: ubuntu runner).
//    Google Play one-time $25 developer fee.
// Flow: `vite build` → `npx cap sync` → open ios/App/App.xcworkspace in Xcode
// (or `npx cap open ios` / `npx cap open android`).

const config: CapacitorConfig = {
  appId: 'com.road2cissp.app',
  appName: 'Road to CISSP',
  webDir: 'dist',
  server: {
    // Production API; the web app already reads VITE_API_BASE_URL at build time.
    // (No cleartext HTTP allowed; all traffic stays HTTPS.)
    cleartext: false,
  },
  ios: {
    // Prefer the WKWebView content inset behavior the SPA layout expects.
    contentInset: 'automatic',
  },
  android: {
    // Allow the WebView to use the app's dark theme without flashing white.
    backgroundColor: '#070A12',
  },
};

export default config;
