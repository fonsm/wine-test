import { describe, expect, it } from 'vitest';
import {
  BLEED_MM,
  EXPORT_DPI,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  SAFE_MARGIN_MM,
  labelSizeWithBleedPx,
  mmToPx,
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
});
