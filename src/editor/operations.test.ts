import { describe, expect, it } from 'vitest';
import { createEmptyDesign, designSchema, type Design, type DesignElement } from '../model/schema';
import { JPEG_DATA_URL, PNG_DATA_URL, sampleDesign } from '../model/testing/fixtures';
import {
  MIN_ELEMENT_SIZE_MM,
  NEW_IMAGE_MAX_FRACTION,
  addImageElement,
  addTextElement,
  deleteElement,
  normalizeRotation,
  reorderElement,
  resizeLabel,
  updateElement,
} from './operations';

const ids = (design: Design) => design.elements.map((element) => element.id);
const byId = (design: Design, id: string): DesignElement => {
  const element = design.elements.find((candidate) => candidate.id === id);
  if (!element) throw new Error(`no element ${id}`);
  return element;
};
const valid = (design: Design) => {
  expect(designSchema.safeParse(design).success).toBe(true);
};

describe('addTextElement', () => {
  it('adds a centred text element on top', () => {
    const design = addTextElement(createEmptyDesign(), {
      id: 't1',
      text: 'Riesling',
      fontFamily: 'Inter',
    });
    valid(design);
    const text = byId(design, 't1');
    expect(text).toMatchObject({ type: 'text', text: 'Riesling', rotation: 0, opacity: 1 });
    expect(text.type === 'text' && text.style.fontFamily).toBe('Inter');
    expect(text.x + text.width / 2).toBeCloseTo(design.labelSize.widthMm / 2);
  });

  it('places further text elements so they do not cover each other exactly', () => {
    let design = addTextElement(createEmptyDesign(), { id: 'a', text: 'A', fontFamily: 'Inter' });
    design = addTextElement(design, { id: 'b', text: 'B', fontFamily: 'Inter' });
    expect(byId(design, 'b').y).not.toBe(byId(design, 'a').y);
    expect(ids(design)).toEqual(['a', 'b']);
  });
});

describe('addImageElement', () => {
  it('adds the image as an asset and fits it into the label, keeping its aspect ratio', () => {
    const design = addImageElement(createEmptyDesign(), {
      elementId: 'i1',
      assetId: 'a1',
      dataUrl: PNG_DATA_URL,
      widthPx: 2000,
      heightPx: 1000,
    });
    valid(design);
    const image = byId(design, 'i1');
    expect(design.assets).toEqual({ a1: { dataUrl: PNG_DATA_URL } });
    expect(image).toMatchObject({ type: 'image', assetId: 'a1' });
    expect(image.width / image.height).toBeCloseTo(2);
    expect(image.width).toBeCloseTo(design.labelSize.widthMm * NEW_IMAGE_MAX_FRACTION);
    expect(image.x + image.width / 2).toBeCloseTo(design.labelSize.widthMm / 2);
    expect(image.y + image.height / 2).toBeCloseTo(design.labelSize.heightMm / 2);
  });

  it('stores an image used twice only once', () => {
    const add = (design: Design, elementId: string, assetId: string) =>
      addImageElement(design, {
        elementId,
        assetId,
        dataUrl: PNG_DATA_URL,
        widthPx: 10,
        heightPx: 10,
      });
    const design = add(add(createEmptyDesign(), 'i1', 'a1'), 'i2', 'a2');
    expect(Object.keys(design.assets)).toEqual(['a1']);
    expect(byId(design, 'i2')).toMatchObject({ assetId: 'a1' });
  });
});

describe('updateElement', () => {
  it('changes position, size, rotation and text style', () => {
    const design = updateElement(sampleDesign(), 'title', {
      x: 1,
      y: 2,
      width: 30,
      height: 10,
      rotation: 45,
      text: 'Spätburgunder',
      style: { fontSizePt: 24, color: '#336699', align: 'left' },
    });
    valid(design);
    expect(byId(design, 'title')).toMatchObject({
      x: 1,
      y: 2,
      width: 30,
      height: 10,
      rotation: 45,
      text: 'Spätburgunder',
      style: { fontSizePt: 24, color: '#336699', align: 'left', fontFamily: 'serif' },
    });
  });

  it('does not change other elements and keeps the original design untouched', () => {
    const original = sampleDesign();
    const design = updateElement(original, 'title', { x: 5 });
    expect(byId(design, 'frame')).toBe(byId(original, 'frame'));
    expect(byId(original, 'title').x).toBe(10.25);
  });

  it('normalises rotation and rounds lengths to 0.01 mm', () => {
    const design = updateElement(sampleDesign(), 'title', { rotation: -90, x: 1.23456 });
    expect(byId(design, 'title')).toMatchObject({ rotation: 270, x: 1.23 });
  });

  it('keeps elements at least the minimum size', () => {
    const design = updateElement(sampleDesign(), 'title', { width: 0, height: -5 });
    expect(byId(design, 'title')).toMatchObject({
      width: MIN_ELEMENT_SIZE_MM,
      height: MIN_ELEMENT_SIZE_MM,
    });
  });

  it('returns the same design for unknown ids and invalid values', () => {
    const design = sampleDesign();
    expect(updateElement(design, 'nope', { x: 1 })).toBe(design);
    expect(updateElement(design, 'title', { style: { color: 'red' } })).toBe(design);
    expect(updateElement(design, 'title', { style: { fontSizePt: 0 } })).toBe(design);
    expect(updateElement(design, 'title', { x: Number.NaN })).toBe(design);
  });

  it('ignores text fields on non-text elements', () => {
    const design = updateElement(sampleDesign(), 'bg', { text: 'x', style: { fontSizePt: 99 } });
    expect(byId(design, 'bg')).toEqual(byId(sampleDesign(), 'bg'));
  });
});

