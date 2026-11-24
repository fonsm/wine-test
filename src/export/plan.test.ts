import { describe, expect, it } from 'vitest';
import { createEmptyDesign, type Design, type DesignElement } from '../model/schema';
import { PNG_DATA_URL } from '../model/testing/fixtures';
import {
  A4_PAPER,
  BLEED_MM,
  CROP_MARK_GAP_MM,
  CROP_MARK_LENGTH_MM,
  EXPORT_DPI,
  TEXT_EXPORT_DPI,
  mmToPx,
} from '../print/geometry';
import { planLabelExport, type ImageSizeLookup, type PlacedItem } from './plan';

const noImages: ImageSizeLookup = () => null;

function text(overrides: Partial<DesignElement> = {}): DesignElement {
  return {
    id: 'title',
    type: 'text',
    x: 10,
    y: 20,
    width: 70,
    height: 15,
    rotation: 0,
    opacity: 1,
    text: 'Riesling',
    style: {
      fontFamily: 'Playfair Display',
      fontSizePt: 18,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      align: 'center',
      lineHeight: 1.2,
    },
    ...overrides,
  } as DesignElement;
}

function image(fit: 'cover' | 'contain' | 'stretch', box = { width: 20, height: 20 }) {
  return {
    id: 'photo',
    type: 'image',
    x: 5,
    y: 5,
    ...box,
    rotation: 0,
    opacity: 1,
    assetId: 'a1',
    style: { fit },
  } as DesignElement;
}

function design(elements: DesignElement[], labelSize = { widthMm: 90, heightMm: 120 }): Design {
  return {
    ...createEmptyDesign(),
    labelSize,
    assets: { a1: { dataUrl: PNG_DATA_URL } },
    elements,
  };
}

const sizeOf =
  (width: number, height: number): ImageSizeLookup =>
  () => ({ width, height });

function only<K extends PlacedItem['kind']>(items: PlacedItem[], kind: K) {
  const found = items.filter(
    (item): item is Extract<PlacedItem, { kind: K }> => item.kind === kind,
  );
  expect(found).toHaveLength(1);
  const [item] = found;
  if (!item) throw new Error('missing item');
  return item;
}

describe('planLabelExport: page', () => {
  it('print shop with bleed: the page is the label plus bleed on every side', () => {
    const plan = planLabelExport(design([]), { layout: 'shop', bleed: true }, noImages);
    expect(plan.page).toEqual({ widthMm: 90 + 2 * BLEED_MM, heightMm: 120 + 2 * BLEED_MM });
    expect(plan.trim).toEqual({ x: BLEED_MM, y: BLEED_MM, width: 90, height: 120 });
    expect(plan.clip).toEqual({ x: 0, y: 0, width: 96, height: 126 });
    expect(plan.cropMarks).toEqual([]);
  });

  it('print shop without bleed: the page is exactly the label, cut at the trim', () => {
    const plan = planLabelExport(design([]), { layout: 'shop', bleed: false }, noImages);
    expect(plan.page).toEqual({ widthMm: 90, heightMm: 120 });
    expect(plan.trim).toEqual({ x: 0, y: 0, width: 90, height: 120 });
    expect(plan.clip).toEqual(plan.trim);
  });

  it('own printer: the label is centred on A4 at true size', () => {
    const plan = planLabelExport(design([]), { layout: 'printer', bleed: true }, noImages);
    expect(plan.page).toEqual(A4_PAPER);
    expect(plan.trim).toEqual({ x: 60, y: 88.5, width: 90, height: 120 });
    expect(plan.clip).toEqual({ x: 57, y: 85.5, width: 96, height: 126 });
  });

  it('own printer: crop marks on the trim lines, outside the bleed', () => {
    for (const bleed of [true, false]) {
      const plan = planLabelExport(design([]), { layout: 'printer', bleed }, noImages);
      const { x, y, width, height } = plan.trim;
      const start = (bleed ? BLEED_MM : 0) + CROP_MARK_GAP_MM;
      expect(plan.cropMarks).toHaveLength(8);
      for (const mark of plan.cropMarks) {
        const horizontal = mark.y1 === mark.y2;
        // Along the mark: [from, to]; across it: the trim line it continues.
        const [from, to] = horizontal
          ? [Math.min(mark.x1, mark.x2), Math.max(mark.x1, mark.x2)]
          : [Math.min(mark.y1, mark.y2), Math.max(mark.y1, mark.y2)];
        const [trimStart, trimEnd] = horizontal ? [x, x + width] : [y, y + height];
        expect(horizontal ? [y, y + height] : [x, x + width]).toContain(
          horizontal ? mark.y1 : mark.x1,
        );
        expect(to - from).toBeCloseTo(CROP_MARK_LENGTH_MM, 9);
        // Starts `start` mm outside the trim (beyond the bleed) and points away from the label.
        const before = Math.abs(to - (trimStart - start)) < 1e-9;
        const after = Math.abs(from - (trimEnd + start)) < 1e-9;
        expect(before || after).toBe(true);
      }
    }
  });

  it('own printer: turns A4 sideways for a wide label', () => {
    const plan = planLabelExport(
      design([], { widthMm: 250, heightMm: 150 }),
      { layout: 'printer', bleed: true },
      noImages,
    );
    expect(plan.page).toEqual({ widthMm: A4_PAPER.heightMm, heightMm: A4_PAPER.widthMm });
  });

  it('own printer: a page just big enough for labels that do not fit on A4', () => {
    const plan = planLabelExport(
      design([], { widthMm: 300, heightMm: 300 }),
      { layout: 'printer', bleed: true },
      noImages,
    );
    const margin = BLEED_MM + CROP_MARK_GAP_MM + CROP_MARK_LENGTH_MM;
    expect(plan.page).toEqual({ widthMm: 300 + 2 * margin, heightMm: 300 + 2 * margin });
    expect(plan.trim.x).toBeCloseTo(margin, 9);
  });
});

