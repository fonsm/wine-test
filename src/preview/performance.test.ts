import { describe, expect, it } from 'vitest';
import {
  FALLBACK_PIXEL_RATIO,
  SLOW_FRAME_MS,
  chooseQuality,
  decideQuality,
  isTooSlow,
  type QualityProbe,
} from './performance';

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

describe('decideQuality', () => {
  const fast = [10, 12, 11];
  const slow = [SLOW_FRAME_MS * 2, SLOW_FRAME_MS * 2, SLOW_FRAME_MS * 2];

  it('keeps 3D when the frames are fast enough', () => {
    expect(decideQuality(fast, 2)).toBe('keep');
    expect(decideQuality(fast, FALLBACK_PIXEL_RATIO)).toBe('keep');
  });

  it('first tries a lower resolution on sharp (high pixel ratio) screens', () => {
    expect(decideQuality(slow, 2)).toBe('lower');
    expect(decideQuality(slow, 1.5)).toBe('lower');
  });

  it('switches to the flat preview only when already at the lowest resolution', () => {
    expect(decideQuality(slow, FALLBACK_PIXEL_RATIO)).toBe('flat');
    expect(decideQuality(slow, 0.75)).toBe('flat');
  });

  it('falls back to one canvas pixel per CSS pixel, never blurrier', () => {
    expect(FALLBACK_PIXEL_RATIO).toBe(1);
  });
});

describe('chooseQuality', () => {
  const FAST = [10, 10, 10];
  const SLOW = [SLOW_FRAME_MS * 2, SLOW_FRAME_MS * 2, SLOW_FRAME_MS * 2];

  /** A viewer whose measurements come from a list; records what happens. */
  function probe(startRatio: number, results: number[][]) {
    const log: string[] = [];
    let ratio = startRatio;
    const fake: QualityProbe = {
      measure: () => {
        log.push(`measure@${String(ratio)}`);
        return results.shift() ?? FAST;
      },
      pixelRatio: () => ratio,
      setPixelRatio: (next) => {
        ratio = next;
        log.push(`ratio=${String(next)}`);
      },
    };
    const wait = () => {
      log.push('wait');
      return Promise.resolve();
    };
    return { fake, wait, log };
  }

  it('keeps 3D after one fast measurement', async () => {
    const { fake, wait, log } = probe(2, [FAST]);
    expect(await chooseQuality(fake, wait)).toBe('3d');
    expect(log).toEqual(['measure@2']);
  });

  it('lowers the resolution first, and keeps 3D if that is fast enough', async () => {
    const { fake, wait, log } = probe(2, [SLOW, FAST]);
    expect(await chooseQuality(fake, wait)).toBe('3d');
    expect(log).toEqual(['measure@2', 'ratio=1', 'measure@1']);
  });

  it('measures once more after a pause, so a busy moment does not decide', async () => {
    const { fake, wait, log } = probe(1, [SLOW, FAST]);
    expect(await chooseQuality(fake, wait)).toBe('3d');
    expect(log).toEqual(['measure@1', 'wait', 'measure@1']);
  });

  it('shows the flat preview when it stays slow at the lowest resolution', async () => {
    const { fake, wait, log } = probe(2, [SLOW, SLOW, SLOW]);
    expect(await chooseQuality(fake, wait)).toBe('flat');
    expect(log).toEqual(['measure@2', 'ratio=1', 'measure@1', 'wait', 'measure@1']);
  });
});
