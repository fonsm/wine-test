// Creates the PDFs in the browser: decodes images, draws text and photos as pictures at the
// planned size, and writes the PDF. Loaded only when the user downloads (pdf-lib is large).
import type { TFunction } from 'i18next';
import type { Design } from '../model/schema';
import { CALIBRATION_RULER_MM, CALIBRATION_SQUARE_MM, EXPORT_DPI } from '../print/geometry';
import { cachedImage } from '../render/images';
import { LabelRenderer, prepareDesign } from '../render/renderLabel';
import { writeCalibrationPdf, writeLabelPdf, type RasterImage } from './pdf';
import { planLabelExport, type ExportOptions, type PlacedItem } from './plan';

/** JPEG quality for resampled photos: no visible loss in print. */
const JPEG_QUALITY = 0.92;

export interface LabelPdfResult {
  bytes: Uint8Array;
  /** Images that end up below EXPORT_DPI on paper. */
  lowResolutionImages: number;
}

async function canvasBytes(canvas: HTMLCanvasElement, format: RasterImage['format']) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, format === 'jpeg' ? 'image/jpeg' : 'image/png', JPEG_QUALITY);
  });
  if (!blob) throw new Error('canvas could not be encoded');
  return new Uint8Array(await blob.arrayBuffer());
}

function dataUrlBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function rasterize(
  item: Exclude<PlacedItem, { kind: 'shape' }>,
  design: Design,
  renderer: LabelRenderer,
): Promise<RasterImage | null> {
  const element = design.elements.find((candidate) => candidate.id === item.elementId);
  if (!element) return null;
  if (item.kind === 'text') {
    return {
      format: 'png',
      bytes: await canvasBytes(
        renderer.drawElement(element, design, item.pixelWidth, item.pixelHeight),
        'png',
      ),
    };
  }
  const dataUrl = design.assets[item.assetId]?.dataUrl;
  const image = dataUrl ? cachedImage(dataUrl) : null;
  if (!dataUrl || !image) return null;
  const format = dataUrl.startsWith('data:image/jpeg') ? 'jpeg' : 'png';
  const { crop, pixelWidth, pixelHeight } = item;
  // Shown whole and not resampled: the uploaded file goes in unchanged.
  if (
    crop.x === 0 &&
    crop.y === 0 &&
    crop.width === image.naturalWidth &&
    crop.height === image.naturalHeight &&
    pixelWidth === image.naturalWidth &&
    pixelHeight === image.naturalHeight
  ) {
    return { format, bytes: dataUrlBytes(dataUrl) };
  }
  const canvas = document.createElement('canvas');
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no 2d context');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, pixelWidth, pixelHeight);
  return { format, bytes: await canvasBytes(canvas, format) };
}

export async function createLabelPdf(
  design: Design,
  options: ExportOptions,
  title: string,
): Promise<LabelPdfResult> {
  await prepareDesign(design);
  const plan = planLabelExport(design, options, (assetId) => {
    const dataUrl = design.assets[assetId]?.dataUrl;
    const image = dataUrl ? cachedImage(dataUrl) : null;
    return image ? { width: image.naturalWidth, height: image.naturalHeight } : null;
  });
  const renderer = new LabelRenderer();
  const rasters = new Map<string, RasterImage>();
  try {
    for (const item of plan.items) {
      if (item.kind === 'shape') continue;
      const raster = await rasterize(item, design, renderer);
      if (raster) rasters.set(item.elementId, raster);
    }
  } finally {
    renderer.dispose();
  }
  const lowResolutionImages = plan.items.filter(
    (item) => item.kind === 'image' && Math.min(item.dpi.x, item.dpi.y) < EXPORT_DPI - 0.5,
  ).length;
  return { bytes: await writeLabelPdf(plan, rasters, title), lowResolutionImages };
}

export function createCalibrationPdf(t: TFunction): Promise<Uint8Array> {
  const values = {
    square: CALIBRATION_SQUARE_MM,
    ruler: CALIBRATION_RULER_MM,
    cm: CALIBRATION_RULER_MM / 10,
  };
  return writeCalibrationPdf({
    title: t('export:calibration.title'),
    lines: [
      t('export:calibration.line1', values),
      t('export:calibration.line2', values),
      t('export:calibration.line3', values),
    ],
    square: t('export:calibration.square', values),
    ruler: t('export:calibration.ruler', values),
  });
}
