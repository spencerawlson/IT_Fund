# Dependabot sweep — 2026-10-12

42 open alerts, all npm (`package-lock.json`). Fixed 38 via version bumps;
4 remain open as accepted risk (documented below). Backend (pip) had no alerts.

## Fixed

| Package | Was | Now | Alerts closed |
|---|---|---|---|
| vitest | 3.2.7 | 4.1.11 | #82 (mocker path traversal, medium); tinypool removed as a dependency in v4 → #88, #89 (critical RCE) gone |
| vite | 6.4.1 | 6.4.4 | #21, #22, #32, #33 |
| postcss | 8.5.6 | 8.5.29 | #27, #60, #61, #67 |
| react-router-dom | 6.30.3 | 6.30.6 | #78; react-router 6.30.6 also closes #29 |
| baseline-browser-mapping | 2.8.x | 2.11.28 | #79 |
| (transitive, via fresh lock) | — | — | brace-expansion #59 #85, braces —, minimatch #6, picomatch #11 #12 #13 #14, js-yaml #43 #56 #66 #80, nanoid #69 #70 #75, flatted #10, browserslist #73, rollup #4, source-map-js #91, @humanfs/node #76, @remix-run/router #64, @babel/core #31, postcss-selector-parser #72 |

Verification: 358/358 frontend tests pass on vitest 4.1.11, eslint clean,
`vite build` succeeds.

## Accepted risk (alerts left open)

- **#87 braces 3.0.3 (high)** — no patched version exists upstream. Nothing to install.
- **#57 react-router (medium, SSR constructor injection)** — advisory states it only
  affects Framework/Data Mode apps doing manual SSR/hydration. This app is a
  client-side SPA with no SSR. Fix would require a major bump to react-router 7.
- **#58 react-router (medium, open redirect via backslash)** — requires
  attacker-controlled navigation targets. All `<Link to>` / `navigate()` targets
  in `src/` are internal routes built from our own data; no user input becomes an
  external navigation target.
- **#92 uuid 7.0.3 (medium, buffer bounds in v3/v5/v6)** — transitive via `xcode`
  (Capacitor iOS tooling, build-time only), which uses `v4()`. The vulnerable
  code path (caller-supplied buffer to v3/v5/v6) is not reachable. Bumping
  uuid 7→11 under xcode risks breaking its CommonJS `require('uuid')`.

## Tooling note

`npm install` / `npm ci` crashed on npm 10 with
`Cannot read properties of null (reading 'edgesOut')` while resolving the
vitest 4 peer set (npm/cli arborist bug, reproducible with and without a
lockfile). `.npmrc` now sets `legacy-peer-deps=true` with an explanatory
comment. Revisit when upgrading npm past 10.
