# Wine Label Designer

A free, browser-based wine label designer (MVP) by DL-School, with a German and English UI.

Everything runs in your browser. There is no backend, no account, no analytics and no cookies. Your photos, text and designs never leave your device (see [PRIVACY-NOTES.md](PRIVACY-NOTES.md)).

- Project rules and fixed decisions: [AGENTS.md](AGENTS.md)
- Fonts, assets and shipped libraries: [LICENSES.md](LICENSES.md)
- What data is processed: [PRIVACY-NOTES.md](PRIVACY-NOTES.md)
- Tests on real printers, bottles and devices: [MANUAL-TEST.md](MANUAL-TEST.md)

## What it does

1. **Design a label** on a canvas at true size (default 90 × 120 mm, with 3 mm bleed and safe margin): text with four bundled fonts, photos (PNG, JPEG, WebP; metadata removed), and shapes from the templates. Drag, resize, rotate, snap, layers, undo/redo; mouse, touch and keyboard.
2. **Start from a template** (Classic, Elegant, Modern, or empty) and **pick a bottle** (Bordeaux, Burgundy, Schlegel, Sparkling).
3. **See it on the bottle** in a live 3D preview, or a flat preview if 3D is not available.
4. **Save and open designs** as `.json` files on your device.
5. **Print**: a PDF at true size, for your own printer (A4 with crop marks) or for a print shop (label size with bleed), plus a calibration page to check the printer's scale.
6. **German or English**, following the browser language, with a switch.

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
npm run test:e2e:chrome           # the same in installed Google Chrome (macOS 13, see below)

npm run audit       # npm audit, fails on moderate or higher
npm run licenses    # fails on unknown or copyleft dependency licenses

npm run thumbnails  # render the template thumbnails again after changing a template
```

## Build

```sh
npm run build     # type check, build to dist/, check dist/ holds static files only, check file sizes
npm run preview   # serve dist/ locally at http://localhost:4173
```

`dist/` can be hosted on any static web server. No server-side code is needed.

`npm run build` also builds the **embedded version** into `dist-embed/` (see the next section). `npm run build:embed` builds only that.

## Embedding in a shop page (Shopify test)

For the Shopify test (a theme app extension on a product page), the app can run inside another page. `dist-embed/` is one flat folder, as a theme extension's `assets/` folder needs: `wine-label-designer.js`, `wine-label-designer.css`, and the chunks, fonts and thumbnails (`wld-*`). It contains only file types a theme app extension accepts (`.js`, `.css`, `.png` and a few more; checked on every build), so the fonts are built as scripts, see below. The script finds all other files next to itself, so they can be served from Shopify's CDN.

The shop page needs one element and the script:

```html
<div data-wine-label-designer data-language="de" data-bottle="riesling">
  <script type="application/json">
    [{ "id": "riesling", "name": "Riesling-Flasche", "heightMm": 350, "bodyDiameterMm": 74, … }]
  </script>
</div>
<script type="module" src="…/wine-label-designer.js"></script>
```

- `data-language`: the shop's language (`de`, `de-DE`, `en`, …). Other languages fall back to the browser language, then English.
- `data-bottle`: the id of the product's bottle, which the app starts with. Optional.
- The JSON script: the shop's bottles, for example from a `bottle` metaobject. Each bottle has the fields of a file in `src/templates/data/bottles/` plus a `name` in the shop's language. Each bottle is checked like a built-in one (for example, the neck must be narrower than the body, and the body wider than 8 mm because of the rounded base edge); bad bottles are skipped with a console warning, and without any valid bottle the built-in ones are used. At most 50. Optional.

In a theme app extension, the block's Liquid writes this from the metaobjects. A short sketch below; the working block, with the field keys of the test store, is `extensions/wine-label-designer/blocks/wine_label_designer.liquid` in the `wine-label-app` repository:

```liquid
<div data-wine-label-designer
     data-language="{{ request.locale.iso_code }}"
     data-bottle="{{ product.metafields.custom.bottle.value.system.handle }}">
  <script type="application/json">
    [{%- for b in shop.metaobjects.bottle.values -%}
      {"id": {{ b.system.handle | json }}, "name": {{ b.name.value | json }},
       "heightMm": {{ b.height_mm.value | json }}, …}{%- unless forloop.last -%},{%- endunless -%}
    {%- endfor -%}]
  </script>
