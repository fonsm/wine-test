import { describe, expect, it } from 'vitest';
import { arcAtScreenX } from './flat';

describe('arcAtScreenX', () => {
  const radius = 38;

  it('is the arc length from the front for a screen offset from the bottle axis', () => {
    expect(arcAtScreenX(0, radius)).toBe(0);
    // Seen from the front, the side of the cylinder (90°) is at x = radius.
    expect(arcAtScreenX(radius, radius)).toBeCloseTo((Math.PI / 2) * radius, 9);
    expect(arcAtScreenX(-radius / 2, radius)).toBeCloseTo(-Math.asin(0.5) * radius, 9);
  });

  it('is squeezed towards the sides, like a real curved label', () => {
    const arc = (x: number) => arcAtScreenX(x, radius) ?? Number.NaN;
    const near = arc(10) - arc(0);
    const far = arc(radius) - arc(radius - 10);
    expect(far).toBeGreaterThan(near);
  });

  it('is null outside the bottle', () => {
    expect(arcAtScreenX(radius + 0.01, radius)).toBeNull();
  });
});
