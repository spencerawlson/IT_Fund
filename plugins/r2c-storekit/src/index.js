// JS side of the R2CStoreKit Capacitor plugin (StoreKit 2, hand-written,
// no SDK). Registered under the jsName the Swift plugin declares
// ("R2CStoreKit"). On the web the plugin loads the WebPlugin fallback,
// which reports no products — so the IAP UI hides there and the web keeps
// Stripe. The app never imports this file directly: src/lib/iap.js wraps
// it (and is mockable in tests through createIapClient).
import { registerPlugin } from '@capacitor/core';

const R2CStoreKit = registerPlugin('R2CStoreKit', {
  web: () => import('./web.js').then((m) => new m.R2CStoreKitWeb()),
});

export default R2CStoreKit;
