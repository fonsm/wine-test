// Bottle shapes for the 3D preview, drawn from code (no model files). Lengths in millimetres.
// The design's bottleId picks the shape; unknown ids fall back to the default bottle.
import { DEFAULT_BOTTLE_ID } from '../model/schema';

/** A point of the bottle's outline: distance from the axis (r) at height y above the base. */
export interface ProfilePoint {
  r: number;
  y: number;
}

export interface BottleShape {
  id: string;
  heightMm: number;
  /** Radius of the straight body, where labels go. */
  bodyRadiusMm: number;
  /** Height range of the straight body that labels may cover. */
  labelZone: { bottomMm: number; topMm: number };
  /** Outline from the bottom centre to the top centre, for a lathe (rotation) geometry. */
  profile: readonly ProfilePoint[];
  glassColor: string;
  capsuleColor: string;
  /** Height where the capsule (foil over the cork) starts. */
  capsuleBottomMm: number;
}

/** Points of a quadratic Bézier curve from a to b with control point c, without a. */
function curve(a: ProfilePoint, c: ProfilePoint, b: ProfilePoint, steps: number): ProfilePoint[] {
  return Array.from({ length: steps }, (_, index) => {
    const t = (index + 1) / steps;
    const u = 1 - t;
    return {
      r: u * u * a.r + 2 * u * t * c.r + t * t * b.r,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    };
  });
}

function bordeaux750(): BottleShape {
  const body = 38;
  const neck = 14.5;
  const shoulderStart = { r: body, y: 200 };
  const neckStart = { r: neck, y: 252 };
  return {
    id: 'bordeaux-750',
    heightMm: 300,
    bodyRadiusMm: body,
    labelZone: { bottomMm: 12, topMm: 196 },
    profile: [
      { r: 0, y: 0 },
      { r: body - 4, y: 0 },
      ...curve({ r: body - 4, y: 0 }, { r: body, y: 0 }, { r: body, y: 4 }, 4),
      shoulderStart,
      ...curve(shoulderStart, { r: body, y: 236 }, neckStart, 12),
      { r: neck, y: 288 },
      { r: neck + 1.2, y: 289 },
      { r: neck + 1.2, y: 298 },
      { r: neck, y: 300 },
      { r: 0, y: 300 },
    ],
    glassColor: '#1f3a24',
    capsuleColor: '#7b1e3a',
    capsuleBottomMm: 262,
  };
}

export const BOTTLES: readonly BottleShape[] = [bordeaux750()];

export function bottleShape(id: string): BottleShape {
  const found = BOTTLES.find((bottle) => bottle.id === id);
  if (found) return found;
  const fallback = BOTTLES.find((bottle) => bottle.id === DEFAULT_BOTTLE_ID);
  if (!fallback) throw new Error('default bottle missing');
  return fallback;
}

/** Radius of the outline at height y (linear between profile points; outer surface). */
export function radiusAt(bottle: BottleShape, y: number): number {
  const { profile } = bottle;
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1];
    const b = profile[i];
    if (!a || !b || y > b.y) continue;
    if (b.y === a.y) return Math.max(a.r, b.r);
    return a.r + ((b.r - a.r) * (y - a.y)) / (b.y - a.y);
  }
  return 0;
}