</div>
<script type="module" src="{{ 'wine-label-designer.js' | asset_url }}"></script>
```

How the embedded app behaves:

- It lives in a **shadow root** on that element, so the theme's CSS does not reach it and its CSS does not reach the theme. Inherited styles are reset (including the text direction, so a right-to-left shop page does not mirror the app), and `rem` sizes are turned into `px`, because themes change the page's root font size. The layout breakpoints follow the app's own width (container queries), not the window's, because the app often sits in a narrow product column (`src/embed/shadowCss.ts`).
- It has **no page title, no `<main>` and no language switch**, follows the shop's language, and never changes the shop's document (title, `lang`) or stores anything, not even the language.
- The label fonts are added to the page with the FontFace API (font rules inside a shadow root are ignored), from the same rules as `src/fonts/fonts.css`, under **the app's own names** (for example "WLD Playfair Display"). A theme can have a font with the same name, hosted elsewhere; the app must never make the browser load it. For the same reason, a font name the app does not know (for example from a design file) is shown in a generic font instead of being looked up on the page, and the interface itself uses only generic fonts (`system-ui, sans-serif`), in the standalone app too. Shopify accepts no font files in an extension, so each font is built into its own script that holds the unchanged font as a `data:` URL. The app loads that script the first time a label uses the font, then adds the font to the page (`src/embed/fontFaces.ts`). So, like before, a font loads only when a label uses it; it is about a third larger (about 7.4 MB for the whole folder instead of 6 MB), and less after compression.
- **Network rule** (decided by the project owner, see AGENTS.md): embedded, the app's files may come from the shop's domain and Shopify's CDN, still only `GET` and never with user data.
- `e2e/embed.spec.ts` checks all this in a fake shop page (`e2e/shop/product.html`) with deliberately hostile theme CSS, with the page and the app's files on two different origins, like a shop and its CDN.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main` and on every pull request. It runs lint, the type check, unit tests, the dependency audit, the license scan, the build with the static-output check, and the Playwright tests.

## Project structure

```text
src/
  app/        header and language switch
  editor/     label editor: canvas (Konva), panels, state with undo/redo
  embed/      the embedded version for a shop page: settings from the page, shadow root, fonts
  export/     PDF export (pdf-lib): layout plan, writer, calibration page
  fonts/      bundled fonts (files in src/assets/fonts/)
  i18n/       i18next setup, language detection and storage, translation checks
  model/      design data model (Zod schema), save/open, migrations
  preview/    3D bottle preview (Three.js, loaded lazily) and flat fallback
  print/      print geometry: label size, DPI, bleed, margins, PDF units
  render/     drawing a label without editor overlays (shared by preview, export, thumbnails)
  templates/  template and bottle data files, loader, gallery, thumbnails
  upload/     image upload: type check by content, limits, metadata removal
e2e/          Playwright tests (e2e/shop/: a fake shop page for the embedded version)
scripts/      licence, static-output and bundle-size checks; thumbnail rendering
```

## Success criteria and how they are checked

Built from the fixed decisions in AGENTS.md and the "Done when" of each feature prompt. "CI" means the check runs in GitHub Actions on every pull request. Manual checks are in MANUAL-TEST.md.

