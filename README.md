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
npm run test:e2e:chrome           # the same in installed Google Chrome (macOS 13, see below)

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
  - Default template id `blank` and bottle id `bordeaux-750`. They are placeholders until templates and bottles exist.
  - The saved file is called `wine-label-design.json`.
- **Editor** (`src/editor`):
  - **Fonts** (decided by the project owner): four bundled OFL fonts, Playfair Display (default), EB Garamond, Inter and Great Vibes. They are TTF files from the Google Fonts repository (upstream publishes no WOFF2; TTF can also be embedded in the PDF export later). They add about 4.4 MB to the build, but the browser only downloads a font when a text uses it. Designs that name another font (for example `serif`) still open and use a generic fallback.
  - The design is the editor's only document state. Selection is view state and is not saved or undone.
  - **Undo/redo**: up to 100 steps. Each drag, resize, rotation, add, delete and layer change is one step. Typing into one field (text, number) and consecutive arrow-key nudges are merged into one step. Opening a design file starts a fresh history.
  - **New text**: 18 pt, centred, 80 % of the label width. **New images** are fitted into 80 % of the label, centred, keeping their aspect ratio. An image added twice is stored once.
  - **Snapping**: to bleed, trim edges, safe margin, label centre and to edges and centres of other unrotated elements, within 6 screen pixels. Rotated elements snap only their centre. Rotation snaps to 0°, 90°, 180° and 270°.
  - **Keyboard**: arrow keys move the selected element by 1 mm (Shift: 10 mm), Delete/Backspace removes it, Escape deselects, Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl+Y redoes. Every property can also be edited with form fields, and elements are selected through the layer list.
  - **Touch**: drag, resize and rotate with the finger. Handles are larger on touch screens. Touching an empty label area still scrolls and zooms the page.
  - **Layout**: one column below 900 px width (bottle preview at the end), canvas with a side panel from 900 px (preview at the top of the panel), canvas, preview and panel side by side from 1200 px.
  - Shapes from design files are shown, but there is no tool to add shapes yet.
  - The main JavaScript bundle is about 735 kB (225 kB gzipped), mostly Konva. Vite warns about the size of this and the Three.js file; more code splitting can come later.
- **Bottle preview** (`src/preview`):
  - **Loading** (decided by the project owner): shown next to the editor automatically. Three.js is in its own file (about 570 kB, 140 kB gzipped) that the browser downloads right after the editor appears, so it does not delay the first page load. Everything comes from the app's own origin.
  - **Bottle**: a Bordeaux 750 ml bottle drawn from code (`LatheGeometry`), 300 mm high and 76 mm wide, with a capsule over the cork. No 3D model files or other assets, so nothing to license. The design's `bottleId` picks the shape; unknown ids show the default bottle.
  - **Label on the glass**: the label is drawn without editor overlays (no handles, guides or bleed tint, trim area only) at 1024 px on its longer side, and wrapped as a cylinder segment 0.3 mm outside the glass. Its width becomes the arc length around the bottle, so the print is not stretched. It is centred on the front, and vertically in the straight part of the body (12–196 mm above the base). A label wider than the circumference (about 241 mm) or taller than that part shows its middle.
  - **Updates**: edits are collected for 30 ms and then drawn. The target is 300 ms from an edit to the drawn frame with the CPU slowed down 4× (like a mid-range phone). The test times each edit from a settled preview (the previous frame drawn); measured about 60 ms even with software rendering (no GPU, as in CI).
  - **Turning**: drag sideways to turn the bottle all the way around, up and down only a little (about 30° from above to 15° from below). No zoom or pan. On touch screens, vertical swipes keep scrolling the page. There are no turn buttons (decided by the project owner): the 3D view is a visual extra, and everything on the label can be edited with the keyboard in the editor.
  - **Flat fallback**: without WebGL 2 (needed by Three.js), or when 3D is too slow, a flat front view of the bottle is shown instead, with a message explaining why. It also updates live. If the browser takes WebGL away later, the preview switches to the flat view. "Too slow" means the first frames take longer than 150 ms each (median of five). Before giving up, sharp screens first try 1 canvas pixel per CSS pixel (instead of up to 2), and a slow result is measured once more after 0.5 s, so a busy moment while the page loads does not count. The reason is in the preview's `data-fallback` attribute (`webgl` or `slow`).
  - Geometries, materials, textures, the WebGL renderer and its context are released when the preview is removed (for example when the bottle changes).
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
- **UI language**: a **DE | EN** switch in the header. The first visit follows the browser language (German for any `de` locale, otherwise English). The choice is remembered in this browser's `localStorage` under `wine-label.language` (value `de` or `en`, nothing else; decided by the project owner). No cookie is set and nothing is sent anywhere. If storage is blocked, the switch still works until the page is reloaded. Switching keeps the design and its undo history.
- **German texts use the formal "Sie".**
- **Playwright runs Chromium only** for now. Firefox and WebKit can be added later.
- **The dependency audit fails on moderate or higher** findings, for both production and dev dependencies.
- **License policy:** dependencies must use a permissive license (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, CC0, CC-BY-4.0, Unlicense, Zlib, Python-2.0). An unknown or missing license fails the scan, and so does any copyleft license (GPL, LGPL, AGPL, MPL, EPL and others). There is one reviewed exception: `lightningcss` (MPL-2.0). It is a required build-time dependency of Vite, used unmodified and never shipped in `dist/`. Exceptions are kept in `scripts/policy.mjs`.

## Known limitation

Playwright 1.65 has no Chromium build for macOS 13. On such a Mac, run the end-to-end tests in an installed Google Chrome instead:

```sh
npm run test:e2e:chrome
```

This uses `playwright.chrome.config.ts`, which is the normal config with `channel: 'chrome'`. CI runs on Ubuntu with `npm run test:e2e` and is not affected.
