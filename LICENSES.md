# Licenses of fonts and assets

Every font and asset bundled with the app is listed here (see AGENTS.md). npm dependencies are checked separately by `npm run licenses`.

## Fonts

All fonts are used unmodified (only the file names were shortened) and are served from the app's own origin. In the embedded build for Shopify (`dist-embed/`), each font file is carried byte for byte, base64-encoded, inside its own JavaScript file, because a Shopify theme app extension accepts no font files; the font itself is not changed. They were downloaded from the official Google Fonts repository at commit [`06bfe0d`](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl). The full license text of each font is next to the files in `src/assets/fonts/`.

| Font             | Files                                                                 | Source                                                                                                                                  | License | Copyright / attribution                                                                                                                           |
| ---------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playfair Display | `PlayfairDisplay-Variable.ttf`, `PlayfairDisplay-Italic-Variable.ttf` | [google/fonts `ofl/playfairdisplay`](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/playfairdisplay) | OFL-1.1 | Copyright 2017 The Playfair Display Project Authors (https://github.com/clauseggers/Playfair-Display), with Reserved Font Name "Playfair Display" |
| EB Garamond      | `EBGaramond-Variable.ttf`, `EBGaramond-Italic-Variable.ttf`           | [google/fonts `ofl/ebgaramond`](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/ebgaramond)           | OFL-1.1 | Copyright 2017 The EB Garamond Project Authors (https://github.com/octaviopardo/EBGaramond12)                                                     |
| Inter            | `Inter-Variable.ttf`, `Inter-Italic-Variable.ttf`                     | [google/fonts `ofl/inter`](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/inter)                     | OFL-1.1 | Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)                                                                          |
| Great Vibes      | `GreatVibes-Regular.ttf`                                              | [google/fonts `ofl/greatvibes`](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl/greatvibes)           | OFL-1.1 | Copyright 2015 The Great Vibes Pro Project Authors (https://github.com/googlefonts/great-vibes)                                                   |

SIL Open Font License 1.1: https://openfontlicense.org. The license allows bundling and redistributing the fonts with software. The fonts may not be sold on their own, and modified versions must not use a Reserved Font Name.

License texts: `src/assets/fonts/OFL-PlayfairDisplay.txt`, `OFL-EBGaramond.txt`, `OFL-Inter.txt`, `OFL-GreatVibes.txt`.

## Templates and bottle shapes

| Asset               | Files                                                                         | Source                                                            | License                                                                                      | Attribution  |
| ------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------ |
| Label templates     | `src/templates/data/templates/*.json` (blank, classic, elegant, modern)       | Created for this project by DL-School (no third-party content)    | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (decided by the project owner) | Not required |
| Bottle shapes       | `src/templates/data/bottles/*.json` (bordeaux, burgundy, schlegel, sparkling) | Created for this project by DL-School (no third-party content)    | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (decided by the project owner) | Not required |
| Template thumbnails | `src/templates/thumbnails/*.png`                                              | Rendered from the label templates above with `npm run thumbnails` | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)                                | Not required |

The templates contain only text and shapes, no images (decided by the project owner). They use only the fonts listed above. The winery name "Weingut Sonnenhang" and all other sample texts are made up. The bottle shapes are drawn from typical outer dimensions of standard 750 ml bottles, not copied from any manufacturer's drawing.

## Other

- **PDF standard font**: the calibration page uses Helvetica, one of the 14 standard PDF fonts. It is referenced by name and **not embedded**; the PDF viewer or printer supplies it. No font file is shipped for it.
- **Page icon**: an empty `data:` URL (no icon file), so the browser does not request `/favicon.ico`.
- There are **no other images, icons, sounds, 3D models or fonts** in the app. The 3D bottles are drawn from the bottle shape parameters above; the bottle silhouettes in the gallery are drawn as SVG from the same data.

## Code libraries shipped in the app

These npm packages end up in the built JavaScript (`dist/assets/*.js`). All dependency licences, including development tools, are checked by `npm run licenses` (see `scripts/policy.mjs`).

| Package                                         | Version (first package) | Used for                     | License      |
| ----------------------------------------------- | ----------------------- | ---------------------------- | ------------ |
| react, react-dom, scheduler                     | 19.3.1                  | User interface               | MIT          |
| react-konva, react-reconciler, its-fine         | 19.3.2                  | Label canvas (React binding) | MIT          |
| konva                                           | 10.9.1                  | Label canvas                 | MIT          |
| three                                           | 0.187.0                 | 3D bottle preview            | MIT          |
| zod                                             | 4.6.7                   | Validation of files and data | MIT          |
| i18next                                         | 26.7.2                  | German and English texts     | MIT          |
| pdf-lib, @pdf-lib/standard-fonts, @pdf-lib/upng | 1.17.1                  | PDF export                   | MIT          |
| pako (used by pdf-lib)                          | 1.0.11                  | Compression in PDFs          | MIT and Zlib |
| tslib (used by pdf-lib)                         | 1.14.1                  | TypeScript helpers           | 0BSD         |

The MIT, Zlib and BSD-style licences ask that their copyright and licence notices are included with copies of the software. The build does not ship these notices yet; see "Open issues" in README.md.