| #   | Criterion                                                                                         | Automated check                                                                                                                                                    | Manual check                                                                                         |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 1   | Fully client-side; the build is static files only                                                 | `scripts/check-static-output.mjs` (in `npm run build`, CI)                                                                                                         | —                                                                                                    |
| 2   | No analytics, tracking or cookies                                                                 | `e2e/privacy.spec.ts` (cookies, storage, service workers, requests)                                                                                                | —                                                                                                    |
| 3   | No user data leaves the browser; no third-party requests                                          | `e2e/privacy.spec.ts` (full flow; fails on another origin or user data in any request); origin checks in the `upload`, `design-file`, `preview` and `export` specs | Part C step 2 (real network)                                                                         |
| 4   | Only the listed stack; dependency licences permissive                                             | `npm run licenses`, `npm run audit` (CI); reviewed exceptions in `scripts/policy.mjs`                                                                              | Review of `package.json` in each pull request                                                        |
| 5   | Images: PNG, JPEG, WebP only, checked by content; SVG blocked                                     | `src/upload/*.test.ts`, `e2e/upload.spec.ts`                                                                                                                       | Part C steps 8–9                                                                                     |
| 6   | Print geometry as named constants in one module                                                   | `src/print/geometry.test.ts`; lengths in the PDF from that module                                                                                                  | Code review                                                                                          |
| 7   | Open-licensed fonts and assets, each in LICENSES.md                                               | `src/templates/templates.test.ts` (templates use bundled fonts only, no images); thumbnail tests                                                                   | Review of LICENSES.md (every file in `src/assets`, `src/templates/data`, `src/templates/thumbnails`) |
| 8   | Every UI string in German and English; no hard-coded text                                         | `src/i18n/coverage.test.ts`, `messages.test.ts` per area                                                                                                           | Part C steps 1, 3                                                                                    |
| 9   | Tests first; no weakened tests; small commits; lint and strict types                              | ESLint, Prettier, `tsc` (CI)                                                                                                                                       | Pull request review                                                                                  |
| 10  | CI passes on a clean clone                                                                        | GitHub Actions (`npm ci`, all checks)                                                                                                                              | —                                                                                                    |
| 11  | Upload: size and pixel limits, decode check, EXIF removed, typed errors in DE/EN                  | `src/upload/*.test.ts`, `e2e/upload.spec.ts`                                                                                                                       | Part C step 8 (camera photo upright, HEIC)                                                           |
| 12  | Design files: schema version, migration, save and open                                            | `src/model/*.test.ts`, `e2e/design-file.spec.ts`, `e2e/privacy.spec.ts` (round trip)                                                                               | Part C step 12                                                                                       |
| 13  | Editor works on desktop and phone (drag, resize, rotate, layers, snapping, undo, keyboard, touch) | `src/editor/*.test.ts`, `e2e/editor.spec.ts`, `e2e/keyboard.spec.ts`                                                                                               | Part C steps 4–6, 15                                                                                 |
| 14  | Edits appear on the 3D bottle within about 300 ms; orbit by dragging                              | `e2e/preview.spec.ts` (median of 3 edits, 4× slower CPU), `src/preview/*.test.ts`                                                                                  | Part C steps 6–7 (mid-range phone)                                                                   |
| 15  | 2D fallback when WebGL is off or too slow; resources disposed                                     | `e2e/preview-fallback.spec.ts`, `src/preview/scene.test.ts`, `performance.test.ts`                                                                                 | Part C step 16                                                                                       |
| 16  | PDF at true size; images at the right DPI; instructions before download                           | `src/export/*.test.ts` (sizes within 0.01 mm), `e2e/export.spec.ts`                                                                                                | Part A, sections 4–6 on 3 printers                                                                   |
| 17  | Calibration page: known square and ruler                                                          | `src/export/pdf.test.ts`                                                                                                                                           | Part A, sections 1–3                                                                                 |
| 18  | Templates and bottles: validated data files, at least 3 each; picking updates editor and preview  | `src/templates/*.test.ts`, `e2e/gallery.spec.ts`                                                                                                                   | Part B (real bottle)                                                                                 |
| 19  | Keyboard access, focus order, visible focus, labels, contrast; small phone                        | `e2e/a11y.spec.ts` (axe, WCAG 2.2 AA), `e2e/keyboard.spec.ts`, `src/contrast.test.ts`, `e2e/flow.spec.ts` (320 px)                                                 | Part C step 15, Part D (screen reader)                                                               |
| 20  | Full flow works in both languages                                                                 | `e2e/flow.spec.ts`, `e2e/language.spec.ts`                                                                                                                         | Part C                                                                                               |
| 21  | No console errors                                                                                 | `e2e/fixtures.ts`: every Playwright test fails on a console error                                                                                                  | —                                                                                                    |
| 22  | Bundle size and first load                                                                        | `scripts/check-bundle-size.mjs` (in the build, CI), `e2e/first-load.spec.ts`                                                                                       | Part C step 2                                                                                        |
| 23  | Prints and looks right on real hardware                                                           | —                                                                                                                                                                  | MANUAL-TEST.md Parts A–D                                                                             |

