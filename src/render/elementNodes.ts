// What each design element looks like as a Konva node, in pixels. Shared by the editor canvas
// (react-konva) and the clean label renderer (plain Konva), so both draw the label the same way.
import type Konva from 'konva';
import { pointsToMm } from '../editor/units';
import { cssFontFamily } from '../fonts/fonts';
import type { Design, DesignElement } from '../model/schema';

/** Paper colour behind all elements. */
export const PAPER_COLOR = '#ffffff';

export type ElementNode =
  | { kind: 'text'; config: Konva.TextConfig }
  | { kind: 'image'; config: Konva.ImageConfig }
  | { kind: 'rect'; config: Konva.RectConfig }
  | { kind: 'ellipse'; config: Konva.EllipseConfig }
  | { kind: 'line'; config: Konva.LineConfig };

/** A decoded image for a data URL, or null while it is still loading. */
export type ImageLookup = (dataUrl: string) => HTMLImageElement | null;

export function konvaFontStyle(style: 'normal' | 'italic', weight: 'normal' | 'bold'): string {
  if (style === 'italic') return weight === 'bold' ? 'italic bold' : 'italic';
  return weight;
}

export interface ImagePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  crop?: { x: number; y: number; width: number; height: number };
}

/** Where an image of iw × ih pixels goes in a box of width × height pixels. */
export function imagePlacement(
  fit: 'cover' | 'contain' | 'stretch',
  iw: number,
  ih: number,
  width: number,
  height: number,
): ImagePlacement {
  if (fit === 'stretch' || iw === 0 || ih === 0) return { x: 0, y: 0, width, height };
  if (fit === 'cover') {
    const scale = Math.max(width / iw, height / ih);
    const cropWidth = width / scale;
    const cropHeight = height / scale;
    return {
      x: 0,
      y: 0,
      width,
      height,
      crop: {
        x: (iw - cropWidth) / 2,
        y: (ih - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      },
    };
  }
  const scale = Math.min(width / iw, height / ih);
  return {
    x: (width - iw * scale) / 2,
    y: (height - ih * scale) / 2,
    width: iw * scale,
    height: ih * scale,
  };
}

/**
 * The node drawing an element's content, in the element's own box (origin = top-left of the
 * unrotated box). Position, rotation and opacity are applied by the surrounding group.
 * Returns null for an image that is not decoded yet.
 */
export function elementNode(
  element: DesignElement,
  design: Design,
  pxPerMm: number,
  lookupImage: ImageLookup,
): ElementNode | null {
  const width = element.width * pxPerMm;
  const height = element.height * pxPerMm;
  switch (element.type) {
    case 'text': {
      const { style } = element;
      return {
        kind: 'text',
        config: {
          width,
          height,
          text: element.text,
          fontFamily: cssFontFamily(style.fontFamily),
          fontSize: pointsToMm(style.fontSizePt) * pxPerMm,
          fontStyle: konvaFontStyle(style.fontStyle, style.fontWeight),
          lineHeight: style.lineHeight,
          align: style.align,
          fill: style.color,
          wrap: 'word',
          listening: false,
        },
      };
    }
    case 'image': {
      const dataUrl = design.assets[element.assetId]?.dataUrl;
      const image = dataUrl ? lookupImage(dataUrl) : null;
      if (!image) return null;
      const placement = imagePlacement(
        element.style.fit,
        image.naturalWidth,
        image.naturalHeight,
        width,
        height,
      );
      return { kind: 'image', config: { image, ...placement, listening: false } };
    }
    case 'shape': {
      const { style } = element;
      const stroke = style.stroke ?? undefined;
      const fill = style.fill ?? undefined;
      const strokeWidth = style.strokeWidthMm * pxPerMm;
      if (element.shape === 'ellipse') {
        return {
          kind: 'ellipse',
          config: {
            x: width / 2,
            y: height / 2,
            radiusX: width / 2,
            radiusY: height / 2,
            fill,
            stroke,
            strokeWidth,
            listening: false,
          },
        };
      }
      if (element.shape === 'line') {
        return {
          kind: 'line',
          config: {
            points: [0, height / 2, width, height / 2],
            stroke: stroke ?? fill,
            strokeWidth: Math.max(strokeWidth, 1),
            listening: false,
          },
        };
      }
      return {
        kind: 'rect',
        config: {
          width,
          height,
          fill,
          stroke,
          strokeWidth,
          cornerRadius: style.cornerRadiusMm * pxPerMm,
          listening: false,
        },
      };
    }
  }
}
