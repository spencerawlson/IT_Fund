# In-app purchases (App Store Guideline 3.1.1)

The iOS app sells the subscription through Apple's in-app purchase
(StoreKit 2, direct — no RevenueCat, no paid SDK). The website keeps
Stripe Checkout. Android keeps Stripe until Play Billing lands (separate
job — the gating in `src/lib/iap.js` is iOS-only on purpose).

## Decision record

| Decision | Choice | Why |
| --- | --- | --- |
| D1 | Full IAP, StoreKit 2 direct | Spencer, 2026-11-23. No RevenueCat, no other paid/subscription-management SDK. |
| Plugin | Hand-written Capacitor plugin (`plugins/r2c-storekit/`) | The maintained Capacitor purchase plugins wrap RevenueCat or are Cordova-era. A ~250-line Swift plugin the repo owns is smaller, has no tracking, and exposes exactly this app's flow (verify-then-finish, transaction-update forwarding). See `plugins/r2c-storekit/README.md`. |
| D4 | Prices mirror the web ($29/mo, $250/yr) | Spencer, 2026-11-23. Apple price tiers may not hit those exact amounts in every currency — the nearest tier per currency is accepted. The App Store price is what the user sees (the plugin returns `displayPrice`); the Stripe price is the fallback display only. |
| D5 | Universal (iPhone + iPad) | Spencer, 2026-11-23. No iPad-specific IAP code — StoreKit is the same on both. |
| D6 | Small Business Program | DEFERRED by Spencer, 2026-11-23 ("Doing it later"). 15% vs 30% — enroll before the first IAP sale for the best effect; sales before the effective date are at 30%. |
| Sources of truth | One `subscriptions` row, `provider` = "stripe" \| "apple" | No parallel subscription table. Stripe (webhook) and Apple (verified JWS / server notifications) both write the same row; the row's `provider` says which one last wrote it, and the entitlement check is provider-agnostic (status + period end). |

## Product IDs (one place per side)

| Plan | Product ID |
| --- | --- |
| Monthly | `com.road2cissp.app.premium.monthly` |
| Annual | `com.road2cissp.app.premium.yearly` |

- App: `src/lib/iap.js` (`IAP_PRODUCT_IDS`). The native plugin takes the
  IDs as a parameter — never hard-coded in Swift.
- Backend: `backend/iap.py` (`IAP_PRODUCTS`, product ID -> plan name).
- App Store Connect: create both products with exactly these IDs, in ONE
  subscription group (so a monthly subscriber can upgrade to yearly
  inside the group).

## How a purchase flows

1. The app asks the App Store for the two products (`getProducts`). The
   App Store is the source of truth for whether the products exist yet —
   an empty list means "not configured in App Store Connect", and the buy
   buttons hide (the same pattern as Sign in with Apple hiding its button
   while unconfigured). Nothing breaks before the products exist.
2. The user taps Subscribe; StoreKit shows the system purchase sheet.
   On success the plugin returns the signed transaction JWS
   (`jwsRepresentation`) — it does NOT finish the transaction.
3. The web layer posts the JWS to `POST /api/iap/verify`. The backend
   verifies it (below) and grants the entitlement in the `subscriptions`
   row. Only then is the transaction finished (`finishTransaction`).
   That order is what makes a purchase survive an app kill mid-flight:
   an unfinished transaction is re-delivered by StoreKit on next launch,
   and the launch sync (`initIap` in `src/main.jsx`, via
   `getCurrentEntitlements`) verifies and finishes it then.
4. Renewals, Ask to Buy approvals, and purchases finished on another
   device arrive through the plugin's `Transaction.updates` listener
   (`transactionUpdate` event), which posts each JWS to the backend and
   finishes it the same way. This is also the restore-purchases path.
5. `POST /api/iap/notifications` (App Store Server Notifications V2)
   keeps the row current server-side when the app is not open: renew,
   expire, refund, revoke, grace period.

## Server-side verification (backend/iap.py)

No App Store Connect API key, no server-to-server calls to Apple, no
secret. The JWS itself is the proof:

1. Header must be ES256 with an `x5c` chain of exactly three
   certificates (leaf, intermediate, root).