## Assumptions

These were decided without confirmed requirements and can be changed:

- **Label geometry:** 90 × 120 mm (default size), 300 DPI, 3 mm bleed, 3 mm safe margin.
  The values live in one module, `src/print/geometry.ts`.
- **Label size setting** (decided by the project owner): the editor offers the presets from `LABEL_SIZE_PRESETS` (for now only 90 × 120 mm) and a custom size. Custom sizes are limited to **30–300 mm** per side; design files with a size outside this range are refused. When the size changes, elements keep their size and their position relative to the label centre, and may stick out of a smaller label. Typing a size is one undo step. The low-resolution warning for uploads uses the current label size.
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
  - New designs use the template id `blank` and the bottle id `bordeaux-750`.
  - The saved file is called `wine-label-design.json`.
- **Editor** (`src/editor`):
  - **Fonts** (decided by the project owner): four bundled OFL fonts, Playfair Display (default), EB Garamond, Inter and Great Vibes. They are TTF files from the Google Fonts repository (upstream publishes no WOFF2). They add about 4.4 MB to the build, but the browser only downloads a font when a label uses it (tested in `e2e/first-load.spec.ts`). Designs that name another font (for example `serif`) still open and use a generic fallback.
  - The design is the editor's only document state. Selection is view state and is not saved or undone.
  - **Undo/redo**: up to 100 steps. Each drag, resize, rotation, add, delete and layer change is one step. Typing into one field (text, number) and consecutive arrow-key nudges are merged into one step. Opening a design file starts a fresh history.
  - **New text**: 18 pt, centred, 80 % of the label width. **New images** are fitted into 80 % of the label, centred, keeping their aspect ratio. An image added twice is stored once.
  - **Snapping**: to bleed, trim edges, safe margin, label centre and to edges and centres of other unrotated elements, within 6 screen pixels. Rotated elements snap only their centre. Rotation snaps to 0°, 90°, 180° and 270°.
  - **Keyboard**: arrow keys move the selected element by 1 mm (Shift: 10 mm), Delete/Backspace removes it, Escape deselects, Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl+Y redoes. Every property can also be edited with form fields, and elements are selected through the layer list.
  - **Touch**: drag, resize and rotate with the finger. Handles are larger on touch screens. Touching an empty label area still scrolls and zooms the page.
  - **Layout**: one column below 900 px width (bottle preview at the end), canvas with a side panel from 900 px (preview at the top of the panel), canvas, preview and panel side by side from 1200 px.
  - Shapes from design files are shown, but there is no tool to add shapes yet.
- **Bottle preview** (`src/preview`):
  - **Loading** (decided by the project owner): shown next to the editor automatically. Three.js is in its own file (about 570 kB, 140 kB gzipped) that the browser downloads right after the editor appears, so it does not delay the first page load. Everything comes from the app's own origin.
  - **Bottles** are drawn from code (`LatheGeometry`) from the bottle data in `src/templates` (see below), with a capsule over the cork. No 3D model files. The design's `bottleId` picks the shape; unknown ids show the default Bordeaux.
  - **Label on the glass**: the label is drawn without editor overlays (no handles, guides or bleed tint, trim area only) at 1024 px on its longer side, and wrapped as a cylinder segment 0.3 mm outside the glass. Its width becomes the arc length around the bottle, so the print is not stretched. It is centred on the front, and vertically in the straight part of the body (12–196 mm above the base). A label wider than the circumference (about 241 mm) or taller than that part shows its middle.
  - **Updates**: edits are collected for 30 ms and then drawn. The target is 300 ms from an edit to the drawn frame with the CPU slowed down 4× (like a mid-range phone). The test times each edit from a settled preview (the previous frame drawn); measured about 60 ms even with software rendering (no GPU, as in CI).
  - **Turning**: drag sideways to turn the bottle all the way around, up and down only a little (about 30° from above to 15° from below). No zoom or pan. On touch screens, vertical swipes keep scrolling the page. There are no turn buttons (decided by the project owner): the 3D view is a visual extra, and everything on the label can be edited with the keyboard in the editor.
  - **Flat fallback**: without WebGL 2 (needed by Three.js), or when 3D is too slow, a flat front view of the bottle is shown instead, with a message explaining why. It also updates live. If the browser takes WebGL away later, the preview switches to the flat view. "Too slow" means the first frames take longer than 150 ms each (median of five). Before giving up, sharp screens first try 1 canvas pixel per CSS pixel (instead of up to 2), and a slow result is measured once more after 0.5 s, so a busy moment while the page loads does not count. The reason is in the preview's `data-fallback` attribute (`webgl` or `slow`).
  - Geometries, materials, textures, the WebGL renderer and its context are released when the preview is removed (for example when the bottle changes).
