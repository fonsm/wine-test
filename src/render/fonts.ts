// Loading the bundled fonts a design uses, before drawing it on a canvas.
import { cssFontFamily } from '../fonts/fonts';
import type { Design } from '../model/schema';

/** CSS font shorthands (for document.fonts.load) of all fonts used by text elements. */
export function designFontSpecs(design: Design): string[] {
  const specs = new Set<string>();
  for (const element of design.elements) {
    if (element.type !== 'text') continue;
    const { fontStyle, fontWeight, fontFamily } = element.style;
    specs.add(`${fontStyle} ${fontWeight} 16px ${cssFontFamily(fontFamily)}`);
  }
  return [...specs].sort();
}

type FontPreparer = (specs: readonly string[]) => Promise<void>;

/**
 * Embedded in a shop, the font files cannot be plain files (src/embed/fontFaces.ts): a preparer
 * fetches the fonts a design needs and adds them to the page first. Null: standalone, where
 * fonts.css lists the files and the browser fetches them itself.
 */
let preparer: FontPreparer | null = null;

export function setFontPreparer(prepare: FontPreparer | null): void {
  preparer = prepare;
}

/** Loads the given fonts (self-hosted, never from elsewhere). Fonts that fail are skipped. */
export async function loadFonts(specs: readonly string[]): Promise<void> {
  if (preparer) {
    await preparer(specs).catch(() => undefined);
  }
  await Promise.allSettled(specs.map((spec) => document.fonts.load(spec)));
}
