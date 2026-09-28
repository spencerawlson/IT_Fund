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

Base44 has been removed. Auth is standalone/local unless a backend is provided via `VITE_API_BASE_URL`.

## Academy platform (paths → courses → modules → lessons)

- Full architecture, content model, locking rules and "how to add a course": `docs/ACADEMY.md`.
- Catalogue: `src/data/catalog/`; progress rules: `src/lib/progress/engine.js` (pure, tested); persistence adapter: `src/lib/progress/storage.js`.
- Tests: `node ./node_modules/vitest/vitest.mjs run`.

## Academy (flashcard game)

- Routes `/academy`, `/academy/roadmap`, `/academy/review`, `/academy/:trackId`, `/academy/:trackId/deck/:deckId?mode=learn|quiz`, `/academy/:trackId/boss/:tierId`, `/academy/:trackId/lesson/:deckId`.
- Content lives in `src/data/academy/<track>.js` (cards are `[question, answer, explanation?, wrongOptions?]`); tiers, CISSP domains, roadmap steps, and free resources are in `meta.js`.
- Card ids are position-based (`<deckId>-<index>`): append new cards, don't reorder, or learners lose progress on them.
- Guided lessons (`/academy/:trackId/lesson/:deckId`, Brilliant style) mix each deck's questions with hands-on puzzles from `src/data/academy/interactive.js` (order / numeric / widget: bits, cidr, hash).
- Styling: liquid glass utilities (`.glass`, `.glass-strong`, `.glass-btn` with `--tint`) and `LiquidBackground` in `src/index.css` / `components/academy/`. Pages using it need a `relative isolate` root.
- Game state (XP, streak, Leitner boxes, bosses, badges) is in `src/lib/academy.js`, stored in localStorage key `itfund-academy-v1`.

## AI tutor (OpenAI)

- Backend only: `backend/ai_tutor.py` (routes `GET /ai/status`, `POST /ai/tutor`, also mounted under `/api`). Streams Server-Sent Events. Prompts are built server-side; clients send study context + a `mode` (`hint`, `explain`, `simplify`, `example`, `weakspots`, `chat`).
- Key: `OPENAI_API_KEY` in `backend/.env` locally (see `backend/.env.example`) or the host's env vars. Never in `VITE_*` vars or frontend code. Optional: `OPENAI_MODEL` (default `gpt-4o-mini`), `AI_RATE_LIMIT` / `AI_RATE_WINDOW` (per-IP, in-memory).
- Local dev: `cd backend && .venv/Scripts/python -m uvicorn main:app --port 8000`; Vite proxies `/api` to it. Tests: `.venv/Scripts/python -m pytest test_ai_tutor.py` (fake client, no API calls).
- Frontend: `src/api/tutor.js`, `src/components/academy/tutor/` (`TutorAssist` pills + answer, `TutorChat`). Tutor UI hides itself when `/ai/status` isn't enabled.

## Module study notes

- Every module concept has detailed notes in `src/data/moduleNotes/<group>.js` (`{ body, example, tip }`, keyed by concept id, or `"term:<Term>"` to share one write-up across modules). `getNote()` in `src/data/moduleNotes/index.js` merges them; the Browse tab opens them in `StudySheet`.
- Module flashcards show the concept `summary` (short); the full notes live in the study sheet.
- Duplicate modules were merged; old ids redirect via `MODULE_ALIASES` / `resolveModuleId` in `src/data/modules.js`. Keep concept ids unique.
