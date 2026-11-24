// Shared helpers for the Playwright tests.
import type { Locator, Page } from '@playwright/test';

export const IMAGE_INPUT = 'input[type="file"][accept^="image/"]';
export const DESIGN_INPUT = 'input[type="file"][accept=".json,application/json"]';

/** A gradient image drawn on a canvas in the browser, optionally with an EXIF segment added. */
export interface CanvasSource {
  canvas: { type: string; width: number; height: number };
  /** A JPEG APP1 segment inserted right after the SOI marker. */
  exifApp1?: number[];
}
/** Raw bytes, zero-padded to `padTo` bytes. */
export interface BytesSource {
  bytes: number[];
  padTo?: number;
}
/** UTF-8 text, padded with spaces to `padTo` bytes. */
export interface TextSource {
  text: string;
  padTo?: number;
}
export type FileSource = CanvasSource | BytesSource | TextSource;

/**
 * Puts a file into a file input, like a file chosen by the user. The file is built inside the
 * browser (no Node Buffer needed). Returns the file's bytes for canvas sources, else [].
 */
export async function chooseFile(
  page: Page,
  inputSelector: string,
  name: string,
  mimeType: string,
  source: FileSource,
): Promise<number[]> {
  return page.evaluate(
    async ({ inputSelector, name, mimeType, source }) => {
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
        bytes = source.exifApp1
          ? new Uint8Array([...encoded.subarray(0, 2), ...source.exifApp1, ...encoded.subarray(2)])
          : encoded;
      } else if ('text' in source) {
        const encoded = new TextEncoder().encode(source.text);
        bytes = new Uint8Array(Math.max(source.padTo ?? 0, encoded.length)).fill(0x20);
        bytes.set(encoded);
      } else {
        bytes = new Uint8Array(Math.max(source.padTo ?? 0, source.bytes.length));
        bytes.set(source.bytes);
      }

      const input = document.querySelector<HTMLInputElement>(inputSelector);
      if (!input) throw new Error(`file input not found: ${inputSelector}`);
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], name, { type: mimeType }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return 'canvas' in source ? Array.from(bytes) : [];
    },
    { inputSelector, name, mimeType, source },
  );
}

/**
 * Starts recording network requests and returns the list it fills. blob: and data: URLs are
 * ignored: they are in-memory and never leave the browser.
 */
export function recordNetworkRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on('request', (request) => {
    const { protocol } = new URL(request.url());
    if (protocol !== 'blob:' && protocol !== 'data:') requests.push(request.url());
  });
  return requests;
}

/** Takes a screenshot of the element and returns its PNG bytes (saved to path if given). */
export async function screenshotBytes(target: Locator, path?: string): Promise<Uint8Array> {
  // Playwright declares the result as Node's Buffer (a Uint8Array). Without Node types in this
  // project that type is unresolved, so it is narrowed to Uint8Array here, in one place.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const image: Uint8Array = await target.screenshot({ path });
  return image;
}

/** Whether two screenshots are byte-for-byte the same. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Keeps every Blob the page turns into a download URL, so tests can read downloaded files.
 * Call before page.goto().
 */
export async function captureDownloads(page: Page) {
  await page.addInitScript(() => {
    const kept: Blob[] = [];
    (window as unknown as { keptBlobs: Blob[] }).keptBlobs = kept;
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object: Blob | MediaSource) => {
      if (object instanceof Blob) kept.push(object);
      return original(object);
    };
  });
}

export async function download(
  page: Page,
  button: string,
): Promise<{ name: string; bytes: Uint8Array }> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: button }).click();
  const name = (await downloadPromise).suggestedFilename();
  const bytes = await page.evaluate(async () => {
    const blobs = (window as unknown as { keptBlobs: Blob[] }).keptBlobs;
    const last = blobs.at(-1);
    if (!last) throw new Error('no download blob');
    return Array.from(new Uint8Array(await last.arrayBuffer()));
  });
  return { name, bytes: new Uint8Array(bytes) };
}
