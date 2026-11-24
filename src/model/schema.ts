// The label design data model and its saved-file format (schema version 1).
//
// Units and geometry (decided with the project owner, see README.md):
// - All lengths are millimetres. Pixels are derived only for display and export.
// - x/y is the top-left corner of the unrotated element box, measured from the label's trim
//   corner. Bleed lies outside the trim box (for example x = -3).
// - rotation is in degrees, clockwise, around the centre of the element box, in [0, 360).
// - Images are stored once in `assets` as PNG/JPEG data URLs; image elements reference them by id.
//
// Changing anything here that affects saved files needs a new schema version and a migration.
import { z } from 'zod';
import { LABEL_HEIGHT_MM, LABEL_WIDTH_MM } from '../print/geometry';
import { detectImageType } from '../upload/sniff';

export const DESIGN_FILE_FORMAT = 'dl-school-wine-label';
export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_TEMPLATE_ID = 'blank';
export const DEFAULT_BOTTLE_ID = 'bordeaux-750';

/** Coordinates and sizes beyond this are certainly broken files (the label is 90 × 120 mm). */
const MAX_LENGTH_MM = 1000;
const MAX_ELEMENTS = 500;
const MAX_ASSETS = 100;
const MAX_TEXT_LENGTH = 5000;

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
// Letters, digits, "-" and "_" only, never starting with "_": excludes "__proto__" and similar keys.
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const mm = z.number().min(-MAX_LENGTH_MM).max(MAX_LENGTH_MM);
const positiveMm = z.number().gt(0).max(MAX_LENGTH_MM);
const color = z.string().regex(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i);

const DATA_URL = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/;

/** PNG or JPEG data URL whose content (magic bytes) matches the declared type. */
const imageDataUrl = z.string().refine((value) => {
  const match = DATA_URL.exec(value);
  if (!match) return false;
  const [, declared, base64 = ''] = match;
  try {
    // 24 base64 characters decode to the first 18 bytes, enough for the signature.
    const head = atob(base64.slice(0, 24));
    const bytes = Uint8Array.from(head, (char) => char.charCodeAt(0));
    return detectImageType(bytes) === declared;
  } catch {
    return false;
  }
}, 'Must be a PNG or JPEG data URL');

const elementBase = {
  id,
  x: mm,
  y: mm,
  width: positiveMm,
  height: positiveMm,
  rotation: z.number().min(0).lt(360),
  opacity: z.number().min(0).max(1),
};

export const textElementSchema = z.strictObject({
  ...elementBase,
  type: z.literal('text'),
  text: z.string().max(MAX_TEXT_LENGTH),
  style: z.strictObject({
    fontFamily: z.string().min(1).max(100),
    fontSizePt: z.number().gt(0).max(500),
    fontWeight: z.enum(['normal', 'bold']),
    fontStyle: z.enum(['normal', 'italic']),
    color,
    align: z.enum(['left', 'center', 'right']),
    lineHeight: z.number().gt(0).max(10),
  }),
});

export const imageElementSchema = z.strictObject({
  ...elementBase,
  type: z.literal('image'),
  assetId: id,
  style: z.strictObject({
    fit: z.enum(['cover', 'contain', 'stretch']),
  }),
});

export const shapeElementSchema = z.strictObject({
  ...elementBase,
  type: z.literal('shape'),
  shape: z.enum(['rect', 'ellipse', 'line']),
  style: z.strictObject({
    fill: color.nullable(),
    stroke: color.nullable(),
    strokeWidthMm: z.number().min(0).max(100),
    cornerRadiusMm: z.number().min(0).max(MAX_LENGTH_MM),
  }),
});

export const elementSchema = z.discriminatedUnion('type', [
  textElementSchema,
  imageElementSchema,
  shapeElementSchema,
]);

export const designSchema = z
  .strictObject({
    format: z.literal(DESIGN_FILE_FORMAT),
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    labelSize: z.strictObject({ widthMm: positiveMm, heightMm: positiveMm }),
    templateId: slug,
    bottleId: slug,
    assets: z
      .record(id, z.strictObject({ dataUrl: imageDataUrl }))
      .refine(
        (assets) => Object.keys(assets).length <= MAX_ASSETS,
        `At most ${String(MAX_ASSETS)} images`,
      ),
    /** Ordered back to front: later elements are drawn on top. */
    elements: z.array(elementSchema).max(MAX_ELEMENTS),
  })
  .superRefine((design, ctx) => {
    const seen = new Set<string>();
    design.elements.forEach((element, index) => {
      if (seen.has(element.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['elements', index, 'id'],
          message: 'Duplicate element id',
        });
      }
      seen.add(element.id);
      if (element.type === 'image' && !Object.hasOwn(design.assets, element.assetId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['elements', index, 'assetId'],
          message: 'Unknown asset',
        });
      }
    });
  });

export type Design = z.infer<typeof designSchema>;
export type DesignElement = Design['elements'][number];
export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type ShapeElement = z.infer<typeof shapeElementSchema>;

export function createEmptyDesign(): Design {
  return {
    format: DESIGN_FILE_FORMAT,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    labelSize: { widthMm: LABEL_WIDTH_MM, heightMm: LABEL_HEIGHT_MM },
    templateId: DEFAULT_TEMPLATE_ID,
    bottleId: DEFAULT_BOTTLE_ID,
    assets: {},
    elements: [],
  };
}
