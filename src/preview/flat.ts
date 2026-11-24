// The 2D fallback when WebGL is missing or too slow: the bottle seen straight from the front,
// with the label drawn as it curves around the glass. Plain Canvas 2D, no WebGL.
import type { BottleShape } from './bottles';
import type { LabelWrap } from './wrap';

/** Empty space around the bottle, in millimetres. */
const PADDING_MM = 6;

/**
 * Arc length (from the front centre) of the point on a cylinder that appears at screen offset
 * x from its axis, seen from far in front. Null outside the cylinder.
 */
export function arcAtScreenX(xMm: number, radiusMm: number): number | null {
  if (Math.abs(xMm) > radiusMm) return null;
  return Math.asin(xMm / radiusMm) * radiusMm;
}

/** Draws the flat preview into target, pxPerMm pixels per millimetre of bottle. */
export function drawFlatPreview(
  target: HTMLCanvasElement,
  label: CanvasImageSource & { width: number; height: number },
  bottle: BottleShape,
  wrap: LabelWrap,
  pxPerMm: number,
): void {
  const maxRadius = Math.max(...bottle.profile.map((point) => point.r));
  const halfWidth = maxRadius + PADDING_MM;
  target.width = Math.round(2 * halfWidth * pxPerMm);
  target.height = Math.round((bottle.heightMm + 2 * PADDING_MM) * pxPerMm);
  const ctx = target.getContext('2d');
  if (!ctx) return;
  const s = pxPerMm;
  const toX = (xMm: number) => (xMm + halfWidth) * s;
  const toY = (yMm: number) => (bottle.heightMm + PADDING_MM - yMm) * s;

  ctx.clearRect(0, 0, target.width, target.height);
  const outline = new Path2D();
  bottle.profile.forEach((point, index) => {
    if (index === 0) outline.moveTo(toX(point.r), toY(point.y));
    else outline.lineTo(toX(point.r), toY(point.y));
  });
  for (const point of [...bottle.profile].reverse()) outline.lineTo(toX(-point.r), toY(point.y));
  outline.closePath();

  ctx.save();
  ctx.clip(outline);
  ctx.fillStyle = bottle.glassColor;
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.fillStyle = bottle.capsuleColor;
  ctx.fillRect(0, 0, target.width, toY(bottle.capsuleBottomMm));

  // The label, column by column: narrower towards the sides, like on the round glass.
  const { radiusMm: r, heightMm, centerYMm, uv } = wrap;
  const shownWidthMm = wrap.thetaLength * r;
  const sourceX = (xMm: number): number | null => {
    const arc = arcAtScreenX(xMm, r);
    if (arc === null) return null;
    const u = arc / shownWidthMm + 0.5;
    if (u < 0 || u > 1) return null;
    return (uv.offsetX + u * uv.repeatX) * label.width;
  };
  const sy = uv.offsetY * label.height;
  const sh = uv.repeatY * label.height;
  const top = toY(centerYMm + heightMm / 2);
  const height = heightMm * s;
  const firstColumn = Math.floor(toX(-r));
  const lastColumn = Math.ceil(toX(r));
  for (let column = firstColumn; column < lastColumn; column++) {
    const from = sourceX(column / s - halfWidth);
    const to = sourceX((column + 1) / s - halfWidth);
    if (from === null || to === null) continue;
    ctx.drawImage(label, from, sy, Math.max(to - from, 1), sh, column, top, 1, height);
  }

  // Light from the front-left: brighter there, darker towards the edges.
  const shade = ctx.createLinearGradient(toX(-maxRadius), 0, toX(maxRadius), 0);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  shade.addColorStop(0.3, 'rgba(255, 255, 255, 0.12)');
  shade.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.restore();
}