- **Templates and bottles** (`src/templates`):
  - **Templates** are design files in the saved-file format (`src/templates/data/templates/*.json`): Empty label, Classic, Elegant and Modern. Text and shapes only, with the bundled fonts (decided by the project owner); sample texts are German and made up. They are CC0 (see LICENSES.md).
  - **Bottles** are shape parameters (`src/templates/data/bottles/*.json`): Bordeaux, Burgundy, Schlegel and Sparkling, all 750 ml (decided by the project owner). The outline is built from height, body and neck diameter, shoulder start and curve, neck start, label zone and capsule start; the lip and the rounded base are fixed. Bordeaux keeps its previous shape.
  - **Validation**: every file is checked with Zod when the app (or a test) loads; a broken file stops with its file name, and the file name must match the id. Unit tests check every template against the design schema, the bleed and safe margins, the fonts and the names in both languages.
  - **Applying a template** replaces the label (content and size) in one undo step and keeps the chosen bottle (decided by the project owner). Picking a bottle is also one undo step. The gallery marks the template a design is based on and its bottle.
  - **Thumbnails** in the gallery are pre-rendered PNGs (`src/templates/thumbnails/`, made by `npm run thumbnails`), so the first visit does not load every font (decided by the project owner). A test fails if a template changed but its thumbnail was not rendered again.
  - **Adding a template or bottle**: add the JSON file, its name in `src/templates/messages.ts` (German and English), and the file in `e2e/catalogData.ts`; for a template, run `npm run thumbnails` (on macOS 13: `PW_CHANNEL=chrome npm run thumbnails`).
- **PDF export** (`src/export`, all lengths in `src/print/geometry.ts`):
  - **True size**: everything is placed in millimetres converted to PDF points (1 pt = 1/72 inch); unit tests check page and element sizes within 0.01 mm.
  - **Layouts** (decided by the project owner, the user chooses before downloading): **For my printer** (default): the label centred on A4 portrait with crop marks; A4 landscape if the label only fits that way; a larger page if it fits neither (needs a print shop or larger paper). **For a print shop**: the page is exactly the label, plus bleed if turned on.
  - **Bleed**: 3 mm on every side, on by default, can be turned off. Elements are cut at the bleed edge (or at the trim without bleed).
  - **Crop marks** (printer layout only): 5 mm long, 0.25 mm thick, starting 2 mm outside the bleed (or the trim), on the trim lines.
  - **Text** (decided by the project owner): each text box is placed as a 600 DPI picture with a transparent background, drawn by the same code as the editor, so the line breaks are identical. Text in the PDF cannot be selected or searched. No extra package is needed.
  - **Images**: placed at their exact size and crop (cover/contain/stretch as in the editor). Images with more than 300 DPI at their printed size are resampled to 300 DPI (JPEG photos stay JPEG, quality 0.92); smaller images are never enlarged and keep their pixels. If one ends up below 300 DPI, the export says so. An image used whole at its own size goes in unchanged.
  - **Shapes** (rectangles, ellipses, lines) are vector drawings.
  - **Colours**: RGB (sRGB), as pdf-lib cannot write CMYK. Print shops that need CMYK or PDF/X convert themselves.
  - **Calibration page**: A4 (decided by the project owner), with a 50 × 50 mm square, a 150 mm ruler with a tick every millimetre, and the instructions. Its text uses the PDF standard font Helvetica, which is not embedded (the PDF viewer provides it), so no font file or licence is added.
  - **Instructions** "Print at 100%, no scaling" are shown next to the download buttons, which refer to them for screen readers.
  - **Metadata**: title and the app name only; no author or other personal data.
  - pdf-lib (about 430 kB, 180 kB gzipped) is loaded on the first download only. pdf-lib has had no release since 2022 (version 1.17.1); it is stable and widely used.
  - File names: `wine-label.pdf` and `wine-label-calibration-page.pdf`.
