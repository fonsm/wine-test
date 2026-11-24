// A flat outline of a bottle for the gallery (SVG coordinates in mm, y downwards from the top).
import type { BottleShape } from './bottles';

export interface Silhouette {
  viewBox: { x: number; y: number; width: number; height: number };
  /** Closed SVG path of the whole bottle. */
  outline: string;
  /** Height of the capsule from the top, for colouring it. */
  capsuleHeight: number;
}

const round = (value: number) => Number(value.toFixed(3));

export function silhouette(bottle: BottleShape): Silhouette {
  const widest = Math.max(...bottle.profile.map((point) => point.r));
  const toSvg = (r: number, y: number) =>
    `${String(round(r))} ${String(round(bottle.heightMm - y))}`;
  const right = bottle.profile.map((point) => toSvg(point.r, point.y));
  const left = [...bottle.profile].reverse().map((point) => toSvg(-point.r, point.y));
  return {
    viewBox: { x: -widest, y: 0, width: 2 * widest, height: bottle.heightMm },
    outline: `M ${[...right, ...left].join(' L ')} Z`,
    capsuleHeight: bottle.heightMm - bottle.capsuleBottomMm,
  };
}
