// How the flat label wraps around the bottle: as a cylinder segment just outside the glass whose
// arc length equals the label width, so the print keeps its proportions on the curved surface.
import type { LabelSize } from '../print/geometry';
import type { BottleShape } from '../templates/bottles';

/** Distance between glass and label surface, so they do not flicker into each other. */
export const LABEL_GAP_MM = 0.3;

export interface LabelWrap {
  radiusMm: number;
  /** Angles as in Three.js CylinderGeometry: 0 faces +z (the camera's start position). */
  thetaStart: number;
  thetaLength: number;
  /** Shown height of the label and the height of its centre above the base. */
  heightMm: number;
  centerYMm: number;
  /** Part of the label image that is shown (all of it, unless the label is too big). */
  uv: { repeatX: number; repeatY: number; offsetX: number; offsetY: number };
}

export function labelWrap(size: LabelSize, bottle: BottleShape): LabelWrap {
  const radiusMm = bottle.bodyRadiusMm + LABEL_GAP_MM;
  const { bottomMm, topMm } = bottle.labelZone;
  // A label wider than the bottle's circumference would overlap itself; one that is taller
  // than the straight body would hang in the air. Both show their middle part.
  const shownWidth = Math.min(size.widthMm, 2 * Math.PI * radiusMm);
  const heightMm = Math.min(size.heightMm, topMm - bottomMm);
  const thetaLength = shownWidth / radiusMm;
  const repeatX = shownWidth / size.widthMm;
  const repeatY = heightMm / size.heightMm;
  return {
    radiusMm,
    thetaStart: -thetaLength / 2,
    thetaLength,
    heightMm,
    centerYMm: (bottomMm + topMm) / 2,
    uv: { repeatX, repeatY, offsetX: (1 - repeatX) / 2, offsetY: (1 - repeatY) / 2 },
  };
}
