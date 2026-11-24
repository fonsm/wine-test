import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { DesignElement } from '../model/schema';
import { createEmptyDesign } from '../model/schema';
import { PNG_DATA_URL } from '../model/testing/fixtures';
import { jpegHeader } from '../upload/testing/fixtures';
import { A4_PAPER, CALIBRATION_RULER_MM, CALIBRATION_SQUARE_MM } from '../print/geometry';
import { writeCalibrationPdf, writeLabelPdf, type RasterImage } from './pdf';
import { planLabelExport, type LabelPlan } from './plan';
import { inspectPdf } from './testing/inspectPdf';

/** Sizes in the PDF match the design within this many millimetres. */
const TOLERANCE_MM = 0.01;
const digits = -Math.log10(TOLERANCE_MM * 2);

const png: RasterImage = {
  format: 'png',
  bytes: Uint8Array.from(atob(PNG_DATA_URL.split(',')[1] ?? ''), (char) => char.charCodeAt(0)),
};
const jpeg: RasterImage = { format: 'jpeg', bytes: jpegHeader(4, 4) };

const elements: DesignElement[] = [
  {
    id: 'photo',
    type: 'image',
    x: -3,
    y: -3,
    width: 96,
    height: 60,
    rotation: 0,
    opacity: 1,
    assetId: 'a1',
    style: { fit: 'stretch' },
  },
  {
    id: 'title',
    type: 'text',
    x: 10,
    y: 70,
    width: 70,
    height: 15,
    rotation: 12.5,
    opacity: 0.8,
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
  },
  {
    id: 'frame',
    type: 'shape',
    shape: 'rect',
    x: 5,
    y: 90,
    width: 80,
    height: 20,
    rotation: 0,
    opacity: 1,
    style: { fill: '#7b1e3a', stroke: null, strokeWidthMm: 0, cornerRadiusMm: 0 },
  },
];

function plan(layout: 'shop' | 'printer', bleed: boolean): LabelPlan {
  return planLabelExport(
    { ...createEmptyDesign(), assets: { a1: { dataUrl: PNG_DATA_URL } }, elements },
    { layout, bleed },
    () => ({ width: 4000, height: 2500 }),
  );
}

const rasters = new Map<string, RasterImage>([
  ['photo', jpeg],
  ['title', png],
]);

describe('writeLabelPdf', () => {
  for (const [layout, bleed] of [
    ['shop', true],
    ['shop', false],
    ['printer', true],
    ['printer', false],
  ] as const) {
    it(`${layout} layout, bleed ${bleed ? 'on' : 'off'}: page and elements at true size`, async () => {
      const expected = plan(layout, bleed);
      const [page, ...others] = await inspectPdf(await writeLabelPdf(expected, rasters));
      if (!page) throw new Error('no page');
      expect(others).toHaveLength(0);
      expect(page.widthMm).toBeCloseTo(expected.page.widthMm, digits);
      expect(page.heightMm).toBeCloseTo(expected.page.heightMm, digits);

      // Photo and text, in design order, at their size, position and rotation.
      expect(page.images).toHaveLength(2);
      const placed = expected.items.filter((item) => item.kind !== 'shape');
      placed.forEach((item, index) => {
        const image = page.images[index];
        if (!image) throw new Error(`image ${String(index)} missing`);
        expect(image.widthMm).toBeCloseTo(item.box.width, digits);
        expect(image.heightMm).toBeCloseTo(item.box.height, digits);
        expect(image.centerXMm).toBeCloseTo(
          item.frame.centerX + item.box.x + item.box.width / 2,
          digits,
        );
        expect(image.centerYMm).toBeCloseTo(
          item.frame.centerY + item.box.y + item.box.height / 2,
          digits,
        );
        expect(image.rotation).toBeCloseTo(item.frame.rotation, 6);
      });

      // Everything is cut at the trim (or the bleed edge).
      expect(page.clips).toContainEqual(
        expect.objectContaining({
          x: expect.closeTo(expected.clip.x, digits) as number,
          y: expect.closeTo(expected.clip.y, digits) as number,
          width: expect.closeTo(expected.clip.width, digits) as number,
          height: expect.closeTo(expected.clip.height, digits) as number,
        }),
      );
    });
  }

  it('draws rectangles as vector shapes at their size', async () => {
    const expected = plan('shop', true);
    const [page] = await inspectPdf(await writeLabelPdf(expected, rasters));
    const filled = page?.paths.filter((path) => path.operator.startsWith('f')) ?? [];
    expect(filled).toHaveLength(1);
    const xs = filled[0]?.points.map((point) => point[0]) ?? [];
    const ys = filled[0]?.points.map((point) => point[1]) ?? [];
    expect(Math.min(...xs)).toBeCloseTo(3 + 5, digits);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(80, digits);
    expect(Math.min(...ys)).toBeCloseTo(3 + 90, digits);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(20, digits);
  });

  it('draws the crop marks of the printer layout as thin lines', async () => {
    const expected = plan('printer', true);
    const [page] = await inspectPdf(await writeLabelPdf(expected, rasters));
    const strokes = page?.paths.filter((path) => path.operator === 'S') ?? [];
    expect(strokes).toHaveLength(expected.cropMarks.length);
    for (const mark of expected.cropMarks) {
      const wanted = [mark.x1, mark.y1, mark.x2, mark.y2];
      const match = strokes.find(({ points: [a, b] }) =>
        [a?.[0], a?.[1], b?.[0], b?.[1]].every(
          (value, index) => Math.abs((value ?? NaN) - (wanted[index] ?? NaN)) < TOLERANCE_MM,
        ),
      );
      expect(match, JSON.stringify(mark)).toBeDefined();
    }
  });

  it('embeds each picture once per element, keeping JPEG photos as JPEG', async () => {
    const bytes = await writeLabelPdf(plan('shop', true), rasters);
    const [page] = (await PDFDocument.load(bytes)).getPages();
    const xObjects = page?.node.normalizedEntries().XObject;
    expect(xObjects?.keys()).toHaveLength(2);
    expect(new TextDecoder('latin1').decode(bytes)).toContain('/DCTDecode');
  });

  it('contains no personal metadata, only the app as creator', async () => {
    const pdf = await PDFDocument.load(await writeLabelPdf(plan('shop', true), rasters));
    expect(pdf.getAuthor()).toBeUndefined();
    expect(pdf.getCreator()).toBe('DL-School Wine Label Designer');
  });
});

