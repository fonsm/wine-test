// Where everything goes on the PDF page, in millimetres from the page's top-left corner (the
// same orientation as the design). Pure calculations: the PDF writer only follows this plan.
import type { Design, ShapeElement } from '../model/schema';
import {
  A4_PAPER,
  BLEED_MM,
  CROP_MARK_GAP_MM,
  CROP_MARK_LENGTH_MM,
  EXPORT_DPI,
  TEXT_EXPORT_DPI,
  mmToPx,
} from '../print/geometry';
import { imagePlacement } from '../render/elementNodes';

const MM_PER_INCH = 25.4;

/** "printer": label centred on A4 with crop marks. "shop": the page is the label (plus bleed). */
export type ExportLayout = 'printer' | 'shop';

export interface ExportOptions {
  layout: ExportLayout;
  bleed: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** An element's centre on the page and its clockwise rotation in degrees. */
export interface Frame {
  centerX: number;
  centerY: number;
  rotation: number;
}

interface PlacedBase {
  elementId: string;
  frame: Frame;
  /** What is drawn, relative to the frame centre, before rotation (mm, y downwards). */
  box: Rect;
  opacity: number;
}

export type PlacedItem =
  | (PlacedBase & { kind: 'text'; pixelWidth: number; pixelHeight: number })
  | (PlacedBase & {
      kind: 'image';
      assetId: string;
      /** Part of the source image that is shown, in source pixels. */
      crop: Rect;
      /** Pixel size of the picture put into the PDF. */
      pixelWidth: number;
      pixelHeight: number;
      /** Resulting resolution on paper. */
      dpi: { x: number; y: number };
    })
  | (PlacedBase & { kind: 'shape'; element: ShapeElement });

export interface CropMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LabelPlan {
  page: { widthMm: number; heightMm: number };
  /** The label's trim box on the page. */
  trim: Rect;
  /** Elements are cut off outside this area: the trim, or the bleed edge with bleed. */
  clip: Rect;
  items: PlacedItem[];
  cropMarks: CropMark[];
}

/** Decoded pixel size of an asset, or null if it could not be decoded. */
export type ImageSizeLookup = (assetId: string) => { width: number; height: number } | null;

function pageFor(
  options: ExportOptions,
  label: { widthMm: number; heightMm: number },
  bleed: number,
): LabelPlan['page'] {
  if (options.layout === 'shop') {
    return { widthMm: label.widthMm + 2 * bleed, heightMm: label.heightMm + 2 * bleed };
  }
  const margin = bleed + CROP_MARK_GAP_MM + CROP_MARK_LENGTH_MM;
  const needed = { widthMm: label.widthMm + 2 * margin, heightMm: label.heightMm + 2 * margin };
  const fits = (paper: { widthMm: number; heightMm: number }) =>
    needed.widthMm <= paper.widthMm && needed.heightMm <= paper.heightMm;
  const portrait = { widthMm: A4_PAPER.widthMm, heightMm: A4_PAPER.heightMm };
  const landscape = { widthMm: A4_PAPER.heightMm, heightMm: A4_PAPER.widthMm };
  if (fits(portrait)) return portrait;
  if (fits(landscape)) return landscape;
  return needed;
}

function cropMarks(trim: Rect, start: number): CropMark[] {
  const { x, y, width, height } = trim;
  const length = CROP_MARK_LENGTH_MM;
  const marks: CropMark[] = [];
  for (const lineY of [y, y + height]) {
    marks.push({ x1: x - start - length, y1: lineY, x2: x - start, y2: lineY });
    marks.push({ x1: x + width + start, y1: lineY, x2: x + width + start + length, y2: lineY });
  }
  for (const lineX of [x, x + width]) {
    marks.push({ x1: lineX, y1: y - start - length, x2: lineX, y2: y - start });
    marks.push({ x1: lineX, y1: y + height + start, x2: lineX, y2: y + height + start + length });
  }
  return marks;
}

/** Resolution of a source span shown over a length in mm: at most EXPORT_DPI, never enlarged. */
function resample(sourcePx: number, lengthMm: number): { dpi: number; pixels: number } {
  const native = sourcePx / (lengthMm / MM_PER_INCH);
  if (native > EXPORT_DPI) return { dpi: EXPORT_DPI, pixels: mmToPx(lengthMm, EXPORT_DPI) };
  return { dpi: native, pixels: Math.max(1, Math.round(sourcePx)) };
}

export function planLabelExport(
  design: Design,
  options: ExportOptions,
  imageSize: ImageSizeLookup,
): LabelPlan {
  const label = design.labelSize;
  const bleed = options.bleed ? BLEED_MM : 0;
  const page = pageFor(options, label, bleed);
  const trim: Rect = {
    x: (page.widthMm - label.widthMm) / 2,
    y: (page.heightMm - label.heightMm) / 2,
    width: label.widthMm,
    height: label.heightMm,
  };
  const clip: Rect = {
    x: trim.x - bleed,
    y: trim.y - bleed,
    width: trim.width + 2 * bleed,
    height: trim.height + 2 * bleed,
  };

  const items: PlacedItem[] = [];
  for (const element of design.elements) {
    const frame: Frame = {
      centerX: trim.x + element.x + element.width / 2,
      centerY: trim.y + element.y + element.height / 2,
      rotation: element.rotation,
    };
    const whole: Rect = {
      x: -element.width / 2,
      y: -element.height / 2,
      width: element.width,
      height: element.height,
    };
    const base = { elementId: element.id, frame, opacity: element.opacity };
    switch (element.type) {
      case 'text':
        items.push({
          ...base,
          kind: 'text',
          box: whole,
          pixelWidth: mmToPx(element.width, TEXT_EXPORT_DPI),
          pixelHeight: mmToPx(element.height, TEXT_EXPORT_DPI),
        });
        break;
      case 'image': {
        const source = imageSize(element.assetId);
        if (!source || source.width === 0 || source.height === 0) break;
        const placement = imagePlacement(
          element.style.fit,
          source.width,
          source.height,
          element.width,
          element.height,
        );
        const crop = placement.crop ?? { x: 0, y: 0, width: source.width, height: source.height };
        const horizontal = resample(crop.width, placement.width);
        const vertical = resample(crop.height, placement.height);
        items.push({
          ...base,
          kind: 'image',
          assetId: element.assetId,
          box: {
            x: whole.x + placement.x,
            y: whole.y + placement.y,
            width: placement.width,
            height: placement.height,
          },
          crop,
          pixelWidth: horizontal.pixels,
          pixelHeight: vertical.pixels,
          dpi: { x: horizontal.dpi, y: vertical.dpi },
        });
        break;
      }
      case 'shape':
        items.push({ ...base, kind: 'shape', box: whole, element });
        break;
    }
  }

  return {
    page,
    trim,
    clip,
    items,
    cropMarks: options.layout === 'printer' ? cropMarks(trim, bleed + CROP_MARK_GAP_MM) : [],
  };
}
