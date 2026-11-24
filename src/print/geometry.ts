// The single source of truth for print geometry (AGENTS.md: "Print geometry").
// All values are assumptions and are listed in README.md.

export const LABEL_WIDTH_MM = 90;
export const LABEL_HEIGHT_MM = 120;
export const EXPORT_DPI = 300;
export const BLEED_MM = 3;
export const SAFE_MARGIN_MM = 3;

const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;

/** Text is placed in the PDF as a picture at this resolution, so small type stays sharp. */
export const TEXT_EXPORT_DPI = 2 * EXPORT_DPI;

/** Paper for the "own printer" layout and the calibration page (portrait). */
export const A4_PAPER = { widthMm: 210, heightMm: 297 } as const;

/** Crop marks: gap between the bleed edge (or the trim, without bleed) and the mark, length and line width. */
export const CROP_MARK_GAP_MM = 2;
export const CROP_MARK_LENGTH_MM = 5;
export const CROP_MARK_LINE_MM = 0.25;

/** Calibration page: a square and a ruler of known size to check the printer's scale. */
export const CALIBRATION_SQUARE_MM = 50;
export const CALIBRATION_RULER_MM = 150;

/** Converts millimetres to PDF points (1/72 inch). */
export function mmToPt(mm: number): number {
  return Number(((mm / MM_PER_INCH) * POINTS_PER_INCH).toFixed(9));
}

export interface LabelSize {
  widthMm: number;
  heightMm: number;
}

/** Sizes offered in the editor. The first one is the default for new designs. Add more here. */
export const LABEL_SIZE_PRESETS: readonly LabelSize[] = [
  { widthMm: LABEL_WIDTH_MM, heightMm: LABEL_HEIGHT_MM },
];

/** Range for custom label sizes (each side). Assumption. */
export const MIN_LABEL_SIZE_MM = 30;
export const MAX_LABEL_SIZE_MM = 300;

export function isValidLabelSize({ widthMm, heightMm }: LabelSize): boolean {
  return [widthMm, heightMm].every(
    (side) => Number.isFinite(side) && side >= MIN_LABEL_SIZE_MM && side <= MAX_LABEL_SIZE_MM,
  );
}

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
export function labelSizeWithBleedPx(
  dpi: number,
  size: LabelSize = { widthMm: LABEL_WIDTH_MM, heightMm: LABEL_HEIGHT_MM },
): PixelSize {
  return {
    width: mmToPx(size.widthMm + 2 * BLEED_MM, dpi),
    height: mmToPx(size.heightMm + 2 * BLEED_MM, dpi),
  };
}
