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
    // 'never': the SPA already clears the status bar itself in CSS
    // (body padding-top = env(safe-area-inset-top), capped at 60px).
    // 'automatic' made UIKit add the same ~59px as a scroll-view content
    // inset on top, double-counting the safe area — the header sat ~130px
    // down in the native app (59 native + 59 CSS + 12 header padding)
    // while the website, which has no scroll-view inset, was fine.
    // Capacitor's own default is 'never'.
    contentInset: 'never',
  },
  android: {
    // Match the app's white light theme so the WebView never flashes dark.
    backgroundColor: '#FFFFFF',
  },
};

export default config;
