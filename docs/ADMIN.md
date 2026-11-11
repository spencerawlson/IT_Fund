# Admin panel — Road to CISSP

Spencer-only, password-gated, browser-only. No link to it exists anywhere in
the normal navigation, and the AppShell never renders it.

## URL

`/admin` — a standalone route outside the AppShell (focus mode, like the lab
workspace). It is client-rendered and is NOT in `public/sitemap.xml`, so it is
never prerendered or linked from any prerendered page.

## Auth

- Env var: `ADMIN_PASSWORD` (name only — never commit a value).
- `POST /admin/login` with `{"password": "..."}` sets a short-lived HttpOnly
  session cookie (`rtc_admin`, 24h, sliding). Wrong password — or an unset
  `ADMIN_PASSWORD` — returns a generic 401 `Invalid password` with no hint.
- No admin accounts, no sign-up, no password reset. To change the password,
  change the env var and restart the backend.
- Brute-force protection: 5 failed logins per IP in 15 minutes, then every
  further attempt (correct password included) gets 429 with `Retry-After`
  until the window passes. Failed attempts are logged with IP + timestamp,
  never the password.
- Every `/admin/*` endpoint except login/status requires the session, including
  when called directly (curl, another origin). A normal learner session is NOT
  an admin session.

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

## Setup after a push

1. Set `ADMIN_PASSWORD` in the backend environment (host env vars, or
   `backend/.env` for local dev — never commit the file).
2. Restart the backend (uvicorn). In production the new migration
   (`f7a3c9d21e84`, admin_sessions + ai_tutor_calls tables) applies at startup.
3. Open `/admin` in a browser, enter the password.

## Files

- `backend/admin.py` — router (`/admin`, also mounted under `/api`).
- `backend/db_models.py` — `AdminSession`, `AiTutorCall`.
- `backend/ai_tutor.py` — `MODEL_PRICES`, `cost_usd()`, `_log_call()` (logs
  every call that passes auth + rate limiting, including cached and errored).
- `backend/alembic/versions/f7a3c9d21e84_add_admin_sessions_ai_tutor_calls.py`
- `src/pages/admin/Admin.jsx`, `src/api/admin.js` — the panel (no nav links).
- `backend/test_admin.py`, `src/pages/admin/Admin.test.jsx`.
