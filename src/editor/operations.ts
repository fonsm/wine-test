// Pure design operations. Every function returns a new design (or the same object when nothing
// changed) and never mutates its input. Results always pass the design schema.
import { elementSchema, type Design, type DesignElement, type TextElement } from '../model/schema';
import { isValidLabelSize, type LabelSize } from '../print/geometry';

/** New images are fitted into this fraction of the label (trim box), keeping their aspect ratio. */
export const NEW_IMAGE_MAX_FRACTION = 0.8;
export const MIN_ELEMENT_SIZE_MM = 1;
const MAX_COORDINATE_MM = 1000;

/** Defaults for new text elements. */
const NEW_TEXT_WIDTH_FRACTION = 0.8;
const NEW_TEXT_HEIGHT_MM = 14;
const NEW_TEXT_STEP_MM = 8; // further text elements are placed lower, so they do not cover each other
const NEW_TEXT_STEPS = 6;
const NEW_TEXT_STYLE: Omit<TextElement['style'], 'fontFamily'> = {
  fontSizePt: 18,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#1a1a1a',
  align: 'center',
  lineHeight: 1.2,
};

export type LayerDirection = 'forward' | 'backward' | 'front' | 'back';

export interface ElementPatch {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  /** Text elements only. */
  text?: string;
  /** Text elements only. */
  style?: Partial<TextElement['style']>;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeRotation(degrees: number): number {
  const normalized = round2(((degrees % 360) + 360) % 360);
  return normalized >= 360 ? 0 : normalized;
}

export function addTextElement(
  design: Design,
  options: { id: string; text: string; fontFamily: string },
): Design {
  const { widthMm, heightMm } = design.labelSize;
  const width = round2(widthMm * NEW_TEXT_WIDTH_FRACTION);
  const textCount = design.elements.filter((element) => element.type === 'text').length;
  const element: TextElement = {
    id: options.id,
    type: 'text',
    x: round2((widthMm - width) / 2),
    y: round2(
      heightMm / 3 - NEW_TEXT_HEIGHT_MM / 2 + (textCount % NEW_TEXT_STEPS) * NEW_TEXT_STEP_MM,
    ),
    width,
    height: NEW_TEXT_HEIGHT_MM,
    rotation: 0,
    opacity: 1,
    text: options.text,
    style: { ...NEW_TEXT_STYLE, fontFamily: options.fontFamily },
  };
  return { ...design, elements: [...design.elements, element] };
}

export function addImageElement(
  design: Design,
  options: {
    elementId: string;
    assetId: string;
    dataUrl: string;
    widthPx: number;
    heightPx: number;
  },
): Design {
  // Reuse an asset with the same content, so an image used twice is stored once.
  const existing = Object.entries(design.assets).find(
    ([, asset]) => asset.dataUrl === options.dataUrl,
  );
  const assetId = existing ? existing[0] : options.assetId;
  const assets = existing
    ? design.assets
    : { ...design.assets, [assetId]: { dataUrl: options.dataUrl } };

  const { widthMm, heightMm } = design.labelSize;
  const scale = Math.min(
    (widthMm * NEW_IMAGE_MAX_FRACTION) / options.widthPx,
    (heightMm * NEW_IMAGE_MAX_FRACTION) / options.heightPx,
  );
  const width = Math.max(MIN_ELEMENT_SIZE_MM, round2(options.widthPx * scale));
  const height = Math.max(MIN_ELEMENT_SIZE_MM, round2(options.heightPx * scale));
  const element: DesignElement = {
    id: options.elementId,
    type: 'image',
    x: round2((widthMm - width) / 2),
    y: round2((heightMm - height) / 2),
    width,
    height,
    rotation: 0,
    opacity: 1,
    assetId,
    style: { fit: 'contain' },
  };
  return { ...design, assets, elements: [...design.elements, element] };
}

export function updateElement(design: Design, id: string, patch: ElementPatch): Design {
  const index = design.elements.findIndex((element) => element.id === id);
  const current = design.elements[index];
  if (!current) return design;

  const values = [patch.x, patch.y, patch.width, patch.height, patch.rotation, patch.opacity];
  if (values.some((value) => value !== undefined && !Number.isFinite(value))) return design;

  let next: DesignElement = { ...current };
  if (patch.x !== undefined) next.x = round2(clamp(patch.x, -MAX_COORDINATE_MM, MAX_COORDINATE_MM));
  if (patch.y !== undefined) next.y = round2(clamp(patch.y, -MAX_COORDINATE_MM, MAX_COORDINATE_MM));
  if (patch.width !== undefined) {
    next.width = round2(clamp(patch.width, MIN_ELEMENT_SIZE_MM, MAX_COORDINATE_MM));
  }
  if (patch.height !== undefined) {
    next.height = round2(clamp(patch.height, MIN_ELEMENT_SIZE_MM, MAX_COORDINATE_MM));
  }
  if (patch.rotation !== undefined) next.rotation = normalizeRotation(patch.rotation);
  if (patch.opacity !== undefined) next.opacity = clamp(patch.opacity, 0, 1);
  if (next.type === 'text') {
    next = {
      ...next,
      ...(patch.text !== undefined ? { text: patch.text } : {}),
      style: { ...next.style, ...patch.style },
    };
  }

  if (!elementSchema.safeParse(next).success) return design;
  const elements = design.elements.slice();
  elements[index] = next;
  return { ...design, elements };
}

export function deleteElement(design: Design, id: string): Design {
  const removed = design.elements.find((element) => element.id === id);
  if (!removed) return design;
  const elements = design.elements.filter((element) => element.id !== id);
  if (removed.type !== 'image') return { ...design, elements };

  const stillUsed = elements.some(
    (element) => element.type === 'image' && element.assetId === removed.assetId,
  );
  if (stillUsed) return { ...design, elements };
  const assets = Object.fromEntries(
    Object.entries(design.assets).filter(([assetId]) => assetId !== removed.assetId),
  );
  return { ...design, assets, elements };
}

/** Changes the layer order. Elements are stored back to front. */
export function reorderElement(design: Design, id: string, direction: LayerDirection): Design {
  const from = design.elements.findIndex((element) => element.id === id);
  if (from < 0) return design;
  const last = design.elements.length - 1;
  const to = {
    forward: Math.min(last, from + 1),
    backward: Math.max(0, from - 1),
    front: last,
    back: 0,
  }[direction];
  if (to === from) return design;

  const elements = design.elements.slice();
  const [element] = elements.splice(from, 1);
  if (!element) return design;
  elements.splice(to, 0, element);
  return { ...design, elements };
}

/**
 * Changes the label size. Elements keep their size and their position relative to the label
 * centre (decided by the project owner); elements may stick out of a smaller label.
 */
export function resizeLabel(design: Design, size: LabelSize): Design {
  const next = { widthMm: round2(size.widthMm), heightMm: round2(size.heightMm) };
  if (!isValidLabelSize(next)) return design;
  const { widthMm, heightMm } = design.labelSize;
  if (next.widthMm === widthMm && next.heightMm === heightMm) return design;

  const dx = (next.widthMm - widthMm) / 2;
  const dy = (next.heightMm - heightMm) / 2;
  const elements = design.elements.map((element) => ({
    ...element,
    x: round2(clamp(element.x + dx, -MAX_COORDINATE_MM, MAX_COORDINATE_MM)),
    y: round2(clamp(element.y + dy, -MAX_COORDINATE_MM, MAX_COORDINATE_MM)),
  }));
  return { ...design, labelSize: next, elements };
}
