import { describe, expect, it } from 'vitest';
import { DEFAULT_BOTTLE_ID } from '../model/schema';
import { BOTTLES, bottleShape, radiusAt } from './bottles';

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
