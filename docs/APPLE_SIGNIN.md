# Sign in with Apple

Sign in with Apple on the website and in the native app, added 2026-11-23 for
App Store Guideline 4.8 (the App Store review found sign-in was Google/GitHub
only). It is the same OAuth authorization-code flow as Google/GitHub, behind
one extra module: `backend/auth/apple.py`.

## What the code does

- `GET /api/auth/apple/login` redirects to Apple (`response_mode=form_post`,
  scope `name email`). Apple POSTs the code back to
  `POST /api/auth/apple/callback`, which verifies the state, exchanges the
  code, and verifies the `id_token` against Apple's JWKS (signature + issuer
  + audience + expiry).
- The token endpoint needs a `client_secret` that is a short-lived ES256 JWT
  signed with the `.p8` key — built fresh for every exchange, alive five
  minutes. Authlib cannot build that or accept Apple's form-POST response, so
  Apple is implemented by hand; `backend/auth/oauth.py` registers it alongside
  Google/GitHub.
- The native app reuses the provider-agnostic plumbing: system browser →
  `POST /api/auth/native/exchange` with the PKCE verifier. No App ID
  "Sign in with Apple" capability is needed for this flow — the backend is
  the OAuth client (via the Services ID) for both web and native.
- Apple specifics, all handled:
  - **Hide My Email:** a relay address (`…@privaterelay.appleid.com`) is
    accepted as the account email and treated as verified — Apple verifies
    every email it returns.
  - **Name only on first authorization:** the name arrives in the form-POST
    `user` JSON the first time only. It is stored then; a later sign-in
    without it keeps the stored display name, never blanks it.
  - **Linking:** a verified Apple email matching an existing Google/GitHub
    account links to that same account (`auth/identity.py` verified-email
    auto-merge). No second account is created for the same person.
- **Unconfigured = hidden.** The button only renders when
  `GET /api/auth/providers` lists `apple`, which happens only when all four
  env vars below are set and the `.p8` parses. Before that, sign-in is
  exactly as it was — Google and GitHub, nothing broken.

## What Spencer must do in the Apple Developer portal

All four values go in `~/.config/itfund/backend.env` on FedServ, then
`systemctl --user restart itfund-backend` (wait ~30–60 s; the restart returns
before the app is ready). Nothing here goes in the repo.

### 1. Create the Services ID (the OAuth client)

Apple Developer → Certificates, Identifiers & Profiles → Identifiers → **+**
→ **Services IDs** → Continue.

- Description: `Road to CISSP sign-in` (any readable name).
- Identifier: `com.road2cissp.signin` — this is the `APPLE_CLIENT_ID`.
- Enable **Sign In with Apple** → Configure:
  - Primary App ID: `com.road2cissp.app`
  - Domains and Subdomains: `road2cissp.com`
  - Return URLs: `https://api.road2cissp.com/api/auth/apple/callback`
    (the API origin, not `www` — the callback must match this exactly).
- Save, then Continue → Register.

### 2. Create the .p8 key (signs the client_secret JWT)

Certificates, Identifiers & Profiles → Keys → **+**.

- Key name: `Road to CISSP sign-in`
- Check **Sign In with Apple** → Configure → Primary App ID:
  `com.road2cissp.app` → Save → Continue → Register.
- **Download the `.p8` now — Apple shows it only once.** Keep the file.
- Note the **Key ID** on the key's detail page — that is `APPLE_KEY_ID`.

### 3. Note the Team ID

Membership (or App Store Connect → Users and Access): the **Team ID** —
that is `APPLE_TEAM_ID`. (The account's Team ID is `RAXA72UKAC`.)

### 4. Put the four values in the backend env file

On FedServ, in `~/.config/itfund/backend.env`:

```
APPLE_CLIENT_ID=com.road2cissp.signin
APPLE_TEAM_ID=RAXA72UKAC
APPLE_KEY_ID=<the Key ID from step 2>
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGT... (the whole .p8, one line, \n escapes)\n-----END PRIVATE KEY-----
```

The `.p8` goes on **one line** with literal `\n` escapes where the line
breaks were — the code converts them back. (A real multi-line value in the
env file also works; the one-line form is the one that survives copy-paste.)

Then restart the backend:

```
systemctl --user restart itfund-backend
```

## How to confirm it is live

1. `curl https://api.road2cissp.com/api/auth/providers` — the JSON should
   list `"apple"` alongside google/github.
2. Open https://www.road2cissp.com/signin — the black **Sign in with Apple**
   button appears under Google/GitHub.
3. Sign in with Apple once (choose Hide My Email to prove the relay path),
   then sign in with the matching Google account — both land on the same
   account (one row in `/admin`, two linked providers).

## Tests

`backend/test_apple_auth.py` (28 tests): client_secret JWT shape with fake
keys, authorize URL, id_token verification (wrong issuer/audience/expired/
wrong key all rejected), relay-email acceptance, first-auth name capture +
missing-name fallback, verified-email linking, unconfigured-hidden behaviour,
and the full web + native callback flows with stubbed Apple HTTP.
`src/pages/SignIn.test.jsx` (Apple button presence + providers gating +
click), `src/lib/native.test.js` (system-browser Apple login),
`src/pages/Privacy.test.jsx` (Hide My Email wording).
