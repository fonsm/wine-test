import { describe, expect, it, vi } from 'vitest';
import { EXPORT_DPI, labelSizeWithBleedPx } from '../print/geometry';
import { MAX_FILE_SIZE_BYTES, MAX_IMAGE_SIDE_PX, MIN_RECOMMENDED_SIZE_PX } from './limits';
import { processUpload, type Reencoder } from './process';
import {
  GIF_BYTES,
  PNG_SIGNATURE,
  SVG_BYTES,
  jpegHeader,
  pngHeader,
  webpLossyHeader,
} from './testing/fixtures';

const BIG = MIN_RECOMMENDED_SIZE_PX;

function file(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes as BlobPart], name, { type });
}

/** A fake decoder: the real canvas decoder only exists in a browser (see e2e/upload.spec.ts). */
function fakeReencoder(width = BIG.width, height = BIG.height): Reencoder {
  return vi.fn((_source: Blob, outputType: string) =>
    Promise.resolve({ blob: new Blob(['clean'], { type: outputType }), width, height }),
  );
}

describe('processUpload', () => {
  it('accepts a PNG and re-encodes it', async () => {
    const reencode = fakeReencoder();
    const result = await processUpload(
      file(pngHeader(BIG.width, BIG.height), 'a.png', 'image/png'),
      reencode,
    );
    expect(result).toMatchObject({
      ok: true,
      image: { width: BIG.width, height: BIG.height },
      warnings: [],
    });
    expect(reencode).toHaveBeenCalledWith(expect.any(Blob), 'image/png');
  });

  it('re-encodes JPEG as JPEG and WebP as PNG (pdf-lib cannot embed WebP)', async () => {
    const reencode = fakeReencoder();
    await processUpload(file(jpegHeader(BIG.width, BIG.height), 'a.jpg', 'image/jpeg'), reencode);
    await processUpload(
      file(webpLossyHeader(BIG.width, BIG.height), 'a.webp', 'image/webp'),
      reencode,
    );
    expect(reencode).toHaveBeenNthCalledWith(1, expect.any(Blob), 'image/jpeg');
    expect(reencode).toHaveBeenNthCalledWith(2, expect.any(Blob), 'image/png');
  });

  it('wrong type: rejects a GIF with UNSUPPORTED_TYPE', async () => {
    const result = await processUpload(file(GIF_BYTES, 'a.gif', 'image/gif'), fakeReencoder());
    expect(result).toEqual({ ok: false, error: { code: 'UNSUPPORTED_TYPE', params: {} } });
  });

  it('SVG: rejects an SVG file with UNSUPPORTED_TYPE', async () => {
    const result = await processUpload(
      file(SVG_BYTES, 'logo.svg', 'image/svg+xml'),
      fakeReencoder(),
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_TYPE' } });
  });

  it('wrong magic bytes: rejects an SVG disguised as PNG by name and MIME type', async () => {
    const result = await processUpload(file(SVG_BYTES, 'logo.png', 'image/png'), fakeReencoder());
    expect(result).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_TYPE' } });
  });

  it('renamed file: rejects a JPEG named .png with TYPE_MISMATCH', async () => {
    const result = await processUpload(
      file(jpegHeader(BIG.width, BIG.height), 'photo.png', ''),
      fakeReencoder(),
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'TYPE_MISMATCH' } });
  });

  it('renamed file: rejects a PNG whose reported MIME type says JPEG', async () => {
    const result = await processUpload(
      file(pngHeader(BIG.width, BIG.height), 'photo.jpg', 'image/jpeg'),
      fakeReencoder(),
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'TYPE_MISMATCH' } });
  });

  it('rejects a real PNG without a file extension with TYPE_MISMATCH', async () => {
    const result = await processUpload(
      file(pngHeader(BIG.width, BIG.height), 'photo', ''),
      fakeReencoder(),
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'TYPE_MISMATCH' } });
  });

  it('accepts .jpeg, upper-case extensions and an empty MIME type', async () => {
    const reencode = fakeReencoder();
    const a = await processUpload(
      file(jpegHeader(BIG.width, BIG.height), 'IMG_1.JPEG', ''),
      reencode,
    );
    const b = await processUpload(
      file(jpegHeader(BIG.width, BIG.height), 'img.jpg', 'image/jpeg'),
      reencode,
    );
    expect(a.ok && b.ok).toBe(true);
  });

  it('oversized file: rejects with FILE_TOO_LARGE without reading or decoding it', async () => {
    const bytes = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
    bytes.set(pngHeader(BIG.width, BIG.height));
    const big = file(bytes, 'huge.png', 'image/png');
    const readSpy = vi.spyOn(big, 'arrayBuffer');
    const reencode = fakeReencoder();

    const result = await processUpload(big, reencode);

    expect(result).toEqual({
      ok: false,
      error: { code: 'FILE_TOO_LARGE', params: { maxMegabytes: 10 } },
    });
    expect(readSpy).not.toHaveBeenCalled();
    expect(reencode).not.toHaveBeenCalled();
  });

  it('accepts a file of exactly the maximum size', async () => {
    const bytes = new Uint8Array(MAX_FILE_SIZE_BYTES);
    bytes.set(pngHeader(BIG.width, BIG.height));
    const result = await processUpload(file(bytes, 'max.png', 'image/png'), fakeReencoder());
    expect(result.ok).toBe(true);
  });

  it('rejects too many pixels with DIMENSIONS_TOO_LARGE before decoding', async () => {
    const reencode = fakeReencoder();
    const wide = await processUpload(
      file(pngHeader(MAX_IMAGE_SIDE_PX + 1, 100), 'a.png', 'image/png'),
      reencode,
    );
    const area = await processUpload(file(pngHeader(7000, 7000), 'b.png', 'image/png'), reencode);
    expect(wide).toMatchObject({ ok: false, error: { code: 'DIMENSIONS_TOO_LARGE' } });
    expect(area).toMatchObject({ ok: false, error: { code: 'DIMENSIONS_TOO_LARGE' } });
    expect(reencode).not.toHaveBeenCalled();
  });

  it('corrupt file: rejects an unreadable header with CORRUPT_IMAGE', async () => {
    const bytes = new Uint8Array([...PNG_SIGNATURE, 1, 2, 3, 4, 5]);
    const result = await processUpload(file(bytes, 'broken.png', 'image/png'), fakeReencoder());
    expect(result).toEqual({ ok: false, error: { code: 'CORRUPT_IMAGE', params: {} } });
  });

  it('corrupt file: rejects with CORRUPT_IMAGE when the image does not decode', async () => {
    const failing: Reencoder = () => Promise.reject(new Error('decode failed'));
    const result = await processUpload(
      file(pngHeader(100, 100), 'broken.png', 'image/png'),
      failing,
    );
    expect(result).toEqual({ ok: false, error: { code: 'CORRUPT_IMAGE', params: {} } });
  });

  it('accepts a small image but adds a TOO_SMALL warning', async () => {
    const result = await processUpload(
      file(pngHeader(800, 600), 'small.png', 'image/png'),
      fakeReencoder(800, 600),
    );
    expect(result).toMatchObject({
      ok: true,
      warnings: [
        {
          code: 'TOO_SMALL',
          params: {
            width: 800,
            height: 600,
            minWidth: BIG.width,
            minHeight: BIG.height,
            dpi: 300,
          },
        },
      ],
    });
  });

  it('measures the TOO_SMALL warning against the given label size', () => {
    // 1200 × 1500 px is enough for 90 × 120 mm, but not for a 200 × 250 mm label.
    const size = { widthMm: 200, heightMm: 250 };
    const min = labelSizeWithBleedPx(EXPORT_DPI, size);
    return processUpload(
      file(pngHeader(1200, 1500), 'a.png', 'image/png'),
      fakeReencoder(1200, 1500),
      size,
    ).then((result) => {
      expect(result).toMatchObject({
        ok: true,
        warnings: [{ code: 'TOO_SMALL', params: { minWidth: min.width, minHeight: min.height } }],
      });
    });
  });
});
