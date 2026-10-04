# Road to CISSP

Standalone Vite React learning platform for IT fundamentals to advanced cloud expertise.

## Tech

- React + Vite
- React Router
- TanStack Query
- Tailwind CSS + custom glass UI (`src/components/ui-glass`)
- Three.js visualizations (Visual Lab)
- FastAPI backend (`backend/`) — OAuth sign-in, AI tutor, interactive labs, progress sync
- Optional `VITE_API_BASE_URL` hosted backend target

## Dev

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
uvicorn main:app --port 8000   # Vite proxies /api to it
```

## Build

If `npm run build` works in your shell, use that. On some Windows setups the npm shim path fails; use:

```bash
node ./node_modules/vite/bin/vite.js build
node ./node_modules/eslint/bin/eslint.js . --quiet
```

## Auth

Sign-in is OAuth (Google/GitHub) via the backend, which sets an HttpOnly session cookie —
no tokens ever touch `localStorage` or browser JS. A dev-only owner login exists behind
`ALLOW_DEV_LOGIN=1` and must never be enabled in production.

## Backend

- `POST /api/ai/tutor` — AI study tutor (SSE). Requires a signed-in learner; per-user rate limit.
- `/api/labs/*` — interactive labs. Two providers: `mock` (simulation, the default for every
  lab) and `docker` (real containers; opt in with `LAB_DOCKER_ENABLED=1` and set a lab's
  `environment.provider = "docker"` once its image is published).
- `/api/academy/progress` — server-side progress with optimistic concurrency (`If-Match`).
- Database: Postgres via `DATABASE_URL` in production (`APP_ENV=production` runs Alembic
  migrations at startup from `backend/alembic/`); local dev/tests use SQLite via `create_all`.

## Production checklist

- Set `SESSION_SECRET`, `DATABASE_URL`, `APP_ENV=production`, `OPENAI_API_KEY`.
- Never set `ALLOW_DEV_LOGIN=1` in production.
- `APP_ORIGINS` must list the real frontend origin(s).

## Notes

This project intentionally avoids cloud provider SDKs in the frontend. AWS/cloud behavior is implemented in `ha-agent-layer` and reached through `/api` routes if you need it.
