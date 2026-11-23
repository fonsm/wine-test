git # Wine Label Designer Test

A free, browser-based wine label designer (MVP) by DL-School, with a German and English UI.

Everything runs in your browser. There is no backend, no account, no analytics and no cookies. Your photos, text and designs never leave your device.

Project rules and fixed decisions are in [AGENTS.md](AGENTS.md). Font and asset licenses are in [LICENSES.md](LICENSES.md).

## Requirements

- Node.js 24 (see `.nvmrc`)
- npm

## Run

```sh
npm ci          # install exact dependencies from package-lock.json
npm run dev     # start the dev server at http://localhost:5173
```

## Test

```sh
npm run lint        # ESLint + Prettier check
npm run format      # apply Prettier formatting
npm run typecheck   # TypeScript strict type check
npm test            # unit tests (Vitest)
npm run test:watch  # unit tests in watch mode

npx playwright install chromium   # once, to download the test browser
npm run test:e2e                  # end-to-end tests (Playwright, against the production build)

npm run audit       # npm audit, fails on moderate or higher
npm run licenses    # fails on unknown or copyleft dependency licenses
```

## Build

```sh
npm run build     # type check, build to dist/, then check dist/ holds static files only
npm run preview   # serve dist/ locally at http://localhost:4173
```

`dist/` can be hosted on any static web server. No server-side code is needed.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main` and on every pull request. It runs lint, the type check, unit tests, the dependency audit, the license scan, the build with the static-output check, and the Playwright tests.

## Assumptions

These were decided without confirmed requirements and can be changed:

- **Label geometry:** 90 × 120 mm, 300 DPI, 3 mm bleed, 3 mm safe margin.
- **Node.js 24** is the supported runtime.
- **Playwright runs Chromium only** for now. Firefox and WebKit can be added later.
- **The dependency audit fails on moderate or higher** findings, for both production and dev dependencies.
- **License policy:** dependencies must use a permissive license (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, CC0, CC-BY-4.0, Unlicense, Zlib, Python-2.0). An unknown or missing license fails the scan, and so does any copyleft license (GPL, LGPL, AGPL, MPL, EPL and others). There is one reviewed exception: `lightningcss` (MPL-2.0). It is a required build-time dependency of Vite, used unmodified and never shipped in `dist/`. Exceptions are kept in `scripts/policy.mjs`.

## Known limitation

Playwright 1.65 has no Chromium build for macOS 13. On such a Mac, run the end-to-end tests with an installed Google Chrome instead, using a local config that sets `channel: 'chrome'`. CI runs on Ubuntu and is not affected.
