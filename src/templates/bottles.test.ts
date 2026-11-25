import { describe, expect, it } from 'vitest';
import { DEFAULT_BOTTLE_ID } from '../model/schema';
import { bottleFromParams, bottleParamsSchema, radiusAt } from './bottles';
import bordeaux from './data/bottles/bordeaux-750.json';
import { loadBottles } from './catalog';
import { ORIGINAL_BORDEAUX_PROFILE } from './testing/bordeauxProfile';
import { BOTTLES, bottleShape } from './catalog';

describe('bottles', () => {
  it('has a shape for the default bottle of new designs', () => {
    expect(bottleShape(DEFAULT_BOTTLE_ID).id).toBe(DEFAULT_BOTTLE_ID);
  });

  it('falls back to the default bottle for unknown ids from files', () => {
    expect(bottleShape('magnum-1500').id).toBe(DEFAULT_BOTTLE_ID);
  });

  for (const bottle of BOTTLES) {
    describe(bottle.id, () => {
      it('has a profile from the bottom centre to the closed top, going upwards', () => {
        const { profile } = bottle;
        expect(profile[0]).toEqual({ r: 0, y: 0 });
        expect(profile.at(-1)).toEqual({ r: 0, y: bottle.heightMm });
        for (let i = 1; i < profile.length; i++) {
          const previous = profile[i - 1];
          const point = profile[i];
          if (!previous || !point) throw new Error('missing point');
          expect(point.y, `point ${String(i)}`).toBeGreaterThanOrEqual(previous.y);
          expect(point.r).toBeGreaterThanOrEqual(0);
        }
      });

      it('is a straight cylinder where labels go', () => {
        const { bottomMm, topMm } = bottle.labelZone;
        expect(topMm).toBeGreaterThan(bottomMm);
        for (let y = bottomMm; y <= topMm; y += 1) {
          expect(radiusAt(bottle, y), `y = ${String(y)}`).toBeCloseTo(bottle.bodyRadiusMm, 6);
        }
      });
    });
  }

  it('Bordeaux 750 ml: about 300 mm high and 76 mm wide', () => {
    const bordeaux = bottleShape('bordeaux-750');
    expect(bordeaux.heightMm).toBe(300);
    expect(bordeaux.bodyRadiusMm * 2).toBe(76);
  });
});

describe('bottle data files', () => {
  it('offers four 750 ml bottles, the default first', () => {
    expect(BOTTLES.map((bottle) => bottle.id)).toEqual([
      'bordeaux-750',
      'burgundy-750',
      'schlegel-750',
      'sparkling-750',
    ]);
  });

  it('keeps the Bordeaux shape exactly as before', () => {
    const { profile } = bottleShape('bordeaux-750');
    expect(profile).toHaveLength(ORIGINAL_BORDEAUX_PROFILE.length);
    profile.forEach((point, index) => {
      const original = ORIGINAL_BORDEAUX_PROFILE[index];
      expect(point.r, `r ${String(index)}`).toBeCloseTo(original?.r ?? NaN, 6);
      expect(point.y, `y ${String(index)}`).toBeCloseTo(original?.y ?? NaN, 6);
    });
  });

  it('has realistic proportions', () => {
    const [bordeaux, burgundy, schlegel, sparkling] = [
      'bordeaux-750',
      'burgundy-750',
      'schlegel-750',
      'sparkling-750',
    ].map(bottleShape);
    if (!bordeaux || !burgundy || !schlegel || !sparkling) throw new Error('bottle missing');
    for (const bottle of BOTTLES) {
      expect(bottle.heightMm).toBeGreaterThanOrEqual(280);
      expect(bottle.heightMm).toBeLessThanOrEqual(360);
      expect(bottle.bodyRadiusMm * 2).toBeGreaterThanOrEqual(70);
      expect(bottle.bodyRadiusMm * 2).toBeLessThanOrEqual(95);
    }
    expect(schlegel.heightMm).toBeGreaterThan(bordeaux.heightMm);
    expect(schlegel.bodyRadiusMm).toBeLessThan(bordeaux.bodyRadiusMm);
    expect(burgundy.bodyRadiusMm).toBeGreaterThan(bordeaux.bodyRadiusMm);
    expect(sparkling.bodyRadiusMm).toBeGreaterThan(burgundy.bodyRadiusMm);
  });
});

