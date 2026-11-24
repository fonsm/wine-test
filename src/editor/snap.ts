// Snapping to guides while dragging. All values in millimetres, origin = label trim corner.
import type { Design } from '../model/schema';
import { BLEED_MM, SAFE_MARGIN_MM } from '../print/geometry';
import { round2 } from '../util/numbers';

/** Snap distance on screen. Converted to millimetres with the current zoom. */
export const SNAP_THRESHOLD_PX = 6;

export interface Guides {
  vertical: number[];
  horizontal: number[];
}

export interface SnapBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface SnapResult {
  x: number;
  y: number;
  /** The guide that was snapped to, for drawing it. */
  vertical: number | null;
  horizontal: number | null;
}

/** Label guides (bleed, trim, safe margin, centre) plus edges and centres of other unrotated elements. */
export function snapGuides(design: Design, movingId: string | null): Guides {
  const { widthMm: w, heightMm: h } = design.labelSize;
  const vertical = [-BLEED_MM, 0, SAFE_MARGIN_MM, w / 2, w - SAFE_MARGIN_MM, w, w + BLEED_MM];
  const horizontal = [-BLEED_MM, 0, SAFE_MARGIN_MM, h / 2, h - SAFE_MARGIN_MM, h, h + BLEED_MM];
  for (const element of design.elements) {
    if (element.id === movingId || element.rotation !== 0) continue;
    vertical.push(element.x, element.x + element.width / 2, element.x + element.width);
    horizontal.push(element.y, element.y + element.height / 2, element.y + element.height);
  }
  return { vertical, horizontal };
}

/** Finds the smallest shift (within the threshold) that puts one of `edges` on one of `guides`. */
function snapAxis(
  start: number,
  size: number,
  guides: number[],
  threshold: number,
  centreOnly: boolean,
) {
  const edges = centreOnly ? [size / 2] : [0, size / 2, size];
  let best: { shift: number; guide: number } | null = null;
  for (const edge of edges) {
    for (const guide of guides) {
      const shift = guide - (start + edge);
      if (Math.abs(shift) <= threshold && (!best || Math.abs(shift) < Math.abs(best.shift))) {
        best = { shift, guide };
      }
    }
  }
  return best
    ? { value: round2(start + best.shift), guide: best.guide }
    : { value: start, guide: null };
}

/** Snaps a box to the nearest guides. Rotated boxes snap only their centre. */
export function snapBox(box: SnapBox, guides: Guides, thresholdMm: number): SnapResult {
  const centreOnly = box.rotation !== 0;
  const x = snapAxis(box.x, box.width, guides.vertical, thresholdMm, centreOnly);
  const y = snapAxis(box.y, box.height, guides.horizontal, thresholdMm, centreOnly);
  return { x: x.value, y: y.value, vertical: x.guide, horizontal: y.guide };
}