describe('writeCalibrationPdf', () => {
  const texts = {
    title: 'Calibration page',
    lines: ['Print at 100%, no scaling.', 'The square must measure 50 × 50 mm.'],
    square: '50 × 50 mm',
    ruler: '0–15 cm',
  };

  it('is one A4 page', async () => {
    const pages = await inspectPdf(await writeCalibrationPdf(texts));
    expect(pages).toHaveLength(1);
    expect(pages[0]?.widthMm).toBeCloseTo(A4_PAPER.widthMm, digits);
    expect(pages[0]?.heightMm).toBeCloseTo(A4_PAPER.heightMm, digits);
  });

  it('has a square of exactly the calibration size', async () => {
    const [page] = await inspectPdf(await writeCalibrationPdf(texts));
    const squares = (page?.paths ?? []).filter((path) => {
      const xs = path.points.map((point) => point[0]);
      const ys = path.points.map((point) => point[1]);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      return (
        Math.abs(w - CALIBRATION_SQUARE_MM) < TOLERANCE_MM &&
        Math.abs(h - CALIBRATION_SQUARE_MM) < TOLERANCE_MM
      );
    });
    expect(squares.length).toBeGreaterThanOrEqual(1);
  });

  it('has a ruler with a tick every millimetre over its full length', async () => {
    const [page] = await inspectPdf(await writeCalibrationPdf(texts));
    const lines = (page?.paths ?? []).filter(
      (path) => path.operator === 'S' && path.points.length === 2,
    );
    const vertical = lines.filter(
      ({ points: [a, b] }) => Math.abs((a?.[0] ?? 0) - (b?.[0] ?? 1)) < 1e-6,
    );
    const ticks = vertical.map(({ points: [a] }) => a?.[0] ?? NaN).sort((x, y) => x - y);
    expect(ticks).toHaveLength(CALIBRATION_RULER_MM + 1);
    ticks.forEach((x, index) => {
      expect(x - (ticks[0] ?? 0)).toBeCloseTo(index, digits);
    });
    // Longer ticks every 5 mm and every centimetre.
    const sorted = [...vertical].sort((p, q) => (p.points[0]?.[0] ?? 0) - (q.points[0]?.[0] ?? 0));
    const length = (index: number) => {
      const [a, b] = sorted[index]?.points ?? [];
      return Math.abs((a?.[1] ?? NaN) - (b?.[1] ?? NaN));
    };
    expect(length(10)).toBeGreaterThan(length(5));
    expect(length(5)).toBeGreaterThan(length(1));
  });

  it('prints the instructions', async () => {
    const [page] = await inspectPdf(await writeCalibrationPdf(texts));
    const shown = page?.texts.join(' ') ?? '';
    expect(shown).toContain('Print at 100%, no scaling.');
  });
});
