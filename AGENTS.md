# IT_Fund

Standalone Vite React learning platform for IT fundamentals to advanced cloud expertise.

## Stack

- React + Vite + React Router
- TanStack Query
- shadcn/ui + Tailwind CSS
- Three.js visualizations
- Local `/api/auth/*` auth flow
- `VITE_API_BASE_URL` for optional hosted backend target

## Conventions

- Keep pages/components small and focused.
- Prefer local auth helpers under `src/api/` over cloud SDKs.
- Use `src/lib/query-client.js` for TanStack Query configuration.
- Components go in `src/components/`, pages in `src/pages/`.

## Verification

This environment has a Windows npm path-resolution issue. Use direct Node invocation if `npm run lint` / `npm run build` fail:

```bash
node ./node_modules/eslint/bin/eslint.js . --quiet
node ./node_modules/vite/bin/vite.js build
```

## Status

Base44 has been fully removed (SDK, config, entities, localStorage keys, dead shadcn/ui components
and 49 unused npm deps were pruned in the production-readiness pass). Auth is OAuth via the backend
(HttpOnly session cookie) unless no backend is provided.

## Academy platform (paths → courses → modules → lessons)

- Full architecture, content model, prerequisite rules and "how to add a course": `docs/ACADEMY.md`.
- Nothing is locked: any course, module or lesson can be opened at any time. Prerequisites are
  shown as recommendations (`PrereqNotice`), never enforced.
- Catalogue: `src/data/catalog/`; progress rules: `src/lib/progress/engine.js` (pure, tested); persistence adapter: `src/lib/progress/storage.js`.
- Tests: `node ./node_modules/vitest/vitest.mjs run`.

## Academy (flashcard game)

- Routes `/academy`, `/academy/roadmap`, `/academy/review`, `/academy/:trackId`, `/academy/:trackId/deck/:deckId?mode=learn|quiz`, `/academy/:trackId/boss/:tierId`, `/academy/:trackId/lesson/:deckId`.
- Content lives in `src/data/academy/<track>.js` (cards are `[question, answer, explanation?, wrongOptions?]`); tiers, CISSP domains, roadmap steps, and free resources are in `meta.js`.
- Card ids are position-based (`<deckId>-<index>`): append new cards, don't reorder, or learners lose progress on them.
- Guided lessons (`/academy/:trackId/lesson/:deckId`, Brilliant style) mix each deck's questions with hands-on puzzles from `src/data/academy/interactive.js` (order / numeric / widget: bits, cidr, hash).
- Styling: two glass systems are in use — legacy `.glass`/`.glass-strong`/`.glass-btn` and the newer `.glass-1`/`.glass-2`/`.glass-3` (see `src/index.css`). Prefer the numbered system for new work. `LiquidBackground` lives in `components/academy/`; pages using it need a `relative isolate` root.
- Game state (XP, streak, Leitner boxes, bosses, badges) is in `src/lib/academy.js`, stored in localStorage key `itfund-academy-v1`.

## AI tutor (OpenAI)

- Backend only: `backend/ai_tutor.py` (routes `GET /ai/status`, `POST /ai/tutor`, also mounted under `/api`). Streams Server-Sent Events. Prompts are built server-side; clients send study context + a `mode` (`hint`, `explain`, `simplify`, `example`, `weakspots`, `chat`).
- `POST /ai/tutor` requires a signed-in learner (session cookie) and is rate-limited per user id — it spends OpenAI money, so it is never anonymous.
- Key: `OPENAI_API_KEY` in `backend/.env` locally (see `backend/.env.example`) or the host's env vars. Never in `VITE_*` vars or frontend code. Optional: `OPENAI_MODEL` (default `gpt-4o-mini`), `AI_RATE_LIMIT` / `AI_RATE_WINDOW` (per-IP, in-memory).
- Local dev: `cd backend && .venv/Scripts/python -m uvicorn main:app --port 8000`; Vite proxies `/api` to it. Tests: `.venv/Scripts/python -m pytest test_ai_tutor.py` (fake client, no API calls).
- Frontend: `src/api/tutor.js`, `src/components/academy/tutor/` (`TutorAssist` pills + answer, `TutorChat`). Tutor UI hides itself when `/ai/status` isn't enabled.

## Interactive labs (backend/labs)

- Providers: `mock` (simulation — the default for every lab definition) and `docker` (`labs/providers/docker.py`:
  one hardened container per session: dropped caps, no-new-privileges, CPU/mem/PID limits, internal-only
  network when the lab denies internet egress). Docker registers only with `LAB_DOCKER_ENABLED=1` on a host
  with a reachable daemon; flip a lab's `environment.provider` to `"docker"` once its image is published.
- DB: `APP_ENV=production` requires `DATABASE_URL` + `SESSION_SECRET` and runs Alembic migrations
  (`backend/alembic/versions`) at startup. Dev/test use SQLite + `create_all`. New schema change = new
  `alembic revision --autogenerate`.
- Migrations are append-only: NEVER delete a migration file that has been applied to the production
  database. On 2026-10-07 commit b1898770 deleted `b7f3a1c9d2e4_add_lab_sessions.py` after prod had applied
  it; every subsequent backend restart crashed with "Can't locate revision identified by 'b7f3a1c9d2e4'"
  (uvicorn child failed → parent stopped → Cloudflare 502 for 7+ hours). Fix was restoring the file and
  re-chaining. If a migration was a mistake, write a new migration that undoes it — don't remove the file.
- Startup migrations run in every uvicorn worker (`--workers 2`); `main._run_migrations()` serializes them
  with a Postgres advisory lock so concurrent workers can't race a pending migration.

## Module study notes

- Every module concept has detailed notes in `src/data/moduleNotes/<group>.js` (`{ body, example, tip }`, keyed by concept id, or `"term:<Term>"` to share one write-up across modules). `getNote()` in `src/data/moduleNotes/index.js` merges them; the Browse tab opens them in `StudySheet`.
- Module flashcards show the concept `summary` (short); the full notes live in the study sheet.
- Duplicate modules were merged; old ids redirect via `MODULE_ALIASES` / `resolveModuleId` in `src/data/modules.js`. Keep concept ids unique.
