import { describe, expect, it } from 'vitest';
import { SLOW_FRAME_MS, isTooSlow } from './performance';

describe('isTooSlow', () => {
  it('accepts fast frames', () => {
    expect(isTooSlow([5, 8, 6])).toBe(false);
  });

  it('rejects frames slower than the limit', () => {
    expect(isTooSlow([SLOW_FRAME_MS + 1, SLOW_FRAME_MS + 5, SLOW_FRAME_MS + 2])).toBe(true);
  });

  it('uses the median, so one slow first frame (shader compile) does not count', () => {
    expect(isTooSlow([SLOW_FRAME_MS * 4, 10, 12])).toBe(false);
  });

  it('allows a limit that keeps dragging usable', () => {
    // At most about 7 frames per second; slower feels broken when turning the bottle.
    expect(SLOW_FRAME_MS).toBeLessThanOrEqual(150);
  });

  it('is not too slow without measurements', () => {
    expect(isTooSlow([])).toBe(false);
  });
});
