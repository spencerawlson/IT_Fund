# C3 — Accounts and Server-Side Progress: Plan

Status: **draft for review** (2026-09-29). Nothing below is built yet.

**Goal:** sign in with Google or GitHub, and have progress follow you across devices. No
passwords and as little personal data as possible. Everything else keeps working without an
account.

---

## 1. Where we are today

| Area | Today | Problem |
|---|---|---|
| Backend | FastAPI, deployed to Vercel as a serverless service (`vercel.json`) | Users, tokens and OTPs live in Python dicts: they vanish on every cold start. |
| Auth endpoints | `/auth/register`, `/auth/login`, OTP and reset-password routes | They run at `/auth/*` while the site routes `/api/*` to the backend. Passwords are stored in plaintext. |
| Sign-in UI | `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx` and `ResetPassword.jsx` exist | None of them is routed. `navigateToLogin()` sends people to `/login`, which is a 404. |
| Sessions | Bearer token stored in `localStorage` | Any XSS bug could steal it. |
| Security issues | `/api/dev/users` is public and lists registered emails; CORS allows any origin with credentials | Both must go before real accounts exist. |
| Progress | `localStorage` via the `ProgressAdapter` in `src/lib/progress/storage.js` | Per-browser only. The adapter seam is already in place, which makes this plan simpler. |

## 2. Decisions needed from you

- **D1. Where the backend and database run.**
  - (a) Keep Vercel and add a managed Postgres, such as Neon's free tier. There are no
    servers to run, and it works with today's deploys. **Recommended for now.**
  - (b) Self-host on your UbuntuServ VM: Postgres plus the FastAPI app behind nginx and
    Cloudflare, like spencerlab.tech. You control everything, but uptime depends on the home
    lab, and you take on backups and patching.

  Your earlier notes say "host it locally for now", while the site currently runs on Vercel.
  The code is the same either way, only the deploy target and connection string differ, so
  choosing (a) now doesn't block (b) later.
- **D2. Is an account required?** Recommended: no. The app stays fully usable without signing
  in, and signing in adds sync across devices. The alternative is to require sign-in to study,
  which adds friction and gains nothing until there's a subscription.
- **D3. What personal data is stored?** Recommended: only the provider's user ID, a display
  name and an avatar URL. **No email address.** That matches your "don't manage personal
  information" goal. Stripe will hold billing emails itself when subscriptions arrive.
- **D4. Using both Google and GitHub.** Recommended: each sign-in method is its own identity,
  and a signed-in user can link the other one from their account page. The riskier alternative
  is automatic merging by matching email: it would require storing emails (conflicting with
  D3) and has caused account-takeover bugs elsewhere.

## 3. What you need to set up (about 15 minutes, only you can do it)

1. **Google.** In Google Cloud Console, create an OAuth client ("Web application"), set the
   authorised redirect URI to `https://<your-domain>/api/auth/google/callback` (plus a
   localhost one for development), and request only the `openid profile` scopes.
2. **GitHub.** Under GitHub Settings → Developer settings → OAuth Apps, create an app with the
   callback URL `https://<your-domain>/api/auth/github/callback`. No scopes are needed: the
   public profile only.
3. **Database.** Create it according to D1 and copy its connection string.
4. **Secrets as environment variables** in Vercel (or on the VM). Never commit them to git:
   `DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `APP_ORIGIN`.

I'll write exact click-by-click steps in `docs/DEPLOY_ACCOUNTS.md` when
we get there.

## 4. Design

### Sign-in flow (OAuth 2.0 authorisation code, done entirely on the server)

```
Browser                         FastAPI                              Google / GitHub
  | click "Continue with Google"  |                                        |
  |------ GET /api/auth/google -->| create state + PKCE verifier (cookie)  |
  |<----- 302 to provider --------|                                        |
  |------------------------------ consent ------------------------------->|
  |<----- 302 /api/auth/google/callback?code&state -----------------------|
  |------ callback -------------->| check state, exchange code (+PKCE) --->|
  |                               |<----------- verified identity ---------|
  |                               | upsert identity, create session row    |
  |<----- 302 to app + Set-Cookie: session (HttpOnly, Secure, SameSite=Lax)|
