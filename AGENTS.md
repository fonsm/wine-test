# AGENTS.md

Fixed decisions and working rules for this repository. Every contributor, human or AI agent, must follow them. Changing a decision here needs explicit approval from the project owner.

## Product

- **What:** a free, browser-based **Wine Label Designer** (MVP) by **DL-School**.
- **UI languages:** German (`de`) and English (`en`). Every user-facing string goes through i18next. No hard-coded UI text.

## Privacy and architecture (non-negotiable)

- **Fully client-side.** No backend, no database, no user accounts.
- **No analytics, no tracking, no cookies.** This includes "anonymous" telemetry and error reporting services.
- **No user data leaves the browser.** Photos, text and designs are processed and stored locally only (memory, or browser storage if needed).
- **No third-party requests at runtime.** Fonts, scripts, styles, icons and other assets are self-hosted and bundled. No CDNs, Google Fonts, or external embeds.
- Any change that adds a network request must be treated as a bug unless it loads the app's own static assets.
- **Shopify embedding** (decided by the project owner, 2026-11-25): when the app is embedded in a Shopify shop, its own static files may come from the **shop's own domain** and from **Shopify's CDN** (where Shopify hosts an app's theme extension files). No other origin. These requests are still only `GET` requests for the app's own files and must never carry user data. The standalone app stays same-origin only.

## Tech stack

| Purpose            | Tool                  |
| ------------------ | --------------------- |
| Language           | TypeScript (`strict`) |
| Build / dev server | Vite                  |
| UI                 | React                 |
| 2D label canvas    | Konva (`react-konva`) |
| 3D bottle preview  | Three.js              |
| Validation         | Zod                   |
| PDF export         | pdf-lib               |
| i18n               | i18next               |
| Unit tests         | Vitest                |
| End-to-end tests   | Playwright            |
| Linting            | ESLint                |
| Formatting         | Prettier              |

Do not add any dependency not on this list without asking first (see Rules).

## Image uploads

- **Allowed:** PNG, JPEG, WebP.
- **Blocked:** SVG and every other format.
- Check the actual file content (magic bytes), not just the extension or the MIME type the browser reports.

## Print geometry

Label size, resolution, margins and bleed are **named constants** in one module. Never use them as magic numbers elsewhere. Calculate pixel sizes from millimetres and DPI. Do not hard-code them.

| Constant     | Value  | Status                            |
| ------------ | ------ | --------------------------------- |
| Label width  | 90 mm  | Assumption                        |
| Label height | 120 mm | Assumption                        |
| Export DPI   | 300    | Assumption                        |
| Bleed        | 3 mm   | Assumption (common print default) |
| Safe margin  | 3 mm   | Assumption (common print default) |

All assumptions must also be listed in `README.md`.

## Fonts and assets

- Only openly licensed fonts and assets (for example SIL OFL, Apache 2.0, MIT, CC0, CC BY).
- Every font and asset must have an entry in `LICENSES.md` with its name, source, license and attribution text, if attribution is required.
- An asset without a `LICENSES.md` entry must not be merged.

## Working rules

1. **Write tests first.** Write a failing test (Vitest or Playwright) before writing the code that makes it pass.
2. **Never delete, skip or weaken a test to make CI pass.** Fix the code instead. If a test itself is wrong, explain why and get approval before changing it.
3. **Ask before adding any dependency** that is not listed in the Tech stack. This includes dev dependencies.
4. **One small commit per feature.** Keep each commit focused, buildable and passing tests.
5. **State assumptions and keep going.** Write each assumption in `README.md` and continue. Stop and ask first only when a decision would be expensive to reverse (for example data formats, architecture, licensing, or anything affecting privacy).
6. Keep ESLint and Prettier clean. TypeScript strict mode stays on, and `any` needs a written reason.
