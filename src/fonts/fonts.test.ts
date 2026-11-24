import { describe, expect, it } from 'vitest';
import { DEFAULT_FONT_FAMILY, FONTS, cssFontFamily } from './fonts';

describe('fonts', () => {
  it('offers the four bundled fonts', () => {
    expect(FONTS.map((font) => font.family)).toEqual([
      'Playfair Display',
      'EB Garamond',
      'Inter',
      'Great Vibes',
    ]);
    expect(FONTS.map((font) => font.family)).toContain(DEFAULT_FONT_FAMILY);
  });

  it('builds a quoted CSS font family with a generic fallback', () => {
    expect(cssFontFamily('Playfair Display')).toBe('"Playfair Display", serif');
    expect(cssFontFamily('Inter')).toBe('"Inter", sans-serif');
    expect(cssFontFamily('Great Vibes')).toBe('"Great Vibes", cursive');
  });

  it('passes generic families through and quotes unknown ones safely', () => {
    expect(cssFontFamily('serif')).toBe('serif');
    expect(cssFontFamily('My "Font"; x')).toBe('"My Font x", sans-serif');
  });
});
