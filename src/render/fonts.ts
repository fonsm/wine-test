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

/** Loads the given fonts (self-hosted files, same origin). Fonts that fail to load are skipped. */
export async function loadFonts(specs: readonly string[]): Promise<void> {
  await Promise.allSettled(specs.map((spec) => document.fonts.load(spec)));
}
