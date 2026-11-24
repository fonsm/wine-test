import { describe, expect, it } from 'vitest';
import { fromNodePosition, pointsToMm, toNodePosition } from './units';

describe('pointsToMm', () => {
  it('converts typographic points to millimetres', () => {
    expect(pointsToMm(72)).toBeCloseTo(25.4);
  });
});

describe('model box ↔ Konva node position', () => {
  const box = { x: 10, y: 20, width: 40, height: 10 };

  it('is the top-left corner times the scale without rotation', () => {
    expect(toNodePosition({ ...box, rotation: 0 }, 2)).toEqual({ x: 20, y: 40 });
  });

  it('rotates around the box centre: 180° puts the node origin at the bottom-right', () => {
    const position = toNodePosition({ ...box, rotation: 180 }, 1);
    expect(position.x).toBeCloseTo(50);
    expect(position.y).toBeCloseTo(30);
  });

  it('keeps the centre in place for any rotation', () => {
    for (const rotation of [0, 30, 90, 135, 270, 359]) {
      const position = toNodePosition({ ...box, rotation }, 1);
      const rad = (rotation * Math.PI) / 180;
      const centreX =
        position.x + (box.width / 2) * Math.cos(rad) - (box.height / 2) * Math.sin(rad);
      const centreY =
        position.y + (box.width / 2) * Math.sin(rad) + (box.height / 2) * Math.cos(rad);
      expect(centreX).toBeCloseTo(30);
      expect(centreY).toBeCloseTo(25);
    }
  });

  it('converts back to the same model position', () => {
    for (const rotation of [0, 45, 90, 200]) {
      const position = toNodePosition({ ...box, rotation }, 3.5);
      const back = fromNodePosition(
        position,
        { width: box.width, height: box.height, rotation },
        3.5,
      );
      expect(back.x).toBeCloseTo(box.x);
      expect(back.y).toBeCloseTo(box.y);
    }
  });
});
