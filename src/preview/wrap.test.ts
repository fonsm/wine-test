import { describe, expect, it } from 'vitest';
import { bottleShape } from '../templates/catalog';
import { LABEL_GAP_MM, labelWrap } from './wrap';

const bottle = bottleShape('bordeaux-750');
const radius = bottle.bodyRadiusMm + LABEL_GAP_MM;
const zoneHeight = bottle.labelZone.topMm - bottle.labelZone.bottomMm;

describe('labelWrap', () => {
  it('wraps the label width as arc length, so the print is not stretched', () => {
    const wrap = labelWrap({ widthMm: 90, heightMm: 120 }, bottle);
    expect(wrap.radiusMm).toBe(radius);
    expect(wrap.thetaLength * wrap.radiusMm).toBeCloseTo(90, 9);
    expect(wrap.heightMm).toBe(120);
  });

  it('centres the label on the front of the bottle (facing +z)', () => {
    const wrap = labelWrap({ widthMm: 90, heightMm: 120 }, bottle);
    expect(wrap.thetaStart).toBeCloseTo(-wrap.thetaLength / 2, 12);
  });

  it('centres the label in the straight part of the body', () => {
    const wrap = labelWrap({ widthMm: 90, heightMm: 120 }, bottle);
    const { bottomMm, topMm } = bottle.labelZone;
    expect(wrap.centerYMm).toBe((bottomMm + topMm) / 2);
    expect(wrap.centerYMm - wrap.heightMm / 2).toBeGreaterThanOrEqual(bottomMm);
  });

  it('shows the whole label image when it fits', () => {
    expect(labelWrap({ widthMm: 90, heightMm: 120 }, bottle).uv).toEqual({
      repeatX: 1,
      repeatY: 1,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it('wraps at most once around, showing the middle of a wider label', () => {
    const circumference = 2 * Math.PI * radius;
    const wrap = labelWrap({ widthMm: 300, heightMm: 100 }, bottle);
    expect(wrap.thetaLength).toBeCloseTo(2 * Math.PI, 12);
    expect(wrap.uv.repeatX).toBeCloseTo(circumference / 300, 12);
    expect(wrap.uv.offsetX).toBeCloseTo((1 - circumference / 300) / 2, 12);
  });

  it('stays on the straight body, showing the middle of a taller label', () => {
    const wrap = labelWrap({ widthMm: 90, heightMm: 300 }, bottle);
    expect(wrap.heightMm).toBe(zoneHeight);
    expect(wrap.uv.repeatY).toBeCloseTo(zoneHeight / 300, 12);
    expect(wrap.uv.offsetY).toBeCloseTo((1 - zoneHeight / 300) / 2, 12);
  });
});
