import { expect, test, type Page } from '@playwright/test';
import { createI18n, type Language } from '../src/i18n';
import { EXPORT_DPI } from '../src/print/geometry';
import { formatIssue } from '../src/upload/format';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_IMAGE_MEGAPIXELS,
  MAX_IMAGE_SIDE_PX,
  MIN_RECOMMENDED_SIZE_PX,
} from '../src/upload/limits';
import { GIF_BYTES, PNG_SIGNATURE, SVG_BYTES, pngHeader } from '../src/upload/testing/fixtures';
import type { UploadIssue } from '../src/upload/types';

// Test files are built inside the browser (canvas, Uint8Array) and handed to the file input
// through a DataTransfer, exactly like a file chosen by the user.

/** A gradient image drawn on a canvas and encoded as `type`, optionally with EXIF/GPS data added. */
interface CanvasSource {
  canvas: { type: string; width: number; height: number };
  exif?: boolean;
}
/** Raw bytes, optionally zero-padded to `padTo` bytes. */
interface BytesSource {
  bytes: number[];
  padTo?: number;
}
type Source = CanvasSource | BytesSource;

const ascii = (text: string): number[] => Array.from(text, (char) => char.charCodeAt(0));

/** EXIF APP1 segment with a camera make ("Cam") and a GPS IFD (latitude ref "N"). */
const EXIF_APP1: number[] = (() => {
  const tiff = [
    ...[0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08], // big-endian TIFF header, IFD0 at 8
    ...[0x00, 0x02], // IFD0: 2 entries
    ...[0x01, 0x0f, 0x00, 0x02, 0x00, 0x00, 0x00, 0x04, ...ascii('Cam\0')], // Make
    ...[0x88, 0x25, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x26], // GPS IFD at 38
    ...[0x00, 0x00, 0x00, 0x00], // no next IFD
    ...[0x00, 0x01], // GPS IFD: 1 entry
    ...[0x00, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, ...ascii('N\0\0\0')], // GPSLatitudeRef
    ...[0x00, 0x00, 0x00, 0x00],
  ];
  const payload = [...ascii('Exif\0\0'), ...tiff];
  const length = payload.length + 2;
  return [0xff, 0xe1, length >> 8, length & 0xff, ...payload];
})();

function includes(haystack: readonly number[], needle: readonly number[]): boolean {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

function hasMetadata(bytes: readonly number[]): boolean {
  return (
    includes(bytes, ascii('Exif\0\0')) ||
    includes(bytes, [0xff, 0xe1]) ||
    includes(bytes, ascii('Cam\0'))
  );
}

/** A PNG with a valid header but damaged image data. */
const CORRUPT_PNG: number[] = [
  ...pngHeader(64, 64),
  ...[0, 0, 0, 64, ...ascii('IDAT'), ...new Array<number>(64).fill(0x5a), 0, 0, 0, 0],
  ...[0, 0, 0, 0, ...ascii('IEND'), 0xae, 0x42, 0x60, 0x82],
];

/** Puts a file into the upload input. Returns the uploaded bytes for canvas sources. */
async function upload(
  page: Page,
  name: string,
  mimeType: string,
  source: Source,
): Promise<number[]> {
  return page.evaluate(
    async ({ name, mimeType, source, exifApp1 }) => {
      let bytes: Uint8Array<ArrayBuffer>;
      if ('canvas' in source) {
        const { type, width, height } = source.canvas;
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no 2d context');
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#7b1e3a');
        gradient.addColorStop(1, '#f2e6c9');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        const encoded = new Uint8Array(
          await (await canvas.convertToBlob({ type, quality: 0.9 })).arrayBuffer(),
        );
        // Insert the EXIF segment right after the JPEG SOI marker.
        bytes = source.exif
          ? new Uint8Array([...encoded.subarray(0, 2), ...exifApp1, ...encoded.subarray(2)])
          : encoded;
      } else {
        bytes = new Uint8Array(Math.max(source.padTo ?? 0, source.bytes.length));
        bytes.set(source.bytes);
      }

      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (!input) throw new Error('file input not found');
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], name, { type: mimeType }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return 'canvas' in source ? Array.from(bytes) : [];
    },
    { name, mimeType, source, exifApp1: EXIF_APP1 },
  );
}

const preview = (page: Page) => page.locator('img[data-testid="upload-preview"]');

