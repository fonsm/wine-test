// The label fonts for the embedded app. @font-face rules inside a shadow root are ignored, so
// the embedded app registers its fonts on the page with the FontFace API instead, from the
// same rules as fonts.css (the single list of font files). Like @font-face, a registered face
// is only downloaded when text uses it.
import fontsCss from '../fonts/fonts.css?raw';
import { setFontNamePrefix } from '../fonts/fonts';

/** Prefix of the label fonts' names on the shop page (see setFontNamePrefix). */
export const EMBED_FONT_PREFIX = 'WLD ';

export interface ParsedFontFace {
  family: string;
  /** File name in src/assets/fonts. */
  file: string;
  descriptors: { weight: string; style: string; display: FontDisplay };
}

const value = (block: string, name: string) =>
  new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(block)?.[1]?.trim();

export function parseFontFaces(css: string): ParsedFontFace[] {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, block = '']) => {
    const family = value(block, 'font-family')?.replace(/^['"]|['"]$/g, '');
    const file = /url\(['"]?(?:[^'")]*\/)?([^/'")]+)['"]?\)/.exec(block)?.[1];
    if (!family || !file) throw new Error(`Incomplete @font-face rule: ${block.trim()}`);
    return {
      family,
      file,
      descriptors: {
        weight: value(block, 'font-weight') ?? 'normal',
        style: value(block, 'font-style') ?? 'normal',
        display: (value(block, 'font-display') ?? 'swap') as FontDisplay,
      },
    };
  });
}

/** URLs of the built font files, next to the app's script (on the shop's CDN). */
const FONT_URLS = import.meta.glob<string>('../assets/fonts/*.ttf', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function embedFontFaces(): (ParsedFontFace & { url: string; pageFamily: string })[] {
  return parseFontFaces(fontsCss).map((face) => {
    const url = Object.entries(FONT_URLS).find(([path]) => path.endsWith(`/${face.file}`))?.[1];
    if (!url) throw new Error(`Font file ${face.file} not found`);
    return { ...face, url, pageFamily: `${EMBED_FONT_PREFIX}${face.family}` };
  });
}

let registered = false;

/**
 * Adds the label fonts to the page once, under the app's own names, and makes the app use
 * those names. They load when the label first uses them.
 */
export function registerFonts(fonts: FontFaceSet): void {
  if (registered) return;
  registered = true;
  setFontNamePrefix(EMBED_FONT_PREFIX);
  for (const face of embedFontFaces()) {
    fonts.add(new FontFace(face.pageFamily, `url(${face.url})`, face.descriptors));
  }
}
