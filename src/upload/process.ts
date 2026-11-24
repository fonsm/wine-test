import {
  JPEG_REENCODE_QUALITY,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_IMAGE_MEGAPIXELS,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIDE_PX,
  MIN_RECOMMENDED_SIZE_PX,
} from './limits';
import { EXPORT_DPI, labelSizeWithBleedPx, type LabelSize } from '../print/geometry';
import { detectImageType, readImageDimensions } from './sniff';
import type {
  AcceptedImageType,
  OutputImageType,
  UploadError,
  UploadResult,
  UploadWarning,
} from './types';

export interface ReencodedImage {
  blob: Blob;
  width: number;
  height: number;
}

/** Decodes `source` and encodes it again as `outputType`. Must reject if the image does not decode. */
export type Reencoder = (source: Blob, outputType: OutputImageType) => Promise<ReencodedImage>;

const EXTENSION_TYPES: Readonly<Record<string, AcceptedImageType>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  jfif: 'image/jpeg',
  webp: 'image/webp',
};

const MIME_ALIASES: Readonly<Record<string, string>> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
};

const OUTPUT_TYPES: Readonly<Record<AcceptedImageType, OutputImageType>> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  // pdf-lib cannot embed WebP, and PNG keeps transparency without quality loss.
  'image/webp': 'image/png',
};

function fail(code: UploadError['code'], params: UploadError['params'] = {}): UploadResult {
  return { ok: false, error: { code, params } };
}

/** True if the file name or the browser-reported MIME type claims a different type than the content. */
function claimsOtherType(file: File, actual: AcceptedImageType): boolean {
  const extension = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase() ?? '';
  if (EXTENSION_TYPES[extension] !== actual) return true;
  const mime = file.type.toLowerCase();
  // Some browsers report no MIME type at all; that is not a contradiction.
  return mime !== '' && (MIME_ALIASES[mime] ?? mime) !== actual;
}

/**
 * Validates an uploaded file and returns a clean copy, re-encoded through a canvas so that
 * EXIF, GPS and all other metadata are removed. Runs fully in the browser; nothing is sent anywhere.
 */
export async function processUpload(
  file: File,
  reencode: Reencoder = reencodeWithCanvas,
  /** The design's label size, for the TOO_SMALL warning. Defaults to the standard label. */
  labelSize?: LabelSize,
): Promise<UploadResult> {
  // Checked first so huge files are never read into memory.
  if (file.size > MAX_FILE_SIZE_BYTES)
    return fail('FILE_TOO_LARGE', { maxMegabytes: MAX_FILE_SIZE_MB });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) return fail('UNSUPPORTED_TYPE');
  if (claimsOtherType(file, type)) return fail('TYPE_MISMATCH');

  const size = readImageDimensions(bytes, type);
  if (!size) return fail('CORRUPT_IMAGE');
  if (
    size.width > MAX_IMAGE_SIDE_PX ||
    size.height > MAX_IMAGE_SIDE_PX ||
    size.width * size.height > MAX_IMAGE_PIXELS
  ) {
    return fail('DIMENSIONS_TOO_LARGE', {
      maxSidePx: MAX_IMAGE_SIDE_PX,
      maxMegapixels: MAX_IMAGE_MEGAPIXELS,
    });
  }

  const outputType = OUTPUT_TYPES[type];
  let clean: ReencodedImage;
  try {
    clean = await reencode(new Blob([bytes], { type }), outputType);
  } catch {
    return fail('CORRUPT_IMAGE');
  }

  const warnings: UploadWarning[] = [];
  const min = labelSize ? labelSizeWithBleedPx(EXPORT_DPI, labelSize) : MIN_RECOMMENDED_SIZE_PX;
  if (clean.width < min.width || clean.height < min.height) {
    warnings.push({
      code: 'TOO_SMALL',
      params: {
        width: clean.width,
        height: clean.height,
        minWidth: min.width,
        minHeight: min.height,
        dpi: EXPORT_DPI,
      },
    });
  }

  return { ok: true, image: { ...clean, type: outputType }, warnings };
}

/** Browser implementation: decode with createImageBitmap, draw on a canvas, encode again. */
export const reencodeWithCanvas: Reencoder = async (source, outputType) => {
  // 'from-image' applies the EXIF orientation before the EXIF data is dropped.
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  try {
    const { width, height } = bitmap;
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is not available');
    context.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({
      type: outputType,
      ...(outputType === 'image/jpeg' ? { quality: JPEG_REENCODE_QUALITY } : {}),
    });
    if (blob.type !== outputType) throw new Error(`Browser cannot encode ${outputType}`);
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
};
