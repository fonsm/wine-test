// The label fonts for the embedded app. @font-face rules inside a shadow root are ignored, so
// the embedded app adds its fonts to the page with the FontFace API instead, from the same
// rules as fonts.css (the single list of font files).
// A Shopify theme extension accepts no font files in its assets, only scripts, styles, images
// and a few more. So each font is built into its own script, as a data: URL (the font itself is
// unchanged), and that script is loaded only when a label first uses the font.
import fontsCss from '../fonts/fonts.css?raw';
import { setFontNamePrefix } from '../fonts/fonts';
import { setFontPreparer } from '../render/fonts';

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

/** Each font file as a lazily loaded script that returns the font as a data: URL. */
const FONT_DATA = import.meta.glob<string>('../assets/fonts/*.ttf', {
  query: '?inline',
  import: 'default',
});

export interface EmbedFontFace extends ParsedFontFace {
  /** The name on the page (see EMBED_FONT_PREFIX). */
  pageFamily: string;
  /** Fetches the font's script (from next to the app's script) and returns its data: URL. */
  load: () => Promise<string>;
}

export function embedFontFaces(): EmbedFontFace[] {
  return parseFontFaces(fontsCss).map((face) => {
    const load = Object.entries(FONT_DATA).find(([path]) => path.endsWith(`/${face.file}`))?.[1];
    if (!load) throw new Error(`Font file ${face.file} not found`);
    return { ...face, load, pageFamily: `${EMBED_FONT_PREFIX}${face.family}` };
  });
}

/**
 * The faces that font shorthands (as for document.fonts.load) need: their family and style.
 * A family without the wanted style gets its other faces, like the browser, which then slants
 * the normal face (Great Vibes has no italic).
 */
export function facesForSpecs(specs: readonly string[], faces: readonly EmbedFontFace[]) {
  const needed = new Set<EmbedFontFace>();
  for (const spec of specs) {
    const family = faces.filter((face) => spec.includes(`"${face.pageFamily}"`));
    const italic = spec.startsWith('italic');
    const styled = family.filter((face) => (face.descriptors.style === 'italic') === italic);
    for (const face of styled.length > 0 ? styled : family) needed.add(face);
  }
  return faces.filter((face) => needed.has(face));
}

interface FontTarget<Face> {
  add: (face: Face) => unknown;
}

/** Makes the fonts that specs need available on the page, each fetched and added once. */
export function createFontPreparer<Face>(
  fonts: FontTarget<Face>,
  faces: readonly EmbedFontFace[],
  makeFace: (family: string, source: string, descriptors: FontFaceDescriptors) => Face,
): (specs: readonly string[]) => Promise<void> {
  const added = new Map<EmbedFontFace, Promise<void>>();
  return async (specs) => {
    // allSettled: a face that fails (for example offline) must not stop the wait for the
    // others, or the label would be drawn before they are there.
    await Promise.allSettled(
      facesForSpecs(specs, faces).map((face) => {
        let done = added.get(face);
        if (!done) {
          done = face.load().then((data) => {
            fonts.add(makeFace(face.pageFamily, `url(${data})`, face.descriptors));
          });
          // A failed fetch (for example offline) may be tried again next time.
          done.catch(() => added.delete(face));
          added.set(face, done);
        }
        return done;
      }),
    );
  };
}

let registered = false;

/**
 * Makes the app use its own font names on the page, and fetch each label font the first time
 * a label uses it (see loadFonts in src/render/fonts.ts).
 */
export function registerFonts(fonts: FontFaceSet): void {
  if (registered) return;
  registered = true;
  setFontNamePrefix(EMBED_FONT_PREFIX);
  setFontPreparer(
    createFontPreparer(
      fonts,
      embedFontFaces(),
      (family, source, descriptors) => new FontFace(family, source, descriptors),
    ),
  );
}
