import { describe, expect, it } from 'vitest';
import { BLEED_MM, LABEL_HEIGHT_MM, LABEL_WIDTH_MM, SAFE_MARGIN_MM } from '../print/geometry';
import { createEmptyDesign } from '../model/schema';
import { sampleDesign } from '../model/testing/fixtures';
import { snapGuides, snapBox } from './snap';

const W = LABEL_WIDTH_MM;
const H = LABEL_HEIGHT_MM;

describe('snapGuides', () => {
  it('includes bleed, trim edges, safe margins and the centre of the label', () => {
    const guides = snapGuides(createEmptyDesign(), null);
    expect(guides.vertical).toEqual(
      expect.arrayContaining([
        -BLEED_MM,
        0,
        SAFE_MARGIN_MM,
        W / 2,
        W - SAFE_MARGIN_MM,
        W,
        W + BLEED_MM,
      ]),
    );
    expect(guides.horizontal).toEqual(expect.arrayContaining([0, H / 2, H]));
  });

  it('includes edges and centres of other unrotated elements, not of the moved one', () => {
    // "frame" is at x 5..85; "title" is rotated and therefore not a guide.
    const guides = snapGuides(sampleDesign(), 'logo');
    expect(guides.vertical).toEqual(expect.arrayContaining([5, 45, 85]));
    expect(guides.vertical).not.toContain(10.25);
    const own = snapGuides(sampleDesign(), 'frame');
    expect(own.vertical).not.toContain(85);
  });
});

describe('snapBox', () => {
  const guides = { vertical: [0, 45, 90], horizontal: [0, 60, 120] };

  it('snaps the left edge, centre or right edge to the nearest guide within the threshold', () => {
    expect(snapBox({ x: 1, y: 30, width: 20, height: 10, rotation: 0 }, guides, 2)).toMatchObject({
      x: 0,
      vertical: 0,
    });
    expect(snapBox({ x: 34, y: 30, width: 20, height: 10, rotation: 0 }, guides, 2)).toMatchObject({
      x: 35,
      vertical: 45,
    });
    expect(snapBox({ x: 69, y: 30, width: 20, height: 10, rotation: 0 }, guides, 2)).toMatchObject({
      x: 70,
      vertical: 90,
    });
  });

  it('snaps horizontally and vertically independently', () => {
    expect(snapBox({ x: 34.5, y: 54.2, width: 20, height: 10, rotation: 0 }, guides, 2)).toEqual({
      x: 35,
      y: 55,
      vertical: 45,
      horizontal: 60,
    });
  });

  it('does not snap outside the threshold', () => {
    expect(snapBox({ x: 10, y: 30, width: 20, height: 10, rotation: 0 }, guides, 2)).toEqual({
      x: 10,
      y: 30,
      vertical: null,
      horizontal: null,
    });
  });

  it('snaps only the centre of rotated elements', () => {
    expect(
      snapBox({ x: 1, y: 30, width: 20, height: 10, rotation: 30 }, guides, 2).vertical,
    ).toBeNull();
    expect(snapBox({ x: 34, y: 30, width: 20, height: 10, rotation: 30 }, guides, 2)).toMatchObject(
      {
        x: 35,
        vertical: 45,
      },
    );
  });
});
