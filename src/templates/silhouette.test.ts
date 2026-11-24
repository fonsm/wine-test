import { describe, expect, it } from 'vitest';
import { bottleShape } from './catalog';
import { silhouette } from './silhouette';

describe('silhouette', () => {
  const bottle = bottleShape('schlegel-750');
  const shape = silhouette(bottle);

  it('spans the widest point and the full height, top of the bottle at y = 0', () => {
    const widest = Math.max(...bottle.profile.map((point) => point.r));
    expect(shape.viewBox).toEqual({ x: -widest, y: 0, width: 2 * widest, height: bottle.heightMm });
  });

  it('is a closed outline, mirrored around the axis', () => {
    expect(shape.outline.startsWith('M ')).toBe(true);
    expect(shape.outline.endsWith(' Z')).toBe(true);
    const numbers = shape.outline.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const xs = numbers.filter((_, index) => index % 2 === 0);
    expect(Math.min(...xs)).toBeCloseTo(-Math.max(...xs), 6);
  });

  it('marks where the capsule starts, measured from the top', () => {
    expect(shape.capsuleHeight).toBeCloseTo(bottle.heightMm - bottle.capsuleBottomMm, 9);
  });
});
