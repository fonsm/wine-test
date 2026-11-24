import { expect, test } from '@playwright/test';
import { createI18n } from '../src/i18n';
import { sameBytes, screenshotBytes } from './helpers';

const { t } = createI18n('en');

// A browser with WebGL switched off.
test.use({ launchOptions: { args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] } });

test('shows the flat preview with an explanation when WebGL is disabled', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const preview = page.getByTestId('bottle-preview');
  await expect(preview).toHaveAttribute('data-mode', 'flat');
  await expect(preview).toHaveAttribute('data-fallback', 'webgl');
  await expect(preview.getByRole('status')).toHaveText(t('preview:fallbackNoWebgl'));
  const flat = preview.getByRole('img', { name: t('preview:flatLabel') });
  await expect(flat).toBeVisible();
  await expect(preview.getByRole('img', { name: t('preview:canvasLabel') })).toBeHidden();
  await expect.poll(async () => Number(await preview.getAttribute('data-revision'))).toBe(1);
  const before = await screenshotBytes(flat);

  // Edits still show up in the flat preview.
  await page.getByRole('button', { name: t('editor:addText') }).click();
  await expect.poll(async () => Number(await preview.getAttribute('data-revision'))).toBe(2);
  const path = testInfo.outputPath('preview-flat.png');
  const after = await screenshotBytes(flat, path);
  await testInfo.attach('preview-flat', { path, contentType: 'image/png' });
  expect(sameBytes(after, before)).toBe(false);
});

test('says so in German too', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deutsch (DE)' }).click();
  await expect(page.getByTestId('bottle-preview').getByRole('status')).toHaveText(
    createI18n('de').t('preview:fallbackNoWebgl'),
  );
});
