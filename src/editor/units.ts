// Conversions between the design model (millimetres, rotation around the box centre) and
// Konva nodes (pixels, rotation around the node origin = rotated top-left corner).

const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;

export const pointsToMm = (points: number): number => (points * MM_PER_INCH) / POINTS_PER_INCH;

interface Size {
  width: number;
  height: number;
  rotation: number;
}

interface Point {
  x: number;
  y: number;
}

/** Vector from the node origin (rotated top-left corner) to the box centre. */
function originToCentre({ width, height, rotation }: Size): Point {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: (width / 2) * cos - (height / 2) * sin,
    y: (width / 2) * sin + (height / 2) * cos,
  };
}

/** Konva node position in pixels for a model box in millimetres. */
export function toNodePosition(box: Point & Size, pxPerMm: number): Point {
  const toCentre = originToCentre(box);
  const centreX = box.x + box.width / 2;
  const centreY = box.y + box.height / 2;
  return { x: (centreX - toCentre.x) * pxPerMm, y: (centreY - toCentre.y) * pxPerMm };
}

/** Model top-left corner (unrotated box, millimetres) for a Konva node position in pixels. */
export function fromNodePosition(position: Point, size: Size, pxPerMm: number): Point {
  const toCentre = originToCentre(size);
  const centreX = position.x / pxPerMm + toCentre.x;
  const centreY = position.y / pxPerMm + toCentre.y;
  return { x: centreX - size.width / 2, y: centreY - size.height / 2 };
}
