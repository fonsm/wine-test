// Bundled fonts (SIL OFL 1.1, see LICENSES.md). The @font-face rules are in fonts.css.
// Designs store the family name; this list is what the editor offers.

export interface FontInfo {
  family: string;
  /** Generic CSS family used until the font is loaded, and if it is missing. */
  fallback: 'serif' | 'sans-serif' | 'cursive';
}

export const FONTS: readonly FontInfo[] = [
  { family: 'Playfair Display', fallback: 'serif' },
  { family: 'EB Garamond', fallback: 'serif' },
  { family: 'Inter', fallback: 'sans-serif' },
  { family: 'Great Vibes', fallback: 'cursive' },
];

export const DEFAULT_FONT_FAMILY = 'Playfair Display';

const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
]);

/**
 * Embedded in a shop page, the label fonts are registered under their own names with this
 * prefix (src/embed/fontFaces.ts). A theme may have fonts with the same names, from other
 * servers, and the app must never make the browser load those. Null: standalone.
 */
let fontNamePrefix: string | null = null;

export function setFontNamePrefix(prefix: string | null): void {
  fontNamePrefix = prefix;
}

/** CSS font-family value for a family name from a design. Names from files are sanitised. */
export function cssFontFamily(family: string): string {
  if (GENERIC_FAMILIES.has(family)) return family;
  const known = FONTS.find((font) => font.family === family);
  if (fontNamePrefix !== null) {
    // Unknown names could match a theme font; use the generic family instead.
    return known ? `"${fontNamePrefix}${known.family}", ${known.fallback}` : 'sans-serif';
  }
  const safeName = family.replace(/["\\;{}<>]/g, '').trim();
  return `"${safeName}", ${known?.fallback ?? 'sans-serif'}`;
}
