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
