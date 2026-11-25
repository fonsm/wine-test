import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './fixtures';
import { createI18n, type Language } from '../src/i18n';
import { IMAGE_INPUT, chooseFile } from './helpers';

/** WCAG 2.2 level A and AA rules. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Reviewed exception (project owner, Prompt 8): the DE/EN buttons keep their names "Deutsch (DE)"
 * and "English (EN)". axe's label-content-name-mismatch (WCAG 2.5.3) wants the name to start
 * with the visible "DE"/"EN". The code is in the name, so voice users can still say it, but
 * not as its first word. Only this rule and only the switch are exempt; every other rule still
 * runs on the switch, and this rule still runs on the rest of the page.
 */
const LANGUAGE_SWITCH = '.language-switch';
const LABEL_IN_NAME_RULE = 'label-content-name-mismatch';

async function expectNoViolations(page: Page, state: string) {
  const rest = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude(LANGUAGE_SWITCH)
    .analyze();
  const languageSwitch = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .include(LANGUAGE_SWITCH)
    .disableRules([LABEL_IN_NAME_RULE])
    .analyze();
  const found = [...rest.violations, ...languageSwitch.violations].map(
    (violation) =>
      `${violation.id} (${violation.impact ?? '?'}): ${violation.nodes
        .map((node) => node.target.join(' '))
        .join(' | ')}`,
  );
  expect(found, `accessibility problems: ${state}`).toEqual([]);
}

const viewports = [
  { name: 'desktop', size: { width: 1280, height: 900 } },
  // A small phone (iPhone SE, 1st generation).
  { name: 'small phone', size: { width: 320, height: 568 } },
] as const;

for (const language of ['en', 'de'] as const satisfies readonly Language[]) {
  const { t } = createI18n(language);
  for (const viewport of viewports) {
    test.describe(`${language}, ${viewport.name}`, () => {
      test.use({ viewport: viewport.size, locale: language === 'de' ? 'de-DE' : 'en-US' });

      test('no accessibility problems in the main states of the app', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('html')).toHaveAttribute('lang', language);
        await expect(page.getByTestId('bottle-preview')).toHaveAttribute('data-mode', /3d|flat/, {
          timeout: 20_000,
        });
        await expectNoViolations(page, 'start');

        await page
          .getByRole('group', { name: t('templates:templates') })
          .getByRole('button', { name: t('templates:templateNames.classic') })
          .click();
        await page
          .getByRole('list', { name: t('editor:layers') })
          .getByRole('button')
          .first()
          .click();
        await expect(page.getByLabel(t('editor:fields.text'), { exact: true })).toBeVisible();
        await expectNoViolations(page, 'template applied, text selected');

        await chooseFile(page, IMAGE_INPUT, 'vineyard.jpg', 'image/jpeg', {
          canvas: { type: 'image/jpeg', width: 300, height: 200 },
        });
        await expect(page.getByTestId('upload-preview')).toBeVisible();
        const download = page.waitForEvent('download');
        await page.getByRole('button', { name: t('export:download') }).click();
        await download;
        await expect(page.getByTestId('export-status')).toBeVisible();
        await expectNoViolations(page, 'image uploaded (with warning), PDF downloaded');
      });
    });
  }
}
