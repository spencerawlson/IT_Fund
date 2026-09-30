---
name: run-app
description: Launch the Road to CISSP app locally (FastAPI backend + Vite frontend) and open it in the browser. Use when asked to run, start, launch, serve, or preview the app / site / program, or to see a change working in the real app.
---

# Run Road to CISSP locally

Two processes: the **FastAPI backend** (`backend/`, port 8000) and the **Vite frontend**
(`precision-logic-hub` is a sibling; this repo's frontend is at the repo root `src/`). The frontend's
dev proxy sends `/api/*` to `127.0.0.1:8000`, so start the backend first (any Vite port works — it
auto-picks 5173/5174/5190… if one is taken).

## 1. Backend (port 8000)

Run from `backend/` with dev sign-in enabled so you can reach Interactive Labs and progress sync
without registering OAuth apps:

```bash
cd backend
ALLOW_DEV_LOGIN=1 COOKIE_INSECURE=1 .venv/Scripts/python -m uvicorn main:app --port 8000 --host 127.0.0.1
```

PowerShell form:

```powershell
cd backend
$env:ALLOW_DEV_LOGIN=1; $env:COOKIE_INSECURE=1; .\.venv\Scripts\python -m uvicorn main:app --port 8000 --host 127.0.0.1
```

- `ALLOW_DEV_LOGIN=1` enables the local-only owner login (`/api/auth/dev-login`); never set it in production.
- `COOKIE_INSECURE=1` lets the session cookie work over plain http in dev.
- Uses the bundled SQLite dev database (`backend/labs_dev.db`, gitignored). Set `DATABASE_URL` for Postgres.
- The AI tutor stays hidden unless `OPENAI_API_KEY` is set — expected in local dev.

Smoke-check: `curl http://127.0.0.1:8000/health` → `{"status":"ok"}`, and `/health/db` → `{"db":"ok"}`.

## 2. Frontend

Run from the repo root. `npm run dev` may fail because the repo path contains `&`; call Vite directly:

```bash
node ./node_modules/vite/bin/vite.js
```

Vite prints the URL (e.g. `http://localhost:5173/`, or the next free port). Open it.

## 3. Drive it (confirm it works)

- Home renders "Welcome to Road to CISSP" with an "Up next" lesson and the left nav (Home, Learn,
  Review, Practice, Road to CISSP). Every course/lesson is open (non-linear model).
- **Interactive Labs**: Practice → Interactive labs → **Service Enumeration with Nmap**. It opens a
  **simulated terminal** against a provided target (`target.lab`). Type `nmap -sV -p- target.lab`
  (or `help`) — realistic canned output prints and the objectives tick off automatically as findings
  are recorded. Works as an anonymous guest; sign in (sidebar → "Developer sign-in (local only)") only
  to keep sessions across devices. The VLAN lab still uses the config-checklist recorder + "Check my
  work".

## Stop

Stop both processes (Ctrl-C, or kill whatever listens on 8000 and the Vite port).

## Tests / lint / build (not "running", but the usual checks)

```bash
node ./node_modules/vitest/vitest.mjs run          # frontend tests
node ./node_modules/eslint/bin/eslint.js . --quiet # lint
node ./node_modules/vite/bin/vite.js build         # production build
cd backend && .venv/Scripts/python -m pytest -q    # backend tests
```
