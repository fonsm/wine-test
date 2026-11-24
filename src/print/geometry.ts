// The single source of truth for print geometry (AGENTS.md: "Print geometry").
// All values are assumptions and are listed in README.md.

export const LABEL_WIDTH_MM = 90;
export const LABEL_HEIGHT_MM = 120;
export const EXPORT_DPI = 300;
export const BLEED_MM = 3;
export const SAFE_MARGIN_MM = 3;

const MM_PER_INCH = 25.4;

export interface PixelSize {
  width: number;
  height: number;
}

/** Converts millimetres to whole pixels, rounding up so the print area is always covered. */
export function mmToPx(mm: number, dpi: number): number {
  // Round away floating-point noise first, so exact values (25.4 mm at 300 DPI) stay exact.
  return Math.ceil(Number(((mm / MM_PER_INCH) * dpi).toFixed(6)));
}

/** Pixel size of the whole label including bleed on every side. */
export function labelSizeWithBleedPx(dpi: number): PixelSize {
  return {
    width: mmToPx(LABEL_WIDTH_MM + 2 * BLEED_MM, dpi),
    height: mmToPx(LABEL_HEIGHT_MM + 2 * BLEED_MM, dpi),
  };
}
