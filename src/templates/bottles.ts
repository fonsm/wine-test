// Bottle shapes for the preview, built from shape parameters (data files in data/bottles).
// Lengths in millimetres. Parameters are checked with Zod when the files are loaded.
import { z } from 'zod';

/** A point of the bottle's outline: distance from the axis (r) at height y above the base. */
export interface ProfilePoint {
  r: number;
  y: number;
}

/** The rounded edge at the base (radius and height). Labels start above it. */
const BASE_ROUNDING_MM = 4;
/** The lip at the top: from LIP_FROM_TOP_MM below the top; it stands out by LIP_STEP_MM. */
const LIP_FROM_TOP_MM = 12;
const LIP_STEP_MM = 1.2;
/** Points per curve: smooth at preview sizes. */
const BASE_STEPS = 4;
const SHOULDER_STEPS = 12;

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const length = z.number().gt(0).max(1000);

export const bottleParamsSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    heightMm: length,
    bodyDiameterMm: length,
    /** Where the straight body ends and the shoulder starts. */
    bodyTopMm: length,
    neckDiameterMm: length,
    /** Where the shoulder ends and the straight neck starts. */
    neckBottomMm: length,
    /**
     * Shape of the shoulder, 0 to 1: 0 slopes evenly from the body top (Burgundy, Schlegel),
     * 1 stays wide and turns in late (Bordeaux).
     */
    shoulderCurve: z.number().min(0).max(1),
    /** Height range on the straight body that labels may cover. */
    labelZone: z.strictObject({ bottomMm: length, topMm: length }),
    /** Where the capsule (foil over the cork) starts. */
    capsuleBottomMm: length,
    glassColor: color,
    capsuleColor: color,
  })
  .superRefine((bottle, ctx) => {
    const problem = (path: string, message: string) => {
      ctx.addIssue({ code: 'custom', path: [path], message });
    };
    if (bottle.neckDiameterMm >= bottle.bodyDiameterMm)
      problem('neckDiameterMm', 'The neck must be narrower than the body');
    if (bottle.labelZone.bottomMm < BASE_ROUNDING_MM)
      problem('labelZone', `Labels start at least ${String(BASE_ROUNDING_MM)} mm above the base`);
    if (
      bottle.labelZone.topMm <= bottle.labelZone.bottomMm ||
      bottle.labelZone.topMm > bottle.bodyTopMm
    )
      problem('labelZone', 'The label zone must lie on the straight body');
    if (bottle.bodyTopMm >= bottle.neckBottomMm)
      problem('bodyTopMm', 'The shoulder must start below the neck');
    if (bottle.neckBottomMm >= bottle.heightMm - LIP_FROM_TOP_MM)
      problem('neckBottomMm', 'The neck must start below the lip');
    if (bottle.capsuleBottomMm <= bottle.bodyTopMm || bottle.capsuleBottomMm >= bottle.heightMm)
      problem('capsuleBottomMm', 'The capsule must start between the shoulder and the top');
  });

export type BottleParams = z.infer<typeof bottleParamsSchema>;

export interface BottleShape {
  id: string;
  heightMm: number;
  /** Radius of the straight body, where labels go. */
  bodyRadiusMm: number;
  labelZone: { bottomMm: number; topMm: number };
  /** Outline from the bottom centre to the top centre, for a lathe (rotation) geometry. */
  profile: readonly ProfilePoint[];
  glassColor: string;
  capsuleColor: string;
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

/** The outline of a bottle from its parameters: rounded base, body, shoulder, neck and lip. */
export function bottleFromParams(params: BottleParams): BottleShape {
  const body = params.bodyDiameterMm / 2;
  const neck = params.neckDiameterMm / 2;
  const top = params.heightMm;
  const baseEdge = { r: body - BASE_ROUNDING_MM, y: 0 };
  const shoulderStart = { r: body, y: params.bodyTopMm };
  const neckStart = { r: neck, y: params.neckBottomMm };
  const shoulderControl = {
    r: body,
    y: params.bodyTopMm + params.shoulderCurve * (params.neckBottomMm - params.bodyTopMm),
  };
  return {
    id: params.id,
    heightMm: top,
    bodyRadiusMm: body,
    labelZone: { ...params.labelZone },
    profile: [
      { r: 0, y: 0 },
      baseEdge,
      ...curve(baseEdge, { r: body, y: 0 }, { r: body, y: BASE_ROUNDING_MM }, BASE_STEPS),
      shoulderStart,
      ...curve(shoulderStart, shoulderControl, neckStart, SHOULDER_STEPS),
      { r: neck, y: top - LIP_FROM_TOP_MM },
      { r: neck + LIP_STEP_MM, y: top - LIP_FROM_TOP_MM + 1 },
      { r: neck + LIP_STEP_MM, y: top - 2 },
      { r: neck, y: top },
      { r: 0, y: top },
    ],
    glassColor: params.glassColor,
    capsuleColor: params.capsuleColor,
    capsuleBottomMm: params.capsuleBottomMm,
  };
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
