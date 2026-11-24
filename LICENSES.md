# Licenses of fonts and assets

Every font and asset bundled with the app is listed here (see AGENTS.md). npm dependencies are checked separately by `npm run licenses`.

## Fonts

All fonts are used unmodified (only the file names were shortened) and are served from the app's own origin. They were downloaded from the official Google Fonts repository at commit [`06bfe0d`](https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl). The full license text of each font is next to the files in `src/assets/fonts/`.

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
