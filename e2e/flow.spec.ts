import { expect, test, type Page } from '@playwright/test';
import { CALIBRATION_PDF_FILE_NAME, LABEL_PDF_FILE_NAME } from '../src/export/ExportPanel';
import { createI18n, type Language } from '../src/i18n';
import { IMAGE_INPUT, chooseFile } from './helpers';

/** The page must not scroll sideways (WCAG 1.4.10 Reflow, 320 px). */
async function expectNoSidewaysScroll(page: Page, step: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `sideways scroll after: ${step}`).toBeLessThanOrEqual(0);
}

for (const language of ['en', 'de'] as const satisfies readonly Language[]) {
  const { t } = createI18n(language);

  test.describe(`full flow on a small phone, ${language}`, () => {
    test.use({
      viewport: { width: 320, height: 568 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
      locale: language === 'de' ? 'de-DE' : 'en-US',
    });

    test('template, text, bottle, photo, PDF and calibration page', async ({ page }, testInfo) => {
      await page.goto('/');
      // The browser language decides the first language.
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page).toHaveTitle(t('app:title'));
      await expect(page.getByTestId('bottle-preview')).toHaveAttribute('data-mode', /3d|flat/, {
        timeout: 20_000,
      });
      await expectNoSidewaysScroll(page, 'start');

      await page
        .getByRole('group', { name: t('templates:templates') })
        .getByRole('button', { name: t('templates:templateNames.elegant') })
        .click();
      const layers = page.getByRole('list', { name: t('editor:layers') });
      await layers.getByRole('button', { name: 'Grauburgunder' }).click();
      const text = page.getByLabel(t('editor:fields.text'), { exact: true });
      await text.fill('Weißburgunder');
      await expect(layers.getByRole('button', { name: 'Weißburgunder' })).toBeVisible();
      await expectNoSidewaysScroll(page, 'template and text');

      await page
        .getByRole('group', { name: t('templates:bottles') })
        .getByRole('button', { name: t('templates:bottleNames.burgundy-750') })
        .click();
      await expect(page.getByTestId('bottle-preview')).toHaveAttribute(
        'data-bottle',
        'burgundy-750',
      );

      await chooseFile(page, IMAGE_INPUT, 'vineyard.jpg', 'image/jpeg', {
        canvas: { type: 'image/jpeg', width: 1600, height: 1200 },
      });
      await expect(layers.getByRole('button', { name: t('editor:imageLayer') })).toBeVisible();
      await expectNoSidewaysScroll(page, 'photo');

      await expect(page.getByRole('note')).toContainText(t('export:instructions'));
      let download = page.waitForEvent('download');
      await page.getByRole('button', { name: t('export:download') }).click();
      expect((await download).suggestedFilename()).toBe(LABEL_PDF_FILE_NAME);
      await expect(page.getByTestId('export-status')).toHaveText(t('export:done'));

      download = page.waitForEvent('download');
      await page.getByRole('button', { name: t('export:downloadCalibration') }).click();
      expect((await download).suggestedFilename()).toBe(CALIBRATION_PDF_FILE_NAME);
      await expectNoSidewaysScroll(page, 'downloads');

      const path = testInfo.outputPath(`flow-${language}.png`);
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach(`flow-${language}`, { path, contentType: 'image/png' });
    });
  });
}
