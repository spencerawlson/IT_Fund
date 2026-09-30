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

## C3.2 status — done (backend)

OAuth sign-in, built against injectable providers so it's fully unit-tested without live credentials:
- **`backend/auth/`**: `identity.py` (verified-email auto-merge), `sessions.py` (HttpOnly cookie;
  only the SHA-256 of the id is stored; sliding 30-day expiry), `oauth.py` (Authlib Google + GitHub,
  normalising each provider incl. GitHub's `/user/emails` for the verified primary), `deps.py`
  (shared `require_user_id`: session cookie, then legacy bearer), `router.py`.
- **Routes** (at `/api/auth/*`): `GET /{provider}/login`, `GET /{provider}/callback`,
  `POST /logout`, `GET /me`.
- **Wiring**: Starlette `SessionMiddleware` for OAuth state; labs now authenticate via the shared
  dependency, so a session cookie alone starts a lab (verified in a test).
- **Tests** (`backend/test_auth.py`, 9): returning identity, auto-merge on matching **verified**
  emails (case-insensitive), NO merge when unverified, account email set only from a verified claim,
  session round-trip/expiry, and the full callback -> cookie -> `/me` -> logout flow with an
  injected identity, plus a lab started with only the cookie. Backend suite: 36 passing (the 4
  pre-existing demo-auth failures remain).
- **Deps**: authlib, httpx, itsdangerous (+ cryptography pulled in). `.env.example` documents
  `APP_ORIGIN`, `SESSION_SECRET`, `COOKIE_INSECURE`.

**Revised sequencing note:** the plaintext demo auth (`/auth/*`) and the bearer fallback are kept
until **C3.5**, when the frontend switches to OAuth sign-in — removing them now would break the
(still-wired) demo login with no replacement UI. That's also when the 4 `test_main.py` failures go.

**Needs you before a live sign-in:** register the Google and GitHub OAuth apps (section 3), set
`GOOGLE_/GITHUB_CLIENT_ID/SECRET`, `SESSION_SECRET`, `APP_ORIGIN`, `DATABASE_URL` and `APP_ORIGINS`
on the VM. Callback URL: `https://<domain>/api/auth/<provider>/callback`.

## Next: C3.3 — progress API

`GET/PUT /api/academy/progress` (user from the session; optimistic `version`; size + schema limits;
rate-limited), then C3.4 client `serverAdapter` + merge, C3.5 sign-in UI (and demo-auth removal).

## C3.3 status — done

`backend/progress_api.py` — one JSON document per user, in the Academy's existing state shape:
- `GET /api/academy/progress` -> `{state, version}` (new users: `{}`, 0).
- `PUT /api/academy/progress` — user from the session; requires `If-Match: <version>` (428 if
  missing); a stale version returns **409 with the server's current copy** so the client merges;
  `state` must be an object (400); payload capped at 256 KB (413); writes rate-limited to
  30/min/user (429).
- Tests (`backend/test_progress.py`, 9): roundtrip, conflict, 428/400/413/429, and per-user
  isolation. Backend suite: 45 passing (4 pre-existing demo-auth failures remain).

## Next: C3.4 — client sync

`serverAdapter` implementing the existing `ProgressAdapter` (offline-first: localStorage stays the
working copy, writes debounced + flushed on hide, 409 -> fetch/merge/retry) and a pure, tested
`mergeProgress(a, b)` (best score / most-recent card / highest XP / latest resume) used on first
sign-in. Decision-independent; does not need the OAuth apps.

## C3.4 status — done (building blocks; wiring deferred to C3.5)

- **`src/lib/progress/merge.js`** — `mergeProgress(a, b)`: XP/combo max, per-lesson best (tie ->
  later attempt), per-card more-advanced box (tie -> later due) with right/wrong maxed, per-boss max,
  badges + mastered union, per-day XP max, streak by count (tie -> later date), most-recent resume.
- **`src/api/progress.js`** — same-origin client; a 409 carries the server copy for merging.
- **`src/lib/progress/serverAdapter.js`** — offline-first `ProgressAdapter`: localStorage is the
  working copy; `save()` is debounced then pushed; `sync()` (call once on sign-in) pulls + merges +
  uploads; a 409 triggers merge + retry (capped); `flush()` for tab-hide.
- **Tests**: `merge.test.js` (8) and `serverAdapter.test.js` (5, fake timers + mock client) incl.
  the conflict-retry path. Frontend suite: 116 passing.
- **Not wired yet:** `setProgressAdapter(serverAdapter(...))` + `sync()` on sign-in, revert on
  sign-out, and a visibilitychange `flush()`. That lands in C3.5 with the sign-in UI.

## Next: C3.5 — sign-in UI + integration (final accounts phase)

`/signin` page (Continue with Google/GitHub), account menu in the shell (avatar, sync status, sign
out), wire the serverAdapter on sign-in and flush on hide, then remove the demo auth (`/auth/*`
register/login/OTP/reset), the bearer fallback in `auth/deps.py`, and the obsolete `test_main.py`
cases. **Needs the OAuth apps registered** for a real end-to-end sign-in test.

## C3.5 status — in progress

Done: OAuth sign-in UI (`/signin`, also the account view with sign-out + link-other-provider),
account entry in the shell (sidebar + mobile), `AuthContext` switched to the session-cookie model
(anonymous is a normal state, no redirect), server-sync wiring (`src/lib/progress/sync.js`:
serverAdapter enabled on sign-in, reverted on sign-out, flush on tab-hide), and a **local-only
owner login** (`/api/auth/dev-login`, gated by `ALLOW_DEV_LOGIN=1`; a "Developer sign-in" button
shows only in `import.meta.env.DEV`) so labs are reachable before the OAuth apps exist. Demo-auth
pages deleted. Verified live: dev sign-in -> account shows "Owner" -> an interactive lab starts.

To use dev login locally: run the backend with `ALLOW_DEV_LOGIN=1 COOKIE_INSECURE=1`, run
`vite` (its /api proxy points at the backend), open `/signin`, click **Developer sign-in**.

Still to do (finishes C3.5): remove the plaintext demo auth (`/auth/register|login|otp|reset`,
in-memory stores) and the bearer fallback in `auth/deps.py`, migrate `labs/test_labs.py` to cookie
auth, and drop the 4 obsolete `test_main.py` cases.

## Unrelated UI change (same session)

Moved the **Concept library** (the original modules: All modules, Career tracks, Learning
principles) out of Practice into **Learn** (a section on the Courses page), per user request, and
removed the "Module N" number tags from the module cards and the module page. Practice now holds
only hands-on labs. Frontend 116 passing.