- **UI language**: a **DE | EN** switch in the header. The first visit follows the browser language (German for any `de` locale, otherwise English). The choice is remembered in this browser's `localStorage` under `wine-label.language` (value `de` or `en`, nothing else; decided by the project owner). No cookie is set and nothing is sent anywhere. If storage is blocked, the switch still works until the page is reloaded. Switching keeps the design and its undo history. The page language (`<html lang>`) and the tab title follow the switch.
- **Translations are checked**: `src/i18n/coverage.test.ts` scans the code; every key used must exist in German and English, and components must not contain visible text, `aria-label`, `alt`, `title` or `placeholder` text directly. Template sample texts (label content) are not UI text and stay as written.
- **German texts use the formal "Sie".**
- **Accessibility** (target: WCAG 2.2 AA):
  - `e2e/a11y.spec.ts` runs axe-core (WCAG 2.2 A/AA rules) in German and English, on a desktop and a 320 px phone, in the main states of the app.
  - **Reviewed exception** (decided by the project owner): the language buttons show "DE"/"EN" but are named "Deutsch (DE)"/"English (EN)". axe's "label in name" rule (WCAG 2.5.3) wants the name to start with the visible text; it is skipped for the language switch only.
  - Contrast of the colour tokens is unit-tested (`src/contrast.test.ts`): text at least 4.5:1, form field borders and the focus ring at least 3:1.
  - Keyboard: everything is reachable with Tab, in the order of the page, with a 3 px focus ring (`e2e/keyboard.spec.ts`, 320 px phone, both languages). The label canvas has its own keyboard commands (see Editor). The 3D bottle is turned by dragging only; the label and the bottle choice are fully usable without it.
  - The full flow (template, text, bottle, photo, PDF, calibration page) is tested on a 320 × 568 phone in both languages without sideways scrolling (`e2e/flow.spec.ts`).
  - Not automated: screen reader testing by hand (for example VoiceOver, NVDA) and the content of the label canvas, which is a drawing (the layer list and the properties form describe and edit every element).
- **Size and first load** (`scripts/check-bundle-size.mjs`, `e2e/first-load.spec.ts`): the build fails if the first-load JavaScript is over 240 kB gzipped (now about 229 kB), the CSS over 10 kB, a lazily loaded file (3D preview, PDF export) over 200 kB gzipped, an image over 30 kB or a font over 1 MB, or if a font is part of the first load. On "slow 4G" (150 ms, 1.6 Mbit/s) with a 4× slower CPU, the editor must be usable within 5 s (measured 2.5 s) and the first load must stay under 500 kB (measured 395 kB). Vite's general warning about files over 500 kB (before compression) is expected for Konva and Three.js.
- **Console errors**: every Playwright test fails if the page logs a console error or throws (`e2e/fixtures.ts`). A test may allow an error it causes on purpose, with the reason next to it.
- **Playwright runs Chromium only.** Safari and Firefox are covered by the manual tests (MANUAL-TEST.md, Part C).
- **The dependency audit fails on moderate or higher** findings, for both production and dev dependencies.
- **License policy:** dependencies must use a permissive license (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, CC0, CC-BY-4.0, Unlicense, Zlib, Python-2.0). An unknown or missing license fails the scan, and so does any copyleft license (GPL, LGPL, AGPL, MPL, EPL and others). There are two reviewed exceptions, both MPL-2.0, used unmodified and never shipped in `dist/`: `lightningcss`, a required build-time dependency of Vite, and `axe-core` with `@axe-core/playwright`, the accessibility checks in the Playwright tests (approved by the project owner; `axe-core` is pinned to 4.14.0 through `overrides` in package.json). Exceptions are kept in `scripts/policy.mjs`.