describe('planLabelExport: elements', () => {
  it('places text at its size and position, as a 600 DPI picture', () => {
    const plan = planLabelExport(
      design([text({ rotation: 30, opacity: 0.5 })]),
      { layout: 'shop', bleed: true },
      noImages,
    );
    const item = only(plan.items, 'text');
    expect(item.frame).toEqual({ centerX: 3 + 10 + 35, centerY: 3 + 20 + 7.5, rotation: 30 });
    expect(item.box).toEqual({ x: -35, y: -7.5, width: 70, height: 15 });
    expect(item.opacity).toBe(0.5);
    expect(item.pixelWidth).toBe(mmToPx(70, TEXT_EXPORT_DPI));
    expect(item.pixelHeight).toBe(mmToPx(15, TEXT_EXPORT_DPI));
  });

  it('keeps the design order (back to front)', () => {
    const plan = planLabelExport(
      design([image('stretch'), text()]),
      { layout: 'shop', bleed: false },
      sizeOf(100, 100),
    );
    expect(plan.items.map((item) => item.elementId)).toEqual(['photo', 'title']);
  });

  it('places large photos at 300 DPI, cropped like the editor (cover)', () => {
    const plan = planLabelExport(
      design([image('cover')]),
      { layout: 'shop', bleed: false },
      sizeOf(2000, 1000),
    );
    const item = only(plan.items, 'image');
    expect(item.crop).toEqual({ x: 500, y: 0, width: 1000, height: 1000 });
    expect(item.box).toEqual({ x: -10, y: -10, width: 20, height: 20 });
    expect(item.dpi).toEqual({ x: EXPORT_DPI, y: EXPORT_DPI });
    expect(item.pixelWidth).toBe(mmToPx(20, EXPORT_DPI));
    expect(item.pixelHeight).toBe(mmToPx(20, EXPORT_DPI));
  });

  it('never enlarges small photos: they keep their pixels and get a lower DPI', () => {
    const plan = planLabelExport(
      design([image('stretch')]),
      { layout: 'shop', bleed: false },
      sizeOf(100, 50),
    );
    const item = only(plan.items, 'image');
    expect(item.pixelWidth).toBe(100);
    expect(item.pixelHeight).toBe(50);
    expect(item.dpi.x).toBeCloseTo(100 / (20 / 25.4), 9);
    expect(item.dpi.y).toBeCloseTo(50 / (20 / 25.4), 9);
  });

  it('fits the whole photo inside its box (contain), centred', () => {
    const plan = planLabelExport(
      design([image('contain', { width: 40, height: 40 })]),
      { layout: 'shop', bleed: false },
      sizeOf(200, 100),
    );
    const item = only(plan.items, 'image');
    expect(item.box).toEqual({ x: -20, y: -10, width: 40, height: 20 });
    expect(item.crop).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });

  it('leaves out images that could not be decoded', () => {
    const plan = planLabelExport(
      design([image('cover')]),
      { layout: 'shop', bleed: false },
      noImages,
    );
    expect(plan.items).toEqual([]);
  });

  it('keeps shapes as vector drawings', () => {
    const frame: DesignElement = {
      id: 'frame',
      type: 'shape',
      shape: 'rect',
      x: 5,
      y: 5,
      width: 80,
      height: 110,
      rotation: 0,
      opacity: 1,
      style: { fill: null, stroke: '#7b1e3a', strokeWidthMm: 0.5, cornerRadiusMm: 2 },
    };
    const plan = planLabelExport(design([frame]), { layout: 'shop', bleed: false }, noImages);
    const item = only(plan.items, 'shape');
    expect(item.box).toEqual({ x: -40, y: -55, width: 80, height: 110 });
    expect(item.frame).toEqual({ centerX: 45, centerY: 60, rotation: 0 });
    expect(item.element).toBe(frame);
  });
});
