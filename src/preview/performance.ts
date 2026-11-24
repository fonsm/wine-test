/** A 3D frame slower than this (median of the first frames) is too slow for turning the bottle. */
export const SLOW_FRAME_MS = 150;

export function isTooSlow(frameMs: readonly number[], limitMs = SLOW_FRAME_MS): boolean {
  if (frameMs.length === 0) return false;
  const sorted = [...frameMs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  return median > limitMs;
}

/** Pixel ratio tried before giving up on 3D: one canvas pixel per CSS pixel. */
export const FALLBACK_PIXEL_RATIO = 1;

/**
 * What to do after measuring the first frames: keep 3D, try again at a lower resolution
 * (sharp screens render up to 4 times the pixels), or show the flat preview.
 */
export function decideQuality(
  frameMs: readonly number[],
  pixelRatio: number,
): 'keep' | 'lower' | 'flat' {
  if (!isTooSlow(frameMs)) return 'keep';
  return pixelRatio > FALLBACK_PIXEL_RATIO ? 'lower' : 'flat';
}

/** What chooseQuality needs from the 3D viewer. */
export interface QualityProbe {
  /** Renders a few frames and returns their durations in milliseconds. */
  measure(): number[];
  pixelRatio(): number;
  setPixelRatio(ratio: number): void;
}

/**
 * Decides between 3D and the flat preview: lowers the resolution first if that can help, and
 * measures once more after `pause` before giving up, so a moment of other work (the page still
 * loading) does not count as a slow device.
 */
export async function chooseQuality(
  probe: QualityProbe,
  pause: () => Promise<void>,
): Promise<'3d' | 'flat'> {
  let decision = decideQuality(probe.measure(), probe.pixelRatio());
  if (decision === 'lower') {
    probe.setPixelRatio(FALLBACK_PIXEL_RATIO);
    decision = decideQuality(probe.measure(), probe.pixelRatio());
  }
  if (decision === 'flat') {
    await pause();
    decision = decideQuality(probe.measure(), probe.pixelRatio());
  }
  return decision === 'keep' ? '3d' : 'flat';
}
