import { describe, expect, it } from 'vitest';
import fontsCss from '../fonts/fonts.css?raw';
import { FONTS } from '../fonts/fonts';
import { embedFontFaces, parseFontFaces } from './fontFaces';

describe('font faces for the embedded app', () => {
  it('reads every @font-face rule of fonts.css (the single source of the font files)', () => {
    const faces = parseFontFaces(fontsCss);
    expect(faces).toHaveLength(fontsCss.match(/@font-face/g)?.length ?? 0);
    expect(new Set(faces.map((face) => face.family))).toEqual(
      new Set(FONTS.map((font) => font.family)),
    );
    expect(faces[0]).toEqual({
      family: 'Playfair Display',
      file: 'PlayfairDisplay-Variable.ttf',
      descriptors: { weight: '400 900', style: 'normal', display: 'swap' },
    });
  });

  it("finds each font file among the app's built files", () => {
    const faces = embedFontFaces();
    expect(faces).toHaveLength(parseFontFaces(fontsCss).length);
    for (const face of faces) expect(face.url).toMatch(/\.ttf$/);
  });

  it('rejects rules without a family or a file', () => {
    expect(() => parseFontFaces('@font-face { font-family: X; }')).toThrow(/X/);
  });
});