## Open issues

Things that are known and not done yet, roughly by importance:

1. **Licence notices of shipped libraries.** The built JavaScript contains MIT/Zlib/0BSD-licensed libraries (React, Konva, Three.js, pdf-lib and others, see LICENSES.md). Their licences ask for the copyright and licence notices to ship with the app. The build does not include them yet. Before a public release, add a notices file (for example `dist/third-party-licenses.txt`, generated from the packages' licence files) and a link to it.
2. **No licence for the app's own code.** The repository has no `LICENSE` file. The templates, bottle data and thumbnails are CC0; the code itself is not licensed for reuse until the project owner decides.
3. **Manual tests not done yet.** MANUAL-TEST.md Parts A–D (3 printers, a real bottle, iOS Safari, Android Chrome, a desktop browser, a screen reader) need to be carried out and recorded. Results may lead to changes.
4. **Offline after loading.** The 3D preview and the PDF export are loaded on demand (by design, for a fast first load; there is no service worker). If the connection drops before the PDF code was loaded, the export shows "The PDF could not be created" until the device is online again.
5. **No autosave.** By design nothing is stored, so closing or reloading the tab loses unsaved work. There is no warning before leaving the page yet.
6. **Text in the PDF is a 600 DPI picture** (decided by the project owner). It prints sharply but cannot be selected or searched, and print shops that check fonts may ask about it.
7. **RGB only.** pdf-lib cannot write CMYK or PDF/X. Print shops that require them must convert the file.
8. **pdf-lib is not maintained** (last release 2022). It works and is widely used; watch for security advisories (`npm run audit` in CI).
9. **Browsers in automated tests.** Playwright runs Chromium only (on macOS 13 in installed Chrome, because Playwright 1.65 has no Chromium build for it: use `npm run test:e2e:chrome`). Safari and Firefox are checked by hand only.
10. **Fonts are large TTF files** (0.3–0.9 MB each). WOFF2 or subsets would be smaller, but Playfair Display has a Reserved Font Name under the OFL, so changed versions must be renamed. Needs a decision before changing the files.
11. **The 3D bottle turns by dragging only** (decided by the project owner), so keyboard and screen reader users cannot turn it. The label, the bottle choice and everything else work without it.
12. **Language buttons and WCAG 2.5.3**: the buttons show "DE"/"EN" and are named "Deutsch (DE)"/"English (EN)" (decided by the project owner); axe's label-in-name rule is skipped for them.
13. **No tool to add shapes.** Shapes come only from templates (and can then be moved, resized, deleted).
14. **HEIC photos** (iPhone camera format) are not accepted as such; iOS usually converts them to JPEG when uploading. To be confirmed in MANUAL-TEST.md Part C step 8.
15. **Very large labels on the bottle.** A label wider than the bottle's circumference or taller than its straight body shows only its middle in the preview.
16. **Hosting and server logs** are outside the app (see PRIVACY-NOTES.md, "Hosting").
17. **Shopify test: works in a development store, not finished.** Tested on 2026-11-26 in a Shopify development store with the Horizon theme, through the theme app extension of the `wine-label-app` repository. Working: the shop's bottles from the metaobjects, the product's bottle, the shop language, the label fonts, the 3D preview and the PDF. The files load from `https://cdn.shopify.com/extensions/<app id>/<version>/assets/…`, without a query string on the chunks; the extension's file-type rule is handled (fonts as scripts) and the 7.4 MB folder was accepted. Still open: whether the main script `wine-label-designer.js` gets a query string from `asset_url` (the privacy check rejects query strings, so that would need a reviewed rule), phones (iOS Safari, Android Chrome), a second theme (Dawn), and the full privacy check against the real CDN (only done in the fake shop page so far).
18. **One designer per page.** The embedded version starts only on the first `data-wine-label-designer` element.
19. **No size check for `dist-embed/`.** The bundle-size check covers the standalone build. The embedded main file is about the same size (about 233 kB gzipped).