```

- **Sessions:** a random session ID in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie, with
  only a hash of it stored in the database. JavaScript never sees a token, which closes the
  XSS token-theft risk. Sessions expire after 30 days (sliding); sign-out deletes the row.
- **CSRF:** `SameSite=Lax` plus an `Origin` check, and state-changing requests must send a
  custom header. CORS is locked to `APP_ORIGIN` only.
- **Sign-in libraries:** Authlib, well maintained, with `state` and PKCE handled for us. No
  hand-rolled crypto.

### Data model (Postgres; SQLAlchemy 2 + Alembic migrations)

| Table | Columns | Notes |
|---|---|---|
| `users` | id (uuid), display_name, avatar_url, created_at, deleted_at | No email (D3). |
| `identities` | id, user_id → users, provider (`google`/`github`), provider_subject, created_at | Unique (provider, provider_subject). |
| `sessions` | id_hash (pk), user_id, created_at, expires_at, last_seen_at | The raw ID lives only in the cookie. |
| `progress` | user_id (pk) → users, state (JSONB), version (int), updated_at | One row per user. |

**Storing progress as one JSON document per user** matches today's `itfund-academy-v1` state
exactly, so the client and server share one format.
- **Size limit and validation:** capped at 256 KB and validated against a schema on write.
- **Future split:** it can be split into normalised tables later if we need analytics or
  server-computed scores.

### API

| Method + path | Auth | Purpose |
|---|---|---|
| `GET /api/auth/{google\|github}` | none | Start sign-in. |
| `GET /api/auth/{provider}/callback` | none | Finish sign-in, set the cookie. |
| `POST /api/auth/logout` | session | Delete the session. |
| `GET /api/me` | session | Display name, avatar, linked providers. |
| `GET /api/academy/progress` | session | Returns `{ state, version }`. |
| `PUT /api/academy/progress` | session | Body `{ state }` + header `If-Match: <version>`. Returns 409 if another device saved first. Rate-limited. |
| `GET /api/me/export` | session | Download all your data as JSON. |
| `DELETE /api/me` | session | Delete account and progress (hard delete after 7 days). |

The user always comes from the session cookie, never from the request body or URL, so user A
cannot read or write user B's progress by construction. Tests prove it (Phase C3.3).

### Client sync (`serverAdapter`, implements the existing `ProgressAdapter`)

- **Offline-first.** `localStorage` stays the working copy, so the app is instant and works
  offline. Saves go to `localStorage` immediately and are pushed to the server, debounced
  (about 2 s), with a final flush when the tab is hidden.
- **First sign-in on a device.** Local and server progress are merged by a pure, tested
  `mergeProgress(a, b)`, so nothing already learned is lost:
  - lessons: best score wins
  - cards: the most recently reviewed wins
  - XP: highest wins
  - the most recent resume point
- **Conflicts.** A 409 (another device saved in between) triggers fetch, merge, retry.
- **Other devices.** The app re-fetches when the tab regains focus.
- **Status.** The account menu shows "Synced", "Saving…" or "Offline, will sync".

### UI (kit components; liquid glass unchanged)

- **`/signin` page:** "Continue with Google" and "Continue with GitHub" buttons, a single
  line on what is stored, and a link to a privacy note.
- **Account menu in the shell:** avatar, sync status, account page, sign out. For
  anonymous users it shows a small "Sync your progress" item, never a blocking prompt.
- **Account page:** linked providers, link the other one (D4), export data, delete account.
- **Removed:** the old email/password pages, OTP flow, reset-password flow, and the
  `localStorage` token code.

## 5. Phases (each ends with tests, lint, build, and a short report)

- **C3.0 Set-up (you).** Decisions D1–D4, the OAuth apps and the database (section 3).
- **C3.1 Clean-up and foundation.**
  - Remove `/api/dev/users`, the plaintext-password demo auth and the dead pages.
  - Lock down CORS.
  - Add SQLAlchemy, Alembic and the four tables, plus `/api/health` with a database check.
  - **Exit:** migrations run on an empty database; the backend tests pass.
- **C3.2 Sign-in.**
  - OAuth for both providers, sessions, `/api/me`, sign-out.
  - **Exit:** tests cover state mismatch, a replayed callback, expired sessions and sign-out
    (providers mocked), and a real sign-in works locally with both providers.
- **C3.3 Progress API.**
  - GET/PUT with versioning, size and schema validation, and rate limits.
  - **Exit:** tests prove user A can never read or overwrite user B's progress, stale
    versions get 409, and oversized payloads get 413.
- **C3.4 Client sync.**
  - `serverAdapter`, `mergeProgress` and the first-sign-in import.
  - **Exit:** unit tests for merge rules and conflict retry. In the browser, progress made
    in one browser appears in another after sign-in, and nothing is lost when both had
    progress.
- **C3.5 UI.**
  - Sign-in page, account menu with sync status, account page.
  - **Exit:** screenshots at 360 and 1440px, and an axe audit with 0 violations.
- **C3.6 Privacy and deploy.**
  - Export, delete account, a short privacy note, deployment docs.
  - **Exit:** a production sign-in round-trip on both providers, and a deleted account's data
    is gone.

## 6. Risks and how they're handled

| Risk | Mitigation |
|---|---|
| Progress lost during sync | Offline-first local copy, merge instead of overwrite, and optimistic versioning. Tests cover the merge rules. |
| Session theft | HttpOnly cookie, hashed session IDs, short expiry, sign-out revokes the session. |
| Serverless database connection limits (D1a) | Use the provider's pooled connection string. |
| Home-lab downtime (D1b) | The app keeps working offline and syncs when the server returns. |
| Tampered client scores | Accepted for now: no leaderboards or payments depend on them. Revisit before subscriptions (move scoring server-side). |

---

## Decisions locked (2026-09-29) — supersede §2

- **D1 hosting:** self-host on the UbuntuServ VM (Postgres + FastAPI). Code is DB-agnostic;
  `DATABASE_URL` selects Postgres in prod, SQLite for local dev/tests.
- **D2:** sign-in is optional; the app stays fully usable signed-out.
- **D3 + D4:** store the provider-**verified** email, and auto-merge a Google and GitHub login
  when **both** emails are verified and match. (The draft's no-email option was dropped to make
  auto-merge possible; merging only on verified emails keeps it safe.)

## C3.1 status — done

Security cleanup + database foundation (no OAuth yet):
- **Removed** the public `/api/dev/users` endpoint (it listed registered emails).
- **CORS** locked to `APP_ORIGINS` (comma-separated env; dev defaults) instead of `*`.
- **Database layer:** `backend/db.py` (engine/session, `configure`/`init_db`/`ping`) and
  `backend/db_models.py` (`users`, `identities`, `auth_sessions`, `progress`). Session ids are
  stored only as a hash. Tables auto-create on startup; Alembic replaces `create_all` before real
  data ships.
- **Health:** `GET /health/db` runs `SELECT 1`.
- **Deps:** `sqlalchemy>=2.0`, `psycopg[binary]` (Postgres, prod only). `.env.example` documents
  `DATABASE_URL`, `APP_ORIGINS`, and the OAuth vars for C3.2. `backend/*.db` is gitignored.
- **Tests:** `backend/test_db.py` (persistence, unique identity, health, dev-endpoint removed).
- **Deliberately kept for now:** the plaintext demo auth (`/auth/*`) still mints the tokens the
  labs and frontend use. It is removed in C3.2 when OAuth + session cookies replace it, so the app
  is never left with no auth mid-way. The 4 pre-existing `test_main.py` failures (the `/api/auth`
  prefix mismatch) are part of that demo auth and are resolved by the C3.2 rewrite.

## Next: C3.2 — OAuth sign-in

Authlib-based Google + GitHub sign-in, `HttpOnly` session cookie, `GET /api/me`, sign-out; the
identity upsert implements verified-email auto-merge; then remove the demo auth and point the labs'
`current_user` at the new session. **Needs your OAuth apps first** (section 3): the Google and
GitHub client IDs/secrets, set as env vars on the VM.
