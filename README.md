# IT_Fund

Standalone Vite React learning platform for IT fundamentals to advanced cloud expertise.

## Tech

- React + Vite
- React Router
- TanStack Query
- shadcn/ui
- Three.js visualizations
- Local `/api/auth/*` auth flow
- Optional `VITE_API_BASE_URL` hosted backend target

## Dev

```bash
npm install
npm run dev
```

## Build

If `npm run build` works in your shell, use that. On some Windows setups the npm shim path fails; use:

```bash
node ./node_modules/vite/bin/vite.js build
node ./node_modules/eslint/bin/eslint.js . --quiet
```

## Auth

Auth is local and stub by default. Set `VITE_API_BASE_URL` to point at a real backend. Auth tokens are stored in `localStorage` under `it_fund_access_token`.

## Notes

This project intentionally avoids cloud provider SDKs in the frontend. AWS/cloud behavior is implemented in `ha-agent-layer` and reached through `/api` routes if you need it.
