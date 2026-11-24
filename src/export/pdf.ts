// Writes the PDFs with pdf-lib: the label (following a LabelPlan) and the calibration page.
// Every length comes from the plan or from print/geometry.ts, converted from mm to points here.
import {
  PDFDocument,
  StandardFonts,
  clip,
  concatTransformationMatrix,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type Color,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import type { ShapeElement } from '../model/schema';
import {
  A4_PAPER,
  CALIBRATION_RULER_MM,
  CALIBRATION_SQUARE_MM,
  CROP_MARK_LINE_MM,
  mmToPt,
} from '../print/geometry';
import type { LabelPlan, PlacedItem, Rect } from './plan';

/** A picture for a text or image element, already at the planned pixel size. */
export interface RasterImage {
  format: 'png' | 'jpeg';
  bytes: Uint8Array;
}

const CREATOR = 'DL-School Wine Label Designer';
const BLACK = rgb(0, 0, 0);

/** Only the app's name: no author, no user data. */
function setMetadata(pdf: PDFDocument, title: string): void {
  pdf.setTitle(title);
  pdf.setCreator(CREATOR);
  pdf.setProducer(CREATOR);
}

function parseColor(hex: string): { color: Color; alpha: number } {
  const value = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return { color: rgb(value(1), value(3), value(5)), alpha: hex.length === 9 ? value(7) : 1 };
}

/** Top-left based mm rectangle to PDF points (origin bottom-left). */
function toPdfRect(rect: Rect, pageHeightPt: number) {
  return {
    x: mmToPt(rect.x),
    y: pageHeightPt - mmToPt(rect.y + rect.height),
    width: mmToPt(rect.width),
    height: mmToPt(rect.height),
  };
}

/**
 * Moves the origin to the element's centre and rotates clockwise, like the design. Inside,
 * x goes right and y goes up (PDF), so a box at (x, y) mm (y down) starts at (x, -(y + h)).
 */
function enterFrame(page: PDFPage, item: PlacedItem, pageHeightPt: number): void {
  const radians = (-item.frame.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(
      1,
      0,
      0,
      1,
      mmToPt(item.frame.centerX),
      pageHeightPt - mmToPt(item.frame.centerY),
    ),
    concatTransformationMatrix(cos, sin, -sin, cos, 0, 0),
  );
}

function drawShape(page: PDFPage, element: ShapeElement, box: Rect, opacity: number): void {
  const { style } = element;
  const fill = style.fill ? parseColor(style.fill) : null;
  const stroke = style.stroke ? parseColor(style.stroke) : null;
  const strokeWidth = mmToPt(style.strokeWidthMm);
  const x = mmToPt(box.x);
  const top = -mmToPt(box.y);
  const width = mmToPt(box.width);
  const height = mmToPt(box.height);
  const paint = {
    color: fill?.color,
    opacity: opacity * (fill?.alpha ?? 1),
    borderColor: stroke && strokeWidth > 0 ? stroke.color : undefined,
    borderWidth: strokeWidth,
    borderOpacity: opacity * (stroke?.alpha ?? 1),
  };

  if (element.shape === 'line') {
    // Like the editor: through the middle, in the fill colour if there is no stroke, at least 1 px.
    const lineColor = stroke ?? fill;
    if (!lineColor) return;
    page.drawLine({
      start: { x, y: top - height / 2 },
      end: { x: x + width, y: top - height / 2 },
      thickness: Math.max(strokeWidth, mmToPt(0.1)),
      color: lineColor.color,
      opacity: opacity * lineColor.alpha,
    });
    return;
  }
  if (element.shape === 'ellipse') {
    page.drawEllipse({
      x: x + width / 2,
      y: top - height / 2,
      xScale: width / 2,
      yScale: height / 2,
      ...paint,
    });
    return;
  }
  const radius = Math.min(mmToPt(style.cornerRadiusMm), width / 2, height / 2);
  if (radius <= 0) {
    page.drawRectangle({ x, y: top - height, width, height, ...paint });
    return;
  }
  // Rounded rectangle as an SVG path (y downwards from the given origin).
  const w = width;
  const h = height;
  const r = radius;
  const path = [
    `M ${String(r)} 0`,
    `H ${String(w - r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(w)} ${String(r)}`,
    `V ${String(h - r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(w - r)} ${String(h)}`,
    `H ${String(r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 0 ${String(h - r)}`,
    `V ${String(r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(r)} 0`,
    'Z',
  ].join(' ');
  page.drawSvgPath(path, { x, y: top, ...paint });
}

/** The label PDF: one page, elements back to front, cut at the clip area, crop marks outside. */
export async function writeLabelPdf(
  plan: LabelPlan,
  rasters: ReadonlyMap<string, RasterImage>,
  title = 'Wine label',
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  setMetadata(pdf, title);
  const page = pdf.addPage([mmToPt(plan.page.widthMm), mmToPt(plan.page.heightMm)]);
  const pageHeight = page.getHeight();

  const clipRect = toPdfRect(plan.clip, pageHeight);
  page.pushOperators(
    pushGraphicsState(),
    rectangle(clipRect.x, clipRect.y, clipRect.width, clipRect.height),
    clip(),
    endPath(),
  );
  for (const item of plan.items) {
    if (item.kind === 'shape') {
      enterFrame(page, item, pageHeight);
      drawShape(page, item.element, item.box, item.opacity);
      page.pushOperators(popGraphicsState());
      continue;
    }
    const raster = rasters.get(item.elementId);
    if (!raster) continue;
    const image =
      raster.format === 'jpeg'
        ? await pdf.embedJpg(raster.bytes)
        : await pdf.embedPng(raster.bytes);
    enterFrame(page, item, pageHeight);
    page.drawImage(image, {
      x: mmToPt(item.box.x),
      y: -mmToPt(item.box.y + item.box.height),
      width: mmToPt(item.box.width),
      height: mmToPt(item.box.height),
      opacity: item.opacity,
    });
    page.pushOperators(popGraphicsState());
  }
  page.pushOperators(popGraphicsState());

  for (const mark of plan.cropMarks) {
    page.drawLine({
      start: { x: mmToPt(mark.x1), y: pageHeight - mmToPt(mark.y1) },
      end: { x: mmToPt(mark.x2), y: pageHeight - mmToPt(mark.y2) },
      thickness: mmToPt(CROP_MARK_LINE_MM),
      color: BLACK,
    });
  }
  return pdf.save();
}

export interface CalibrationTexts {
  title: string;
  /** Instructions, one paragraph each. */
  lines: string[];
  /** Caption under the square, e.g. "50 × 50 mm". */
  square: string;
  /** Caption under the ruler, e.g. "0–15 cm". */
  ruler: string;
}

/** Layout of the calibration page in mm from the top-left corner. */
const CAL = {
  left: 20,
  titleTop: 22,
  textTop: 34,
  textWidth: 170,
  squareTop: 90,
  rulerTop: 175,
  tickShort: 2.5,
  tickMedium: 4,
  tickLong: 6,
  line: 0.2,
} as const;

function wrap(text: string, font: PDFFont, size: number, maxWidthPt: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(next, size) > maxWidthPt) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** One A4 page with a square and a ruler of known size, to check that printing is at 100 %. */
export async function writeCalibrationPdf(texts: CalibrationTexts): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  setMetadata(pdf, texts.title);
  const page = pdf.addPage([mmToPt(A4_PAPER.widthMm), mmToPt(A4_PAPER.heightMm)]);
  const height = page.getHeight();
  const y = (mm: number) => height - mmToPt(mm);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const textSize = 11;
  const lineGapMm = 5.5;

  page.drawText(texts.title, { x: mmToPt(CAL.left), y: y(CAL.titleTop), size: 18, font: bold });
  let top = CAL.textTop;
  for (const paragraph of texts.lines) {
    for (const line of wrap(paragraph, regular, textSize, mmToPt(CAL.textWidth))) {
      page.drawText(line, { x: mmToPt(CAL.left), y: y(top), size: textSize, font: regular });
      top += lineGapMm;
    }
    top += 1.5;
  }

  // The square: light grey with a thin outline centred on its exact edge.
  page.drawRectangle({
    x: mmToPt(CAL.left),
    y: y(CAL.squareTop + CALIBRATION_SQUARE_MM),
    width: mmToPt(CALIBRATION_SQUARE_MM),
    height: mmToPt(CALIBRATION_SQUARE_MM),
    color: rgb(0.9, 0.9, 0.9),
    borderColor: BLACK,
    borderWidth: mmToPt(CAL.line),
  });
  page.drawText(texts.square, {
    x: mmToPt(CAL.left),
    y: y(CAL.squareTop + CALIBRATION_SQUARE_MM + 7),
    size: textSize,
    font: regular,
  });

  // The ruler: a baseline with a tick every millimetre, longer every 5 mm and every centimetre.
  const base = CAL.rulerTop;
  page.drawLine({
    start: { x: mmToPt(CAL.left), y: y(base) },
    end: { x: mmToPt(CAL.left + CALIBRATION_RULER_MM), y: y(base) },
    thickness: mmToPt(CAL.line),
    color: BLACK,
  });
  for (let mm = 0; mm <= CALIBRATION_RULER_MM; mm++) {
    const length = mm % 10 === 0 ? CAL.tickLong : mm % 5 === 0 ? CAL.tickMedium : CAL.tickShort;
    const x = mmToPt(CAL.left + mm);
    page.drawLine({
      start: { x, y: y(base) },
      end: { x, y: y(base - length) },
      thickness: mmToPt(CAL.line / 2),
      color: BLACK,
    });
    if (mm % 10 === 0) {
      const label = String(mm / 10);
      const size = 8;
      page.drawText(label, {
        x: x - regular.widthOfTextAtSize(label, size) / 2,
        y: y(base - CAL.tickLong - 1.5),
        size,
        font: regular,
      });
    }
  }
  page.drawText(texts.ruler, {
    x: mmToPt(CAL.left),
    y: y(base + 7),
    size: textSize,
    font: regular,
  });
  return pdf.save();
}