async function previewBytes(page: Page): Promise<number[]> {
  await expect(preview(page)).toBeVisible();
  return preview(page).evaluate(async (img: HTMLImageElement) => {
    const response = await fetch(img.src);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
}

const jpeg = (width = 1200, height = 1500, exif = false): Source => ({
  canvas: { type: 'image/jpeg', width, height },
  exif,
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('accepts a JPEG, shows a preview and confirms it', async ({ page }) => {
  await upload(page, 'wine.jpg', 'image/jpeg', jpeg());
  await expect(page.getByRole('status')).toContainText('wine.jpg');
  await expect(page.getByRole('alert')).toHaveCount(0);
  const naturalWidth = await preview(page).evaluate((img: HTMLImageElement) =>
    img.decode().then(() => img.naturalWidth),
  );
  expect(naturalWidth).toBe(1200);
});

test('EXIF removal: strips EXIF and GPS data from a JPEG', async ({ page }) => {
  const original = await upload(page, 'gps.jpg', 'image/jpeg', jpeg(1200, 1500, true));
  expect(hasMetadata(original)).toBe(true);
  expect(includes(original, ascii('N\0\0\0'))).toBe(true);

  const cleaned = await previewBytes(page);

  expect(cleaned.slice(0, 3)).toEqual([0xff, 0xd8, 0xff]); // still a JPEG
  expect(hasMetadata(cleaned)).toBe(false);
});

test('re-encodes WebP as PNG', async ({ page }) => {
  await upload(page, 'a.webp', 'image/webp', {
    canvas: { type: 'image/webp', width: 1200, height: 1500 },
  });
  const cleaned = await previewBytes(page);
  expect(cleaned.slice(0, 8)).toEqual(PNG_SIGNATURE);
});

test('no network request is made during upload', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    const { protocol } = new URL(request.url());
    // blob: and data: URLs are in-memory and never leave the browser.
    if (protocol !== 'blob:' && protocol !== 'data:') requests.push(request.url());
  });

  await upload(page, 'private.jpg', 'image/jpeg', jpeg(1200, 1500, true));
  await expect(preview(page)).toBeVisible();
  await upload(page, 'evil.svg', 'image/svg+xml', { bytes: Array.from(SVG_BYTES) });
  await expect(page.getByRole('alert')).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(requests).toEqual([]);
});

test('a file name containing HTML is shown as text, not inserted as HTML', async ({ page }) => {
  const name = '<img src=x onerror="window.__xss=1">.svg';
  await upload(page, name, 'image/svg+xml', { bytes: Array.from(SVG_BYTES) });
  await expect(page.getByRole('alert')).toContainText(name);
  await expect(page.locator('[role="alert"] img')).toHaveCount(0);
  expect(await page.evaluate(() => '__xss' in window)).toBe(false);
});

const errorCases: {
  title: string;
  name: string;
  mimeType: string;
  source: Source;
  issue: UploadIssue;
}[] = [
  {
    title: 'wrong type (GIF)',
    name: 'anim.gif',
    mimeType: 'image/gif',
    source: { bytes: Array.from(GIF_BYTES) },
    issue: { code: 'UNSUPPORTED_TYPE', params: {} },
  },
  {
    title: 'SVG',
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    source: { bytes: Array.from(SVG_BYTES) },
    issue: { code: 'UNSUPPORTED_TYPE', params: {} },
  },
  {
    title: 'wrong magic bytes (SVG named .png)',
    name: 'logo.png',
    mimeType: 'image/png',
    source: { bytes: Array.from(SVG_BYTES) },
    issue: { code: 'UNSUPPORTED_TYPE', params: {} },
  },
  {
    title: 'renamed file (JPEG named .png)',
    name: 'photo.png',
    mimeType: 'image/png',
    source: jpeg(),
    issue: { code: 'TYPE_MISMATCH', params: {} },
  },
  {
    title: 'oversized file',
    name: 'huge.png',
    mimeType: 'image/png',
    source: { bytes: Array.from(pngHeader(1200, 1500)), padTo: MAX_FILE_SIZE_BYTES + 1 },
    issue: { code: 'FILE_TOO_LARGE', params: { maxMegabytes: MAX_FILE_SIZE_MB } },
  },
  {
    title: 'too many pixels',
    name: 'panorama.png',
    mimeType: 'image/png',
    source: { bytes: Array.from(pngHeader(MAX_IMAGE_SIDE_PX + 1, 10)) },
    issue: {
      code: 'DIMENSIONS_TOO_LARGE',
      params: { maxSidePx: MAX_IMAGE_SIDE_PX, maxMegapixels: MAX_IMAGE_MEGAPIXELS },
    },
  },
  {
    title: 'corrupt file',
    name: 'broken.png',
    mimeType: 'image/png',
    source: { bytes: CORRUPT_PNG },
    issue: { code: 'CORRUPT_IMAGE', params: {} },
  },
];

for (const language of ['en', 'de'] as const satisfies Language[]) {
  test.describe(`in ${language}`, () => {
    test.use({ locale: language === 'de' ? 'de-DE' : 'en-US' });
    const { t } = createI18n(language);

    for (const { title, name, mimeType, source, issue } of errorCases) {
      test(`${title}: shows the ${issue.code} message`, async ({ page }) => {
        await upload(page, name, mimeType, source);
        await expect(page.getByRole('alert')).toHaveText(formatIssue(t, issue, name));
        await expect(preview(page)).toHaveCount(0);
      });
    }

    test('small image: accepts it and shows the TOO_SMALL warning', async ({ page }) => {
      await upload(page, 'tiny.png', 'image/png', {
        canvas: { type: 'image/png', width: 200, height: 100 },
      });
      const warning: UploadIssue = {
        code: 'TOO_SMALL',
        params: {
          width: 200,
          height: 100,
          minWidth: MIN_RECOMMENDED_SIZE_PX.width,
          minHeight: MIN_RECOMMENDED_SIZE_PX.height,
          dpi: EXPORT_DPI,
        },
      };
      await expect(page.getByRole('status')).toContainText(formatIssue(t, warning, 'tiny.png'));
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(preview(page)).toBeVisible();
    });

    test('shows the page language', async ({ page }) => {
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.getByText(t('upload:label'))).toBeVisible();
    });
  });
}
