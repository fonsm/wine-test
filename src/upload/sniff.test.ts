import { describe, expect, it } from 'vitest';
import { detectImageType, readImageDimensions } from './sniff';
import {
  GIF_BYTES,
  PNG_SIGNATURE,
  SVG_BYTES,
  jpegHeader,
  pngHeader,
  webpExtendedHeader,
  webpLosslessHeader,
  webpLossyHeader,
} from './testing/fixtures';

describe('detectImageType (magic bytes)', () => {
  it('detects PNG, JPEG and WebP from their content', () => {
    expect(detectImageType(pngHeader(10, 10))).toBe('image/png');
    expect(detectImageType(jpegHeader(10, 10))).toBe('image/jpeg');
    expect(detectImageType(webpLossyHeader(10, 10))).toBe('image/webp');
  });

  it('rejects SVG, GIF, text and empty input', () => {
    expect(detectImageType(SVG_BYTES)).toBeNull();
    expect(detectImageType(GIF_BYTES)).toBeNull();
    expect(detectImageType(new TextEncoder().encode('hello'))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });

  it('rejects files that only start like an allowed type', () => {
    expect(detectImageType(new Uint8Array(PNG_SIGNATURE.slice(0, 4)))).toBeNull();
    expect(detectImageType(new TextEncoder().encode('RIFF\0\0\0\0WAVEfmt '))).toBeNull();
  });
});

describe('readImageDimensions (from the file header, before decoding)', () => {
  it('reads PNG dimensions', () => {
    expect(readImageDimensions(pngHeader(1200, 800), 'image/png')).toEqual({
      width: 1200,
      height: 800,
    });
  });

  it('reads JPEG dimensions from the SOF segment', () => {
    expect(readImageDimensions(jpegHeader(4000, 3000), 'image/jpeg')).toEqual({
      width: 4000,
      height: 3000,
    });
  });

  it('reads lossy, lossless and extended WebP dimensions', () => {
    expect(readImageDimensions(webpLossyHeader(640, 480), 'image/webp')).toEqual({
      width: 640,
      height: 480,
    });
    expect(readImageDimensions(webpLosslessHeader(300, 200), 'image/webp')).toEqual({
      width: 300,
      height: 200,
    });
    expect(readImageDimensions(webpExtendedHeader(5000, 7000), 'image/webp')).toEqual({
      width: 5000,
      height: 7000,
    });
  });

  it('returns null for truncated or broken headers', () => {
    expect(readImageDimensions(new Uint8Array(PNG_SIGNATURE), 'image/png')).toBeNull();
    expect(readImageDimensions(jpegHeader(10, 10).slice(0, 24), 'image/jpeg')).toBeNull();
    expect(readImageDimensions(webpLossyHeader(10, 10).slice(0, 22), 'image/webp')).toBeNull();
  });

  it('returns null for zero-sized images', () => {
    expect(readImageDimensions(pngHeader(0, 10), 'image/png')).toBeNull();
    expect(readImageDimensions(jpegHeader(10, 0), 'image/jpeg')).toBeNull();
  });
});
