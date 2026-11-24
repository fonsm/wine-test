import { describe, expect, it } from 'vitest';
import {
  BLEED_MM,
  EXPORT_DPI,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  SAFE_MARGIN_MM,
  LABEL_SIZE_PRESETS,
  MAX_LABEL_SIZE_MM,
  MIN_LABEL_SIZE_MM,
  isValidLabelSize,
  labelSizeWithBleedPx,
  mmToPx,
  mmToPt,
  A4_PAPER,
  TEXT_EXPORT_DPI,
  CALIBRATION_SQUARE_MM,
  CALIBRATION_RULER_MM,
} from './geometry';

describe('print geometry', () => {
  it('holds the assumed label constants from AGENTS.md', () => {
    expect(LABEL_WIDTH_MM).toBe(90);
    expect(LABEL_HEIGHT_MM).toBe(120);
    expect(EXPORT_DPI).toBe(300);
    expect(BLEED_MM).toBe(3);
    expect(SAFE_MARGIN_MM).toBe(3);
  });

  it('converts millimetres to pixels at a given DPI', () => {
    expect(mmToPx(25.4, 300)).toBe(300);
    expect(mmToPx(0, 300)).toBe(0);
  });

  it('rounds partial pixels up so the print area is always covered', () => {
    // 96 mm at 300 DPI = 1133.86 px
    expect(mmToPx(96, 300)).toBe(1134);
  });

  it('calculates the full label size including bleed on both sides', () => {
    expect(labelSizeWithBleedPx(EXPORT_DPI)).toEqual({
      width: mmToPx(LABEL_WIDTH_MM + 2 * BLEED_MM, EXPORT_DPI),
      height: mmToPx(LABEL_HEIGHT_MM + 2 * BLEED_MM, EXPORT_DPI),
    });
  });

  it('calculates the size with bleed for any label size', () => {
    expect(labelSizeWithBleedPx(EXPORT_DPI, { widthMm: 100, heightMm: 140 })).toEqual({
      width: mmToPx(100 + 2 * BLEED_MM, EXPORT_DPI),
      height: mmToPx(140 + 2 * BLEED_MM, EXPORT_DPI),
    });
  });
});

describe('label sizes', () => {
  it('offers the default size as the first preset', () => {
    expect(LABEL_SIZE_PRESETS[0]).toEqual({ widthMm: LABEL_WIDTH_MM, heightMm: LABEL_HEIGHT_MM });
  });

  it('allows custom sizes from 30 to 300 mm', () => {
    expect(MIN_LABEL_SIZE_MM).toBe(30);
    expect(MAX_LABEL_SIZE_MM).toBe(300);
    expect(isValidLabelSize({ widthMm: 30, heightMm: 300 })).toBe(true);
    expect(isValidLabelSize({ widthMm: 100.5, heightMm: 140 })).toBe(true);
    expect(isValidLabelSize({ widthMm: 29.9, heightMm: 100 })).toBe(false);
    expect(isValidLabelSize({ widthMm: 100, heightMm: 301 })).toBe(false);
    expect(isValidLabelSize({ widthMm: Number.NaN, heightMm: 100 })).toBe(false);
  });
});

describe('PDF geometry', () => {
  it('converts millimetres to PDF points (1/72 inch)', () => {
    expect(mmToPt(25.4)).toBe(72);
    expect(mmToPt(210)).toBeCloseTo(595.28, 2);
    expect(mmToPt(297)).toBeCloseTo(841.89, 2);
  });

  it('uses A4 portrait paper for home printers and calibration', () => {
    expect(A4_PAPER).toEqual({ widthMm: 210, heightMm: 297 });
  });

  it('draws text at twice the image resolution, so small type stays sharp', () => {
    expect(TEXT_EXPORT_DPI).toBe(2 * EXPORT_DPI);
  });

  it('has a calibration square and ruler that fit on A4 with room for the printer margin', () => {
    expect(CALIBRATION_SQUARE_MM).toBe(50);
    expect(CALIBRATION_RULER_MM).toBe(150);
    expect(CALIBRATION_RULER_MM).toBeLessThanOrEqual(A4_PAPER.widthMm - 40);
  });
});
