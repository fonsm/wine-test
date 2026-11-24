import { expect, test, type Page } from './fixtures';
import { createI18n, type Language } from '../src/i18n';
import { DESIGN_FILE_NAME } from '../src/model/download';
import { formatDesignFileError } from '../src/model/format';
import { CURRENT_SCHEMA_VERSION, type Design } from '../src/model/schema';
import {
  MAX_DESIGN_FILE_BYTES,
  MAX_DESIGN_FILE_MB,
  serializeDesign,
  type DesignFileError,
} from '../src/model/serialize';
import { sampleDesign } from '../src/model/testing/fixtures';
import { DESIGN_INPUT, chooseFile, recordNetworkRequests } from './helpers';

/** Puts a text file into the "Open design" input, like a user-chosen file. */
async function openDesign(page: Page, name: string, text: string, padTo = 0): Promise<void> {
  await chooseFile(page, DESIGN_INPUT, name, 'application/json', { text, padTo });
}

/** Opens a downloaded file. Playwright stores downloads under a random name; returns that name. */
async function openDownloaded(page: Page, path: string): Promise<string> {
  await page.locator(DESIGN_INPUT).setInputFiles(path);
  return path.split(/[\\/]/).pop() ?? path;
}

const designStatus = (page: Page) => page.getByTestId('design-file-status');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('round trip: a saved design file opens again', async ({ page }) => {
  const { t } = createI18n('en');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: t('design:save') }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe(DESIGN_FILE_NAME);
  const openedName = await openDownloaded(page, await download.path());

  await expect(designStatus(page)).toHaveAttribute('role', 'status');
  await expect(designStatus(page)).toHaveText(
    t('design:loaded', { fileName: openedName, count: 0 }),
  );
});

test('opens a design with images and HTML-like text without inserting HTML', async ({ page }) => {
  const name = '<img src=x onerror="window.__xss=1">.json';
  await openDesign(page, name, serializeDesign(sampleDesign()));
  await expect(designStatus(page)).toContainText(name);
  await expect(page.locator('[data-testid="design-file-status"] img')).toHaveCount(0);
  await expect(page.locator('script:not([src])')).toHaveCount(0);
  expect(await page.evaluate(() => '__xss' in window)).toBe(false);
});

test('no network request is made while saving or opening a design', async ({ page }) => {
  const requests = recordNetworkRequests(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: createI18n('en').t('design:save') }).click();
  await downloadPromise;
  await openDesign(page, 'd.json', serializeDesign(sampleDesign()));
  await expect(designStatus(page)).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(requests).toEqual([]);
});

const validJson = serializeDesign(sampleDesign());
const missingElements: Partial<Design> = sampleDesign();
delete missingElements.elements;

const errorCases: { title: string; text: string; padTo?: number; error: DesignFileError }[] = [
  {
    title: 'invalid file (not JSON)',
    text: '{ this is not json',
    error: { code: 'INVALID_JSON', params: {} },
  },
  {
    title: 'invalid file (other JSON)',
    text: '{"hello":"world"}',
    error: { code: 'NOT_A_DESIGN', params: {} },
  },
  {
    title: 'wrong version',
    text: validJson.replace(
      `"schemaVersion": ${String(CURRENT_SCHEMA_VERSION)}`,
      '"schemaVersion": 99',
    ),
    error: {
      code: 'UNSUPPORTED_VERSION',
      params: { version: 99, supportedVersion: CURRENT_SCHEMA_VERSION },
    },
  },
  {
    title: 'missing fields',
    text: JSON.stringify(missingElements),
    error: { code: 'INVALID_DESIGN', params: {}, path: 'elements' },
  },
  {
    title: 'oversized file',
    text: validJson,
    padTo: MAX_DESIGN_FILE_BYTES + 1,
    error: { code: 'FILE_TOO_LARGE', params: { maxMegabytes: MAX_DESIGN_FILE_MB } },
  },
];

for (const language of ['en', 'de'] as const satisfies Language[]) {
  test.describe(`in ${language}`, () => {
    test.use({ locale: language === 'de' ? 'de-DE' : 'en-US' });
    const { t } = createI18n(language);

    for (const { title, text, padTo, error } of errorCases) {
      test(`${title}: shows the ${error.code} message`, async ({ page }) => {
        await openDesign(page, 'broken.json', text, padTo);
        await expect(designStatus(page)).toHaveAttribute('role', 'alert');
        await expect(designStatus(page)).toHaveText(formatDesignFileError(t, error, 'broken.json'));
      });
    }

    test('a failed open keeps the current design', async ({ page }) => {
      await openDesign(page, 'good.json', validJson);
      const loaded = t('design:loaded', {
        fileName: 'good.json',
        count: sampleDesign().elements.length,
      });
      await expect(designStatus(page)).toHaveText(loaded);
      await openDesign(page, 'bad.json', '[]');
      await expect(designStatus(page)).toHaveAttribute('role', 'alert');

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: t('design:save') }).click();
      const download = await downloadPromise;
      const openedName = await openDownloaded(page, await download.path());
      await expect(designStatus(page)).toHaveText(
        t('design:loaded', {
          fileName: openedName,
          count: sampleDesign().elements.length,
        }),
      );
    });
  });
}
