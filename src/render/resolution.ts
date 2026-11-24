import type { LabelSize } from '../print/geometry';

export interface RenderSize {
  width: number;
  height: number;
  pxPerMm: number;
}

/** Pixel size of a label image (trim area) whose longer side is maxSidePx. */
export function renderSizePx(size: LabelSize, maxSidePx: number): RenderSize {
  const pxPerMm = maxSidePx / Math.max(size.widthMm, size.heightMm);
  return {
    width: Math.max(1, Math.round(size.widthMm * pxPerMm)),
    height: Math.max(1, Math.round(size.heightMm * pxPerMm)),
    pxPerMm,
  };
}