describe('deleteElement', () => {
  it('removes the element', () => {
    expect(ids(deleteElement(sampleDesign(), 'frame'))).toEqual(['bg', 'title', 'logo']);
  });

  it('removes an image asset only when no element uses it any more', () => {
    const once = deleteElement(sampleDesign(), 'bg');
    expect(Object.keys(once.assets)).toContain('img-1');
    const twice = deleteElement(once, 'logo');
    expect(Object.keys(twice.assets)).not.toContain('img-1');
    valid(twice);
  });

  it('keeps unrelated assets', () => {
    const design = {
      ...sampleDesign(),
      assets: { ...sampleDesign().assets, extra: { dataUrl: JPEG_DATA_URL } },
    };
    expect(Object.keys(deleteElement(design, 'frame').assets)).toContain('extra');
  });
});

describe('reorderElement (layer order, first = back)', () => {
  it('moves forward and backward by one', () => {
    expect(ids(reorderElement(sampleDesign(), 'frame', 'forward'))).toEqual([
      'bg',
      'title',
      'frame',
      'logo',
    ]);
    expect(ids(reorderElement(sampleDesign(), 'frame', 'backward'))).toEqual([
      'frame',
      'bg',
      'title',
      'logo',
    ]);
  });

  it('moves to the front and to the back', () => {
    expect(ids(reorderElement(sampleDesign(), 'bg', 'front'))).toEqual([
      'frame',
      'title',
      'logo',
      'bg',
    ]);
    expect(ids(reorderElement(sampleDesign(), 'logo', 'back'))).toEqual([
      'logo',
      'bg',
      'frame',
      'title',
    ]);
  });

  it('returns the same design when nothing moves', () => {
    const design = sampleDesign();
    expect(reorderElement(design, 'logo', 'forward')).toBe(design);
    expect(reorderElement(design, 'bg', 'back')).toBe(design);
    expect(reorderElement(design, 'nope', 'front')).toBe(design);
  });
});

describe('normalizeRotation', () => {
  it('maps any angle into 0 to under 360', () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(-45)).toBe(315);
    expect(normalizeRotation(725)).toBe(5);
    expect(normalizeRotation(359.999)).toBe(0);
  });
});

describe('resizeLabel', () => {
  it('changes the label size and keeps elements centred', () => {
    const original = sampleDesign(); // 90 × 120 mm
    const design = resizeLabel(original, { widthMm: 100, heightMm: 140 });
    valid(design);
    expect(design.labelSize).toEqual({ widthMm: 100, heightMm: 140 });
    for (const element of design.elements) {
      const before = byId(original, element.id);
      expect(element.x).toBeCloseTo(before.x + 5);
      expect(element.y).toBeCloseTo(before.y + 10);
      expect(element.width).toBe(before.width);
      expect(element.rotation).toBe(before.rotation);
    }
  });

  it('keeps elements when the label gets smaller, even if they stick out', () => {
    const design = resizeLabel(sampleDesign(), { widthMm: 30, heightMm: 30 });
    valid(design);
    expect(ids(design)).toEqual(ids(sampleDesign()));
    expect(byId(design, 'bg')).toMatchObject({ x: -33, y: -48, width: 96 });
  });

  it('rounds to 0.01 mm', () => {
    const design = resizeLabel(sampleDesign(), { widthMm: 90.333, heightMm: 120 });
    expect(design.labelSize.widthMm).toBe(90.33);
  });

  it('returns the same design for the same or an invalid size', () => {
    const design = sampleDesign();
    expect(resizeLabel(design, { widthMm: 90, heightMm: 120 })).toBe(design);
    expect(resizeLabel(design, { widthMm: 10, heightMm: 120 })).toBe(design);
    expect(resizeLabel(design, { widthMm: 90, heightMm: Number.NaN })).toBe(design);
  });
});
