# Admin panel — Road to CISSP

Spencer-only, browser-only: his own verified Google/GitHub account plus a
code from an authenticator app. No link to it exists anywhere in the normal
navigation, and the AppShell never renders it.

## URL

`/admin` — a standalone route outside the AppShell (focus mode, like the lab
workspace). It is client-rendered and is NOT in `public/sitemap.xml`, so it is
never prerendered or linked from any prerendered page.

## Sign-in (since 2026-11-23 — the shared password is gone)

Code: `backend/admin_auth.py` (rules), `backend/admin.py` (endpoints),
`src/pages/admin/AdminGate.jsx` (screens).

1. **Site account.** Sign in to the site with Google or GitHub (the admin page
   offers the buttons and returns to `/admin` afterwards). Only an account
   whose **provider-verified** email is on the allow-list is eligible:
   `ADMIN_EMAILS` (comma-separated), or `BILLING_OWNER_EMAILS` when that is
   unset. `User.email` alone never counts — the admin panel itself writes it
   for manual enrollments.
2. **Authenticator (TOTP).** First visit: scan the QR code (drawn in the
   browser; also shown as a setup key) and confirm one code. Every later
   sign-in asks for the current 6-digit code. Codes are single-use and
   accepted one 30 s step either side of the clock. The secret is stored
   encrypted (key from `ADMIN_MFA_KEY`, else `SESSION_SECRET` — rotating
   `SESSION_SECRET` therefore requires a re-enrollment).
3. **Admin session.** HttpOnly cookie `rtc_admin`: 30 min idle, 8 h at most;
   ends when the site session ends, when another account signs in to the
   site in that browser, or the moment the account leaves the allow-list.
4. **CSRF.** Every state-changing `/admin/*` request must send
   `X-CSRF-Token` (an HMAC of the admin session, handed to the page in the
   JSON of `/admin/status`, `/admin/login` and `/admin/mfa/activate`).
   Missing or wrong → 403.
5. **Brute force.** 5 wrong codes per IP in 15 minutes → 429 with
   `Retry-After`. Failures are logged with IP + time, never the code.
6. **Audit.** Every admin change is recorded in `admin_audit_log` with the
   admin's own account id as the actor (sign-ins and MFA enrollment too).

**Lost phone / new phone:** on the server,
`cd backend && .venv/bin/python -m admin_auth reset-mfa <your email>`, then
open `/admin` and set the authenticator up again. There is deliberately no web
reset.

## What it shows

- **Overview** — account count, paying subscribers, MRR, AI tutor calls + cost
  (last 30 days).
- **Accounts** — every account: name/email, signup date, last active (latest
  of last session seen / last progress save; "unknown" when neither exists),
  lessons passed (best score ≥ 70%, same bar as the learner UI), labs
  completed, subscription status. Paginated, searchable by name/email.
- **Subscriptions** — stored Stripe state (written only by the Stripe webhook,
  never from client input): status, current period end, Stripe customer id.
  MRR = paying subscribers × the live Stripe price when Stripe is configured;
  "unknown" when it is not. The subscriptions table stores no amount, so no
  per-subscription amount exists to show.
- **AI costs** — every tutor call since logging shipped: calls, prompt +
  completion tokens, cost in USD at OpenAI list prices (`MODEL_PRICES` in
  `backend/ai_tutor.py`, dated 2026-11-08). Totals overall, per day, per user,
  plus the recent-call list. Cached answers cost $0 (no new spend); a call
  with an unlisted model shows its cost as "unknown". **There is no call
  history before this ships** — the log starts when the instrumented backend
  deploys.
- **Manual enrollment** — customers who enroll in person, not through Stripe
  checkout. The board can add a customer (create the account by email and
  grant paid access in one step) or mark an existing account paid. A grant
  is recorded in `manual_grants`, distinctly from Stripe state: it never
  writes the `subscriptions` table, never invents an amount, and it lasts
  until revoked from the board. A granted account counts as subscribed in
  `billing.is_subscribed` — the same check that gates premium content, labs,
  missions, voice and the tutor — and shows status `manual` in
  `GET /billing/status`. The customer signs in later with Google/GitHub; the
  first provider-verified sign-in with that email merges into the
  admin-created account (see `backend/auth/identity.py`). MRR and the
  paying-subscriber count stay Stripe-only: a manual enrollment is access,
  not revenue, so it never inflates them.
- **Report** — a Report tab shows the whole board in one printable view
  (overview, accounts, subscriptions, AI costs), and `GET /admin/report.csv`
  downloads the same data as CSV (one file, one block per section;
  `?section=overview|accounts|subscriptions|ai-costs` for a single block).
  The accounts block is capped at the first 1,000 accounts, and the report
  says so when it truncates.

## Setup after a push

1. Set `ADMIN_EMAILS` (or rely on `BILLING_OWNER_EMAILS`) in the backend environment (host env vars, or
   `backend/.env` for local dev — never commit the file).
2. Restart the backend (uvicorn). In production the new migration
   (`f7a3c9d21e84`, admin_sessions + ai_tutor_calls tables) applies at startup.
3. Open `/admin` in a browser, enter the password.

## Files

- `backend/admin.py` — router (`/admin`, also mounted under `/api`).
- `backend/db_models.py` — `AdminSession`, `AiTutorCall`, `ManualGrant`.
- `backend/ai_tutor.py` — `MODEL_PRICES`, `cost_usd()`, `_log_call()` (logs
  every call that passes auth + rate limiting, including cached and errored).
- `backend/billing.py` — `is_subscribed()` (Stripe row OR active manual
  grant), `has_active_manual_grant()`, `GET /billing/status` (status
  `manual` when only a grant grants access).
- `backend/auth/identity.py` — verified-email auto-merge also matches an
  admin-created account (no identity row yet) on first verified sign-in.
- `backend/alembic/versions/f7a3c9d21e84_add_admin_sessions_ai_tutor_calls.py`
- `backend/alembic/versions/32e3cf2c4fa0_add_manual_grants.py`
- `src/pages/admin/Admin.jsx`, `src/api/admin.js` — the panel (no nav links).
- `backend/test_admin.py`, `src/pages/admin/Admin.test.jsx`.
