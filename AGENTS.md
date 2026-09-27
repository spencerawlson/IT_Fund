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

## Academy (flashcard game)

- Routes `/academy`, `/academy/roadmap`, `/academy/review`, `/academy/:trackId`, `/academy/:trackId/deck/:deckId?mode=learn|quiz`, `/academy/:trackId/boss/:tierId`, `/academy/:trackId/lesson/:deckId`.
- Content lives in `src/data/academy/<track>.js` (cards are `[question, answer, explanation?, wrongOptions?]`); tiers, CISSP domains, roadmap steps, and free resources are in `meta.js`.
- Card ids are position-based (`<deckId>-<index>`): append new cards, don't reorder, or learners lose progress on them.
- Guided lessons (`/academy/:trackId/lesson/:deckId`, Brilliant style) mix each deck's questions with hands-on puzzles from `src/data/academy/interactive.js` (order / numeric / widget: bits, cidr, hash).
- Styling: liquid glass utilities (`.glass`, `.glass-strong`, `.glass-btn` with `--tint`) and `LiquidBackground` in `src/index.css` / `components/academy/`. Pages using it need a `relative isolate` root.
- Game state (XP, streak, Leitner boxes, bosses, badges) is in `src/lib/academy.js`, stored in localStorage key `itfund-academy-v1`.
