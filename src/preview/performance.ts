/** A 3D frame slower than this (median of the first frames) switches to the flat preview. */
export const SLOW_FRAME_MS = 150;

export function isTooSlow(frameMs: readonly number[], limitMs = SLOW_FRAME_MS): boolean {
  if (frameMs.length === 0) return false;
  const sorted = [...frameMs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  return median > limitMs;
}
