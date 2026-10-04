# Cloudflare exercise — road2cissp.com (2026-10-04)

How the domain, DNS, and Cloudflare Tunnel for Road to CISSP were set up,
and how to reproduce or audit them. Companion to `README.md` (which covers
the Fedora backend deploy itself).

No secrets in this file. Tokens and passwords live only in
`~/.config/itfund/` on the server (mode 600).

---

## 1. Architecture

```
Browser
  ├─ https://www.road2cissp.com ──→ Vercel (frontend, www canonical)
  │     /api/* ──→ Vercel "backend" service (fallback; no OAuth creds —
  │               the app now calls the API origin directly, see §7)
  ├─ https://road2cissp.com ──→ 308 redirect to https://www.road2cissp.com/
  └─ https://api.road2cissp.com ──→ Cloudflare Tunnel "itfund-backend"
                                      ──→ Fedora server localhost:8001
                                            (uvicorn FastAPI + Postgres)
```

Port **8001** (not 8000): the Ecosystem Tycoon dashboard already holds
port 8000 on the same Fedora server ("FedSer").

## 2. Domain

- `road2cissp.com` bought on **Cloudflare Registrar** (2026-10-04).
- Cloudflare was already the authoritative DNS provider, so no nameserver
  change was needed.

## 3. DNS records (Cloudflare dashboard → DNS)

| Host | Type | Target | Proxy | Purpose |
|------|------|--------|-------|---------|
| `www` | CNAME | `cname.vercel-dns.com` | Off (DNS only) | Frontend on Vercel |
| `@` (apex) | — | — | — | Kept as redirect to `www` (see §6) |
| `api` | CNAME | `<tunnel-id>.cfargotunnel.com` | On (required) | Created automatically when the tunnel's public hostname was added |

Notes:

- The frontend records were created with the proxy **off** (DNS only) so
  Vercel serves traffic directly; `www` reached "Valid Configuration" in
  the Vercel dashboard.
- The `api` record is managed by the tunnel itself — do not edit it by hand.
  Tunnels require proxied DNS.

## 4. Tunnel `itfund-backend` (Cloudflare Zero Trust dashboard)

1. **Networks → Tunnels → Create a tunnel** → Cloudflared, name
   `itfund-backend`, save.
2. On the **Install connector** step, copy the **token**
   (the long string after `--token`). It goes into
   `~/.config/itfund/tunnel.env` on the server as `TUNNEL_TOKEN=<token>`
   (see `README.md` §5). No `cloudflared tunnel login` needed on the server.
3. **Public Hostnames → Add a public hostname**:
   - Subdomain `api`, domain `road2cissp.com`
   - Service type **HTTP**, URL `localhost:8001`
   - Save. This creates the `api.road2cissp.com` DNS record automatically.

The server side (`cloudflared.service` user unit + `config.yml` template) is
in this directory; the full install/start sequence is `README.md` §§5–7.

## 5. Server units and env files

- Systemd **user** units: `itfund-backend` (uvicorn on port 8001),
  `cloudflared` (tunnel connector). Enabled with linger so they survive logout:
  `sudo loginctl enable-linger $USER`.
- `~/.config/itfund/backend.env` — backend config (see `backend.env.example`).
- `~/.config/itfund/tunnel.env` — `TUNNEL_TOKEN` only.

Origin-related vars that must stay consistent (all in `backend.env`):

```
APP_ORIGIN=https://api.road2cissp.com          # builds the OAuth callback URL;
                                               # must match what is registered
                                               # with Google/GitHub exactly
APP_ORIGINS=https://road2cissp.com,https://www.road2cissp.com
FRONTEND_URL=https://www.road2cissp.com        # post-OAuth landing page
```

## 6. Vercel (frontend)

- Custom domains added: `road2cissp.com` and `www.road2cissp.com`.
- **www is canonical**; the apex redirects to it
  (`https://road2cissp.com` → 308 → `https://www.road2cissp.com/`).
- Environment variable (all environments):
  `VITE_API_BASE_URL=https://api.road2cissp.com/api`
  then **redeploy** — Vite bakes `VITE_*` vars into the bundle at build time.
- The app calls the API origin directly for auth/session/progress/labs
  (`credentials: include`, CORS allowed via `APP_ORIGINS`). The
  `vercel.json` `/api/*` rewrite to the Vercel backend service remains only
  as a fallback.

## 7. Verification (2026-10-04, all passing)

```bash
# DNS
dig +short www.road2cissp.com     # -> Vercel (via cname.vercel-dns.com)
dig +short api.road2cissp.com     # -> tunnel

# Backend through the tunnel
curl https://api.road2cissp.com/health       # {"status":"ok"}
curl https://api.road2cissp.com/health/db    # {"db":"ok"}

# Frontend
curl -s -o /dev/null -w "%{http_code}\n" https://www.road2cissp.com/   # 200
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" \
  https://road2cissp.com/   # 308 -> https://www.road2cissp.com/

# OAuth entry points (expect 302 to the provider, not a 4xx)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  https://api.road2cissp.com/api/auth/google/login   # 302 ...accounts.google.com...
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  https://api.road2cissp.com/api/auth/github/login   # 302 ...github.com/login/oauth...
```

Note: hitting `/api/auth/<provider>/login` on `www.road2cissp.com`
(the Vercel rewrite path) returns `404 {"detail":"Unknown or unconfigured
provider."}` because that backend service has no OAuth credentials.
That is expected — the app no longer uses that path.

## 8. Security follow-up (required)

On 2026-10-04 the Cloudflare tunnel token and the Postgres `itfund`
password were pasted into a chat window. Treat both as compromised:

1. Zero Trust dashboard → Tunnels → `itfund-backend` → rotate the token.
2. Replace `TUNNEL_TOKEN` in `~/.config/itfund/tunnel.env`,
   `systemctl --user restart cloudflared`.
3. `ALTER USER itfund WITH PASSWORD '<new-url-safe-password>';`
   (letters/numbers/`-`/`_` only) in Postgres.
4. Update `DATABASE_URL` in `~/.config/itfund/backend.env`,
   `systemctl --user restart itfund-backend`.
5. Re-run the §7 checks.

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `api.road2cissp.com` doesn't resolve | Public hostname missing on the tunnel | Re-add it in Zero Trust → tunnel → Public Hostnames |
| Tunnel shows unhealthy | `cloudflared` unit down or bad token | `systemctl --user status cloudflared`; check `tunnel.env` |
| `{"status":"ok"}` but `/health/db` fails | Postgres down / wrong `DATABASE_URL` / `pg_hba` ident | See `README.md` §2 (scram-sha-256) and §8 |
| CORS errors in the browser | Frontend origin missing from `APP_ORIGINS` | Add it, restart `itfund-backend` |
| OAuth `redirect_uri_mismatch` | `APP_ORIGIN` doesn't match the provider console | Must be exactly `https://api.road2cissp.com` |
| Login lands on the API root | `FRONTEND_URL` not set | Set it to `https://www.road2cissp.com`, restart backend |
| `Unknown or unconfigured provider` on `www.../api/auth/...` | Expected on the Vercel rewrite path (§7) | Use `api.road2cissp.com` — the app already does |