2. The chain is verified with `cryptography`: leaf issued by
   intermediate, intermediate by root, root self-signed; the leaf
   carries OID `1.2.840.113635.100.6.11.1` and the intermediate
   `1.2.840.113635.100.6.2.1` (the OIDs Apple's server libraries check);
   certificates must have been valid at the transaction's `signedDate`
   (Apple's leaf certificates are short-lived).
3. The chain's root fingerprint must equal the pinned Apple Root CA - G3
   SHA-256 (`63343abf…3e9179`, published at
   https://www.apple.com/certificateauthority/AppleRootCA-G3.cer). The
   root certificate is bundled at `backend/iap_apple_root_ca_g3.cer`
   (a public root certificate, not a secret) and fingerprint-checked at
   import — without the pin, anyone could mint a self-signed "Apple Root
   CA - G3" and forge transactions.
4. The JWS signature is verified with the leaf's public key (ES256,
   via joserfc; the header limit is raised to 8192 bytes because the
   x5c chain makes Apple's headers ~3–4 KB).
5. Claims: `bundleId` must be `com.road2cissp.app` (or `IAP_BUNDLE_ID`),
   `productId` must be one of the two products, `type` must be
   `Auto-Renewable Subscription`, `transactionId` /
   `originalTransactionId` / `expiresDate` must be present.
6. Both environments are accepted: Sandbox (TestFlight / sandbox
   testers) and Production. The bundle-ID check is the security
   boundary; a sandbox tester is a real tester.

Entitlement from a verified transaction (`apply_transaction`):

- Unexpired, unrevoked → `active` until `expiresDate`.
- `revocationDate` present (refund / revoke) → `canceled` at that date.
- Expired → `expired`.
- Billing grace period (`signedRenewalInfo.gracePeriodExpiresDate`,
  only visible in server notifications) → `active` until the grace
  expiry instead of cutting access at `expiresDate`.
- Deliveries are idempotent, and a stale transaction (expiry at or
  before the row's current period end, while the row already grants
  access) is skipped — a late retried renewal cannot roll the row
  backwards, and an Apple transaction that predates a live Stripe
  subscription cannot flip the provider away from it.

Notifications (`handle_notification`) are idempotent on
`notificationUUID` (Apple retries deliveries) and recorded in
`processed_apple_notifications`. A notification for an original
transaction no account has linked yet is recorded and acknowledged;
the app's launch sync links it when the user next opens the app.

## What the UI does per provider

`/billing/status` returns `provider` ("stripe" | "apple" | "manual" |
null) and `plan` ("monthly" | "annual" for Apple rows). The pages read
it from `useSubscription()`:

- Pricing (iOS): Stripe checkout buttons are replaced by the App Store
  purchase; prices come from the App Store products; the refund line
  says Apple handles refunds (reportaproblem.apple.com); the footer
  says "Billed through the App Store". Until the products exist, both
  cards are disabled with "Subscriptions are being set up in the App
  Store". The page stays informational — no purchase button, no external
  purchase link.
- SignIn account page (iOS): the free-tier Subscribe button buys
  through the App Store; "Manage subscription" opens the system
  manage-subscriptions sheet for Apple subscribers and the Stripe
  portal for Stripe subscribers. On the website an Apple subscriber
  sees where to manage instead (iOS Settings) — the Stripe portal is
  never opened for them, because it would be empty.
- Terms: App Store purchases are refunded by Apple (carve-out, G15);
  cancelling an App Store subscription happens in iOS Settings; a
  failed App Store renewal is retried by Apple (grace period), not by
  the 7-day Stripe past-due rule.
- Privacy: unchanged. The backend stores subscription status (provider,
  product, expiry) — the same class of data it already stored for
  Stripe. Apple handles the payment; no payment details reach us.

Account deletion (Guideline 5.1.1(v), PR #188): there is no server-side
way to cancel an Apple subscription, so deletion does NOT refuse while
one is active — refusing would block deletion until the paid period
ends, because cancelling in Settings leaves the subscription active
until expiry. The delete marks the row canceled, so nothing can
resurrect it, and the UI tells iOS users to cancel in Settings first so
Apple does not charge them again after the account is gone.

## App Store Connect steps (Spencer — before IAP can go live)

1. **Create the app record** if it is not there yet (bundle ID
   `com.road2cissp.app`).
2. **Subscription group + two products**: in App Store Connect, create
   one subscription group, then two auto-renewable subscriptions with
   the product IDs above. Monthly: $29-equivalent tier; Annual:
   $250-equivalent tier (nearest tier per currency). Add the
   subscription's localised display name + description (EN + FR — the
   app is EN/FR).
3. **App Store Server Notifications URL**: set to
   `https://api.road2cissp.com/api/iap/notifications` (Production) and
   the sandbox URL to the same endpoint (Sandbox notifications go to
   the same URL — the backend accepts both environments). Send a test
   notification from App Store Connect and check the backend logs for
   the `Apple notification ... processed` line.
4. **(Optional, recommended) Small Business Program**: enroll at
   developer.apple.com/app-store/small-business-program/enroll/ before
   the first sale (15% instead of 30%; review can take over a month;
   the 15% rate takes effect 15 days after the end of the fiscal month
   of approval).
5. **Sandbox tester**: create a sandbox Apple ID in App Store Connect
   (Users and Access → Sandbox Testers) for device testing — real
   purchases must never be tested with a real Apple ID.
6. **Deploy the backend** (pull + restart on FedServ — the migration
   `d9ec1c32ea1b` adds the Apple columns + the notifications table)
   and let the frontend deploy on Vercel. The IAP UI hides itself
   until step 2 is done, so deploying before the products exist is
   safe.

## What can only be tested on a real device / Simulator

- The Swift plugin does not compile in the sandbox (no Mac, no Xcode).
  The compile check is the mobile.yml iOS Simulator build, which runs
  on push to main when `ios/**` or `package.json` change — confirm it
  is green after merge, before any device testing.
- A real StoreKit purchase (purchase sheet, sandbox account, renewals,
  Ask to Buy, restore, the manage-subscriptions sheet) needs a
  Simulator or a device with the sandbox tester from step 5, and the
  products from step 2. In the Simulator, StoreKit transactions are
  sandbox transactions; the backend accepts them (see "both
  environments" above) and the App Store sandbox renews subscriptions
  on an accelerated schedule, so a renewal can be observed in minutes.
- The App Store Server Notifications test notification (step 3) is the
  only way to prove the notifications endpoint end to end before a
  real purchase.
- Everything else is covered by tests: `backend/test_iap.py` (38 tests:
  JWS verification incl. wrong bundle/product/expired cert/bad
  signature/wrong root, grant/renew/duplicate/stale/expired/revoked/
  grace, notifications incl. duplicate UUID, the endpoints, Stripe
  coexistence, account deletion) and the frontend IAP tests
  (`src/lib/iap.test.js`, Pricing/SignIn IAP cases).
