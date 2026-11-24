# Wine Label Designer

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
  The values live in one module, `src/print/geometry.ts`.
- **Node.js 24** is the supported runtime.
- **Image upload** (`src/upload`, limits in `src/upload/limits.ts`):
  - Maximum file size: **10 MB**.
  - Maximum image size: **8000 px per side and 40 megapixels**. Larger images are refused before decoding.
  - **Low-resolution warning** below the full label with bleed at 300 DPI (currently 1134 × 1489 px). The image is still accepted.
  - The file type is detected from the content (magic bytes). If the file extension or the browser-reported type contradicts the content (for example a JPEG named `.png`, or a file without an extension), the file is refused with `TYPE_MISMATCH`. An empty browser-reported type is accepted.
  - The error code list from the requirements was extended by **`DIMENSIONS_TOO_LARGE`** for the maximum pixel size.
  - EXIF, GPS and all other metadata are removed by decoding and re-encoding the image on a canvas. The EXIF orientation is applied first, so photos stay upright. **JPEG stays JPEG** (quality 0.95). **PNG and WebP become PNG**, because pdf-lib can only embed PNG and JPEG.
  - Requires `OffscreenCanvas` and `createImageBitmap` (all current browsers; Safari 16.4 or later).
- **Design files** (`src/model`, schema version 1). The first three points were decided by the project owner:
  - All lengths are **millimetres**.
  - `x`/`y` is the **top-left corner of the unrotated element box**, measured from the label's trim corner (bleed lies at negative values). `rotation` is in degrees, clockwise, **around the box centre**, in the range 0 to under 360.
  - Images are stored **once in an `assets` list** as PNG or JPEG data URLs, and image elements refer to them by id. The data URL content must match its declared type (magic bytes).
  - Every file starts with `"format": "dl-school-wine-label"` and `"schemaVersion": 1`. Files from a newer version are refused. Older versions will be upgraded by `src/model/migrate.ts` (no migrations yet).
  - Unknown fields are refused, so changing the format always needs a new schema version.
  - Elements are stored back to front (later elements are drawn on top).
  - Maximum design file size: **50 MB**. Further limits: 500 elements, 100 images, 5000 characters per text, coordinates within ±1000 mm.
  - Default template id `blank` and bottle id `bordeaux-750`. They are placeholders until templates and bottles exist.
  - The saved file is called `wine-label-design.json`.
- **UI language** follows the browser language: German for any `de` locale, otherwise English. There is no language switch yet.
- **German texts use the formal "Sie".**
- **Playwright runs Chromium only** for now. Firefox and WebKit can be added later.
- **The dependency audit fails on moderate or higher** findings, for both production and dev dependencies.
- **License policy:** dependencies must use a permissive license (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, CC0, CC-BY-4.0, Unlicense, Zlib, Python-2.0). An unknown or missing license fails the scan, and so does any copyleft license (GPL, LGPL, AGPL, MPL, EPL and others). There is one reviewed exception: `lightningcss` (MPL-2.0). It is a required build-time dependency of Vite, used unmodified and never shipped in `dist/`. Exceptions are kept in `scripts/policy.mjs`.

## Known limitation

Playwright 1.65 has no Chromium build for macOS 13. On such a Mac, run the end-to-end tests with an installed Google Chrome instead, using a local config that sets `channel: 'chrome'`. CI runs on Ubuntu and is not affected.
