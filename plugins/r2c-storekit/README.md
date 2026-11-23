# r2c-storekit — StoreKit 2 Capacitor plugin (hand-written, no SDK)

App Store Guideline 3.1.1: the iOS app sells the subscription through
Apple's in-app purchase instead of Stripe Checkout. This plugin is the
native half; the web half is `src/lib/iap.js` and the server half is
`backend/iap.py` (+ `backend/iap_routes.py`). Full design + App Store
Connect steps: `docs/IAP.md`.

## Why hand-written instead of a community plugin

- The maintained Capacitor purchase plugins wrap RevenueCat (a paid
  subscription-management SDK) or are Cordova-era plugins with their own
  JS API and update cadence. Spencer decided StoreKit 2 direct, no
  RevenueCat, no paid SDK — so the plugin is ~250 lines of Swift that the
  repo owns outright, with a JS interface designed for this app's flow
  (verify-then-finish, transaction-update forwarding).
- The interface is mockable: `src/lib/iap.js` takes the plugin as a
  constructor argument (`createIapClient`), so the whole web layer is
  tested with a fake. The Swift itself can only be exercised on a device
  or Simulator (no Mac in the sandbox).

## Methods (Swift: `ios/Sources/R2CStoreKit/R2CStoreKitPlugin.swift`)

| Method | What it does |
| --- | --- |
| `getProducts({ productIds })` | `Product.products(for:)` — the App Store is the source of truth for whether the products exist yet. Empty list = not configured. |
| `purchase({ productId })` | StoreKit 2 purchase. Resolves `{ state: 'purchased', transactionId, originalTransactionId, productId, signedTransaction }`, `{ state: 'cancelled' }`, or `{ state: 'pending' }` (Ask to Buy). Does NOT finish the transaction. |
| `getCurrentEntitlements()` | `Transaction.currentEntitlements` (verified only) — restore purchases + launch sync. |
| `finishTransaction({ transactionId })` | Finishes the transaction in `Transaction.unfinished`. Idempotent. |
| `showManageSubscriptions()` | `AppStore.showManageSubscriptions(in:)` — the system sheet. |
| event `transactionUpdate` | `Transaction.updates` listener — verified transactions only, forwarded as `{ transactionId, originalTransactionId, productId, signedTransaction }`. |

## Wiring

- Root `package.json` depends on `"r2c-storekit": "file:./plugins/r2c-storekit"`.
- `npx cap sync ios` picks the plugin up from `node_modules` (the
  `capacitor.ios.src` key) and adds it to `ios/App/CapApp-SPM/Package.swift`.
  The SPM package/product name is `R2cStorekit` — the name Capacitor
  derives from the npm name `r2c-storekit` — so the `Package.swift` in
  this folder declares exactly that name (SPM is case-sensitive).
- The Swift compiles on the mobile.yml iOS Simulator build (runs on push
  to main when `ios/**` or `package.json` change) — that build is the
  compile check for this file.
