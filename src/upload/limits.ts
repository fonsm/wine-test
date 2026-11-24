// Upload limits. All values are assumptions and are listed in README.md.
import { EXPORT_DPI, labelSizeWithBleedPx } from '../print/geometry';

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Longest allowed side. Larger images are refused before decoding (protects against decompression bombs). */
export const MAX_IMAGE_SIDE_PX = 8000;
export const MAX_IMAGE_MEGAPIXELS = 40;
export const MAX_IMAGE_PIXELS = MAX_IMAGE_MEGAPIXELS * 1_000_000;

/** Below this size an image cannot fill the whole label (with bleed) at export DPI: TOO_SMALL warning. */
export const MIN_RECOMMENDED_SIZE_PX = labelSizeWithBleedPx(EXPORT_DPI);

/** JPEG quality for re-encoding. High, because the image is printed. */
export const JPEG_REENCODE_QUALITY = 0.95;
