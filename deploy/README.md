# IT_Fund backend — production deploy (Fedora + Cloudflare Tunnel)

This pack puts the FastAPI backend on a Fedora server and exposes it over HTTPS
through a Cloudflare named tunnel. The Vite frontend stays on Vercel and talks
to the backend via `VITE_API_BASE_URL`.

**Hostnames used below:**

- Backend API (Cloudflare Tunnel): `api.road2cissp.com`
- Frontend (Vercel): `road2cissp.com`

No secrets live in this repo — only `backend.env.example` with placeholders.
The real env file lives at `~/.config/itfund/backend.env` on the server.

---

## 0. Prerequisites

- A Fedora server (x86_64) with sudo access and a non-root user (`spencer` below).
- A domain whose DNS is managed by Cloudflare (`road2cissp.com`).
- A Cloudflare account (free tier is enough).
- The Vercel project for the frontend.

## 1. Install packages

```bash
# cloudflared (official RPM)
sudo dnf install -y 'dnf-command(config-manager)'
sudo dnf config-manager addrepo --from-repofile=https://pkg.cloudflare.com/cloudflared-ascii.repo
sudo dnf install -y cloudflared

# python + postgres server
sudo dnf install -y python3 python3-pip postgresql-server
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

## 2. Create the database and user

```bash
sudo -u postgres psql <<'EOF'
CREATE USER itfund WITH PASSWORD 'CHOOSE_A_STRONG_PASSWORD';
CREATE DATABASE itfund OWNER itfund;
EOF
```

Use that password in `DATABASE_URL` later:
`postgresql://itfund:CHOOSE_A_STRONG_PASSWORD@localhost:5432/itfund`

## 3. Clone the repo, create the venv, install deps

```bash
cd ~
git clone https://github.com/spencerawlson/IT_Fund.git
cd ~/IT_Fund/backend
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

## 4. Create the Cloudflare tunnel and DNS route

```bash
cloudflared tunnel login          # opens a browser; authorizes your Cloudflare account
cloudflared tunnel create itfund-backend
# note the tunnel UUID it prints -> <TUNNEL_ID>

cloudflared tunnel route dns <TUNNEL_ID> api.road2cissp.com
# creates a CNAME: api.road2cissp.com -> <TUNNEL_ID>.cfargotunnel.com
```

## 5. Write the tunnel config

```bash
mkdir -p ~/.config/itfund
cp ~/IT_Fund/deploy/config.yml ~/.config/itfund/config.yml
# edit: replace <TUNNEL_ID>
# credentials-file defaults to ~/.cloudflared/<TUNNEL_ID>.json (created in step 4)
nano ~/.config/itfund/config.yml
```

## 6. Write the backend env file

```bash
cp ~/IT_Fund/deploy/backend.env.example ~/.config/itfund/backend.env
chmod 600 ~/.config/itfund/backend.env
# generate the session secret and paste it in:
openssl rand -hex 32
nano ~/.config/itfund/backend.env
```

Fill in: `APP_ORIGIN=https://api.road2cissp.com`, `APP_ORIGINS=https://road2cissp.com`,
`SESSION_SECRET`, `DATABASE_URL`, `OPENAI_API_KEY`, OAuth keys if used.
**Alembic migrations run automatically at backend startup** — no manual
migrate step is needed, but the DB/user from step 2 must exist first.

## 7. Install and start the user units

```bash
mkdir -p ~/.config/systemd/user
cp ~/IT_Fund/deploy/itfund-backend.service ~/.config/systemd/user/
cp ~/IT_Fund/deploy/cloudflared.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now itfund-backend cloudflared

# let user services survive logout:
sudo loginctl enable-linger $USER
```

## 8. Verify

```bash
# backend directly:
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/health/db     # {"db":"ok"} once migrations ran

# through the tunnel (give DNS a minute):
curl https://api.road2cissp.com/health
curl https://api.road2cissp.com/health/db
```

Both `/health` and `/health/db` must return OK before moving on.

## 9. Point the Vercel frontend at the backend

In the Vercel project: Settings → Environment Variables, set

```
VITE_API_BASE_URL=https://api.road2cissp.com/api
```

then redeploy the frontend (a new build is required — Vite bakes env vars in
at build time). `APP_ORIGINS` on the backend must contain the Vercel domain
from step 6 or browsers will block API calls with CORS errors.

## 10. (Optional) OAuth provider setup

If using Google/GitHub login, register these exact callback URLs in each
provider's console:

```
https://api.road2cissp.com/api/auth/google/callback
https://api.road2cissp.com/api/auth/github/callback
```

---

## Logs

```bash
journalctl --user -u itfund-backend -f     # backend logs
journalctl --user -u cloudflared -f        # tunnel logs
journalctl --user -u itfund-backend --since "1 hour ago" -p err
```

## Updating

```bash
cd ~/IT_Fund
git pull
systemctl --user restart itfund-backend     # migrations auto-run at startup
curl http://127.0.0.1:8000/health/db        # confirm
```

## Rollback

```bash
cd ~/IT_Fund
git log --oneline -5                        # pick the previous known-good SHA
git checkout <sha>
systemctl --user restart itfund-backend
# when stable again: git checkout main && git pull && restart
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Tunnel serves a Cloudflare 404 | `config.yml` hostname/ingress mismatch | Check `hostname:` matches the routed DNS name exactly |
| `curl https://api.road2cissp.com/health` → 502 | Backend not listening on :8000 | `systemctl --user status itfund-backend`; check `journalctl` |
| Browser: CORS errors on API calls | Vercel domain missing from `APP_ORIGINS` | Add it to `backend.env`, restart the backend unit |
| OAuth redirect fails | Callback URL not registered | Register the exact `{APP_ORIGIN}/api/auth/{provider}/callback` URL |
| `/health/db` fails / startup crash | DB unreachable or migration failed | Check `DATABASE_URL`, that postgres is running, and backend logs |
| Units stop after logout | Linger not enabled | `sudo loginctl enable-linger $USER` |
| `SESSION_SECRET must be set` at startup | Missing/empty secret in prod | Set it in `backend.env` (step 6), restart |

## NEVER

- **Never** set `ALLOW_DEV_LOGIN=1` in production — it is a dev-only backdoor.
- **Never** commit `~/.config/itfund/backend.env` (or any real secret) to the repo.
- **Never** put `OPENAI_API_KEY` in a `VITE_*` variable or frontend code — it is
  server-side only.
- **Never** run uvicorn as root or bind it to `0.0.0.0` — it stays on
  `127.0.0.1:8000` behind the tunnel.
