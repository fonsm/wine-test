import { expect, test, type Page, type TestInfo } from './fixtures';
import { createI18n } from '../src/i18n';
import { BOTTLE_IDS, TEMPLATES, template } from './catalogData';
import { sameBytes, screenshotBytes } from './helpers';

const { t } = createI18n('en');

const templates = (page: Page) => page.getByRole('group', { name: t('templates:templates') });
const bottles = (page: Page) => page.getByRole('group', { name: t('templates:bottles') });
const layerButtons = (page: Page) =>
  page.getByRole('list', { name: t('editor:layers') }).getByRole('button');
const preview = (page: Page) => page.getByTestId('bottle-preview');
const revision = async (page: Page) =>
  Number((await preview(page).getAttribute('data-revision')) ?? '0');

async function attach(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test.use({ viewport: { width: 1280, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(preview(page)).toHaveAttribute('data-mode', /3d|flat/, { timeout: 20_000 });
});

test('offers all templates and bottles, with the current ones marked', async ({ page }) => {
  await expect(templates(page).getByRole('button')).toHaveCount(TEMPLATES.length);
  await expect(bottles(page).getByRole('button')).toHaveCount(BOTTLE_IDS.length);
  await expect(
    templates(page).getByRole('button', { name: t('templates:templateNames.blank') }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    bottles(page).getByRole('button', { name: t('templates:bottleNames.bordeaux-750') }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('applying a template updates the editor and the preview, and undo brings the label back', async ({
  page,
}, testInfo) => {
  const canvas = page.getByTestId('label-canvas');
  const emptyLabel = await screenshotBytes(canvas);
  const before = await revision(page);

  await templates(page)
    .getByRole('button', { name: t('templates:templateNames.classic') })
    .click();

  await expect(layerButtons(page)).toHaveCount(template('classic').elementCount);
  await expect(
    templates(page).getByRole('button', { name: t('templates:templateNames.classic') }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => sameBytes(await screenshotBytes(canvas), emptyLabel)).toBe(false);
  await expect.poll(() => revision(page)).toBeGreaterThan(before);
  await attach(page, testInfo, 'template-classic');

  await page.getByRole('button', { name: t('editor:undo') }).click();
  await expect(layerButtons(page)).toHaveCount(0);
});

test('picking a bottle updates the preview and is kept when a template is applied', async ({
  page,
}, testInfo) => {
  const schlegel = bottles(page).getByRole('button', {
    name: t('templates:bottleNames.schlegel-750'),
  });
  await schlegel.click();
  await expect(schlegel).toHaveAttribute('aria-pressed', 'true');
  await expect(preview(page)).toHaveAttribute('data-bottle', 'schlegel-750');
  await expect(preview(page)).toHaveAttribute('data-mode', /3d|flat/, { timeout: 20_000 });

  await templates(page)
    .getByRole('button', { name: t('templates:templateNames.modern') })
    .click();
  await expect(layerButtons(page)).toHaveCount(template('modern').elementCount);
  await expect(preview(page)).toHaveAttribute('data-bottle', 'schlegel-750');
  await expect(schlegel).toHaveAttribute('aria-pressed', 'true');
  await attach(page, testInfo, 'bottle-schlegel-modern');
});

test('every bottle can be shown with every template', async ({ page }, testInfo) => {
  for (const bottleId of BOTTLE_IDS) {
    await bottles(page)
      .getByRole('button', { name: t(`templates:bottleNames.${bottleId}`) })
      .click();
    await expect(preview(page)).toHaveAttribute('data-bottle', bottleId);
    for (const { id, elementCount } of TEMPLATES) {
      const before = await revision(page);
      await templates(page)
        .getByRole('button', { name: t(`templates:templateNames.${id}`) })
        .click();
      await expect(layerButtons(page)).toHaveCount(elementCount);
      if (id !== 'blank' || before === 0) {
        await expect.poll(() => revision(page), { timeout: 20_000 }).toBeGreaterThan(before);
      }
    }
    const shot = testInfo.outputPath(`preview-${bottleId}.png`);
    await preview(page).screenshot({ path: shot });
    await testInfo.attach(`preview-${bottleId}`, { path: shot, contentType: 'image/png' });
  }
});
