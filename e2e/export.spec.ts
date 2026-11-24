import { expect, test, type Page } from '@playwright/test';
import { CALIBRATION_PDF_FILE_NAME, LABEL_PDF_FILE_NAME } from '../src/export/ExportPanel';
import { inspectPdf } from '../src/export/testing/inspectPdf';
import { createI18n } from '../src/i18n';
import { A4_PAPER, BLEED_MM } from '../src/print/geometry';
import { IMAGE_INPUT, chooseFile, recordNetworkRequests } from './helpers';

const { t } = createI18n('en');

/** Keeps every Blob the page turns into a download URL, so the test can read the PDF bytes. */
async function captureDownloads(page: Page) {
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

async function download(page: Page, button: string): Promise<{ name: string; bytes: Uint8Array }> {
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

test.beforeEach(async ({ page }) => {
  await captureDownloads(page);
  await page.goto('/');
});

test('shows the printing instructions next to the download', async ({ page }) => {
  const note = page.getByRole('note');
  await expect(note).toContainText(t('export:instructions'));
  await expect(
    page.getByRole('button', { name: t('export:download') }),
  ).toHaveAccessibleDescription(new RegExp(t('export:instructions').replace(/[.%]/g, '\\$&')));
});

test('label PDF for my printer: A4, label with text and photo at true size', async ({ page }) => {
  const requests = recordNetworkRequests(page);
  await page.getByRole('button', { name: t('editor:addText') }).click();
  await chooseFile(page, IMAGE_INPUT, 'vineyard.jpg', 'image/jpeg', {
    canvas: { type: 'image/jpeg', width: 1200, height: 800 },
  });
  await expect(
    page.getByRole('list', { name: t('editor:layers') }).getByRole('button'),
  ).toHaveCount(2);

  const { name, bytes } = await download(page, t('export:download'));
  expect(name).toBe(LABEL_PDF_FILE_NAME);
  await expect(page.getByTestId('export-status')).toHaveText(t('export:done'));
  const [pdfPage] = await inspectPdf(bytes);
  expect(pdfPage?.widthMm).toBeCloseTo(A4_PAPER.widthMm, 2);
  expect(pdfPage?.heightMm).toBeCloseTo(A4_PAPER.heightMm, 2);
  expect(pdfPage?.images).toHaveLength(2);
  // New text: 80 % of the 90 mm label width (see README).
  expect(pdfPage?.images[0]?.widthMm).toBeCloseTo(72, 2);
  const origin = new URL(page.url()).origin;
  expect(requests.filter((url) => new URL(url).origin !== origin)).toEqual([]);
});

test('label PDF for a print shop: the page is the label plus bleed, or just the label', async ({
  page,
}) => {
  await page.getByRole('radio', { name: t('export:layout.shop') }).check();
  let [pdfPage] = await inspectPdf((await download(page, t('export:download'))).bytes);
  expect(pdfPage?.widthMm).toBeCloseTo(90 + 2 * BLEED_MM, 2);
  expect(pdfPage?.heightMm).toBeCloseTo(120 + 2 * BLEED_MM, 2);

  await page.getByRole('checkbox', { name: t('export:bleed', { mm: BLEED_MM }) }).uncheck();
  [pdfPage] = await inspectPdf((await download(page, t('export:download'))).bytes);
  expect(pdfPage?.widthMm).toBeCloseTo(90, 2);
  expect(pdfPage?.heightMm).toBeCloseTo(120, 2);
});

test('calibration page in the chosen language', async ({ page }) => {
  await page.getByRole('button', { name: 'Deutsch (DE)' }).click();
  const de = createI18n('de').t;
  const { name, bytes } = await download(page, de('export:downloadCalibration'));
  expect(name).toBe(CALIBRATION_PDF_FILE_NAME);
  const [pdfPage] = await inspectPdf(bytes);
  expect(pdfPage?.widthMm).toBeCloseTo(A4_PAPER.widthMm, 2);
  expect(pdfPage?.texts.join(' ')).toContain(de('export:calibration.title'));
});
