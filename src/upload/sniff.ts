// File type detection from content (magic bytes) and header-only dimension parsing.
// Nothing here trusts the file name or the MIME type reported by the browser.
import type { PixelSize } from '../print/geometry';
import type { AcceptedImageType } from './types';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return '';
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/** Returns the image type the content actually is, or null if it is not PNG, JPEG or WebP. */
export function detectImageType(bytes: Uint8Array): AcceptedImageType | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return 'image/png';
  if (startsWith(bytes, JPEG_SIGNATURE)) return 'image/jpeg';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
  return null;
}

/** Reads width and height from the file header without decoding. Returns null if the header is broken. */
export function readImageDimensions(bytes: Uint8Array, type: AcceptedImageType): PixelSize | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let size: PixelSize | null;
  try {
    switch (type) {
      case 'image/png':
        size = readPng(bytes, view);
        break;
      case 'image/jpeg':
        size = readJpeg(bytes, view);
        break;
      case 'image/webp':
        size = readWebp(bytes, view);
        break;
    }
  } catch {
    // DataView throws RangeError when the header is truncated.
    return null;
  }
  if (!size || size.width <= 0 || size.height <= 0) return null;
  return size;
}

function readPng(bytes: Uint8Array, view: DataView): PixelSize | null {
  if (ascii(bytes, 12, 4) !== 'IHDR') return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

// Start-of-frame markers hold the image size. C4 (DHT), C8 (JPG) and CC (DAC) are not frames.
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
const JPEG_SOS = 0xda;
const JPEG_EOI = 0xd9;

function readJpeg(bytes: Uint8Array, view: DataView): PixelSize | null {
  let offset = 2; // after SOI
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    // Skip fill bytes (0xFF 0xFF ...).
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset];
    offset++;
    if (marker === undefined || marker === JPEG_SOS || marker === JPEG_EOI) return null;
    // Markers without a length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;

    const length = view.getUint16(offset);
    if (length < 2) return null;
    if (JPEG_SOF_MARKERS.has(marker)) {
      return { height: view.getUint16(offset + 3), width: view.getUint16(offset + 5) };
    }
    offset += length;
  }
  return null;
}

function readWebp(bytes: Uint8Array, view: DataView): PixelSize | null {
  const chunk = ascii(bytes, 12, 4);
  const data = 20;
  switch (chunk) {
    case 'VP8 ': {
      if (bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a)
        return null;
      return {
        width: view.getUint16(data + 6, true) & 0x3fff,
        height: view.getUint16(data + 8, true) & 0x3fff,
      };
    }
    case 'VP8L': {
      if (bytes[data] !== 0x2f) return null;
      const bits = view.getUint32(data + 1, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    case 'VP8X': {
      const u24 = (at: number) => view.getUint16(at, true) + (view.getUint8(at + 2) << 16);
      return { width: u24(data + 4) + 1, height: u24(data + 7) + 1 };
    }
    default:
      return null;
  }
}
