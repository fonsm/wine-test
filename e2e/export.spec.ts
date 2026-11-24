import { expect, test } from './fixtures';
import { CALIBRATION_PDF_FILE_NAME, LABEL_PDF_FILE_NAME } from '../src/export/ExportPanel';
import { inspectPdf } from '../src/export/testing/inspectPdf';
import { createI18n } from '../src/i18n';
import { A4_PAPER, BLEED_MM } from '../src/print/geometry';
import {
  IMAGE_INPUT,
  captureDownloads,
  chooseFile,
  download,
  recordNetworkRequests,
} from './helpers';

const { t } = createI18n('en');

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
