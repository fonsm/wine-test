import { describe, expect, it } from 'vitest';
import { renderSizePx } from './resolution';

describe('renderSizePx', () => {
  it('scales the longer side to the maximum and keeps the aspect ratio', () => {
    expect(renderSizePx({ widthMm: 90, heightMm: 120 }, 1024)).toEqual({
      width: 768,
      height: 1024,
      pxPerMm: 1024 / 120,
    });
    expect(renderSizePx({ widthMm: 300, heightMm: 30 }, 1024)).toEqual({
      width: 1024,
      height: 102,
      pxPerMm: 1024 / 300,
    });
  });

  it('never makes a side smaller than 1 px', () => {
    expect(renderSizePx({ widthMm: 300, heightMm: 30 }, 4).height).toBe(1);
  });
});
