import { describe, expect, it } from 'vitest';
import fontsCss from '../fonts/fonts.css?raw';
import { FONTS } from '../fonts/fonts';
import {
  EMBED_FONT_PREFIX,
  createFontPreparer,
  embedFontFaces,
  facesForSpecs,
  parseFontFaces,
} from './fontFaces';

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

  it('ships each font as data in its own script, loaded on demand (Shopify accepts no font files)', async () => {
    const faces = embedFontFaces();
    expect(faces).toHaveLength(parseFontFaces(fontsCss).length);
    for (const face of faces) {
      // Registered under the app's own names, never under a name a shop theme may use.
      expect(face.pageFamily).toBe(`${EMBED_FONT_PREFIX}${face.family}`);
    }
    const data = await faces[0]?.load();
    expect(data).toMatch(/^data:font\/ttf;base64,AAEAAA/);
  });

  it('picks the faces a font shorthand needs: family and style', () => {
    const faces = embedFontFaces();
    const names = (specs: string[]) =>
      facesForSpecs(specs, faces).map((face) => `${face.family} ${face.descriptors.style}`);
    expect(names(['italic bold 16px "WLD Playfair Display", serif'])).toEqual([
      'Playfair Display italic',
    ]);
    expect(
      names([
        'normal normal 16px "WLD Inter", sans-serif',
        'normal bold 16px "WLD Inter", sans-serif',
      ]),
    ).toEqual(['Inter normal']);
    expect(names(['normal normal 16px serif', 'normal normal 16px "Inter", sans-serif'])).toEqual(
      [],
    );
  });

  it('uses the normal face for italic text when a font has no italic (like the browser does)', () => {
    const faces = embedFontFaces();
    expect(
      facesForSpecs(['italic normal 16px "WLD Great Vibes", cursive'], faces).map(
        (face) => `${face.family} ${face.descriptors.style}`,
      ),
    ).toEqual(['Great Vibes normal']);
  });

  it('waits for every needed face, even when another one fails to load', async () => {
    const added: string[] = [];
    let finishSlow: (data: string) => void = () => undefined;
    const faces = embedFontFaces().map((face) => ({
      ...face,
      load: () =>
        face.family === 'Inter'
          ? Promise.reject(new Error('offline'))
          : new Promise<string>((resolve) => {
              finishSlow = resolve;
            }),
    }));
    const prepare = createFontPreparer(
      { add: (face: { family: string }) => added.push(face.family) },
      faces,
      (family) => ({ family }),
    );
    let settled = false;
    const done = prepare([
      'normal normal 16px "WLD Inter", sans-serif',
      'normal normal 16px "WLD Great Vibes", cursive',
    ]).then(
      () => (settled = true),
      () => (settled = true),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).toBe(false);
    finishSlow('data:font/ttf;base64,AAEAAA');
    await done;
    expect(added).toEqual(['WLD Great Vibes']);
  });

  it('adds each needed face to the page once, from its data, also for overlapping calls', async () => {
    const added: string[] = [];
    let loads = 0;
    const faces = embedFontFaces().map((face) => ({
      ...face,
      load: () => {
        loads += 1;
        return Promise.resolve(`data:font/ttf;base64,${face.file}`);
      },
    }));
    const prepare = createFontPreparer(
      {
        add: (face: { family: string; source: string }) =>
          added.push(`${face.family} ${face.source}`),
      },
      faces,
      (family, source) => ({ family, source }),
    );
    const spec = 'normal normal 16px "WLD Great Vibes", cursive';
    await Promise.all([prepare([spec]), prepare([spec])]);
    await prepare([spec]);
    expect(loads).toBe(1);
    expect(added).toEqual(['WLD Great Vibes url(data:font/ttf;base64,GreatVibes-Regular.ttf)']);
  });

  it('rejects rules without a family or a file', () => {
    expect(() => parseFontFaces('@font-face { font-family: X; }')).toThrow(/X/);
  });
});