describe('bottleParamsSchema', () => {
  const valid = {
    id: 'test-bottle',
    heightMm: 300,
    bodyDiameterMm: 76,
    bodyTopMm: 200,
    neckDiameterMm: 29,
    neckBottomMm: 252,
    shoulderCurve: 0.5,
    labelZone: { bottomMm: 12, topMm: 196 },
    capsuleBottomMm: 262,
    glassColor: '#1f3a24',
    capsuleColor: '#7b1e3a',
  };

  it('accepts a complete bottle', () => {
    expect(bottleParamsSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['an unknown field', { ...valid, volumeMl: 750 }],
    ['a neck wider than the body', { ...valid, neckDiameterMm: 80 }],
    ['a label zone reaching the shoulder', { ...valid, labelZone: { bottomMm: 12, topMm: 210 } }],
    ['a label zone on the rounded base', { ...valid, labelZone: { bottomMm: 1, topMm: 196 } }],
    ['a shoulder above the neck', { ...valid, bodyTopMm: 260 }],
    ['a neck reaching into the lip', { ...valid, neckBottomMm: 295 }],
    ['a capsule below the shoulder', { ...valid, capsuleBottomMm: 150 }],
    ['a colour that is not #rrggbb', { ...valid, glassColor: 'green' }],
    ['a shoulder curve above 1', { ...valid, shoulderCurve: 2 }],
  ])('rejects %s', (_, params) => {
    expect(bottleParamsSchema.safeParse(params).success).toBe(false);
  });
});

describe('loadBottles', () => {
  const params = (id: string) => ({
    id,
    heightMm: 300,
    bodyDiameterMm: 76,
    bodyTopMm: 200,
    neckDiameterMm: 29,
    neckBottomMm: 252,
    shoulderCurve: 0.5,
    labelZone: { bottomMm: 12, topMm: 196 },
    capsuleBottomMm: 262,
    glassColor: '#1f3a24',
    capsuleColor: '#7b1e3a',
  });

  it('turns valid files into shapes, sorted by id', () => {
    const bottles = loadBottles({
      './data/bottles/b.json': params('b'),
      './data/bottles/a.json': params('a'),
    });
    expect(bottles.map((bottle) => bottle.id)).toEqual(['a', 'b']);
  });

  it('refuses a file whose id does not match its file name', () => {
    expect(() => loadBottles({ './data/bottles/a.json': params('b') })).toThrow(/a\.json/);
  });

  it('refuses an invalid file and names it', () => {
    expect(() =>
      loadBottles({ './data/bottles/a.json': { ...params('a'), heightMm: 'tall' } }),
    ).toThrow(/a\.json.*heightMm/);
  });
});

describe('narrow bottles (for example typed in a shop admin)', () => {
  const narrow = (bodyDiameterMm: number) => ({
    ...bordeaux,
    bodyDiameterMm,
    neckDiameterMm: bodyDiameterMm / 2,
  });

  it('rejects a body too narrow for the rounded base edge (it would get a negative radius)', () => {
    for (const diameter of [2, 6, 8]) {
      const result = bottleParamsSchema.safeParse(narrow(diameter));
      expect(result.success, `${String(diameter)} mm`).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('bodyDiameterMm');
    }
  });

  it('accepts the narrowest valid body, and its outline never has a negative radius', () => {
    const result = bottleParamsSchema.safeParse(narrow(8.2));
    expect(result.success).toBe(true);
    if (!result.success) return;
    for (const point of bottleFromParams(result.data).profile) {
      expect(point.r).toBeGreaterThanOrEqual(0);
    }
  });
});
