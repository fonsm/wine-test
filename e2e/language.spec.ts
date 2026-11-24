import { expect, test } from '@playwright/test';
import { createI18n } from '../src/i18n';
import { formatDesignFileError } from '../src/model/format';

const en = createI18n('en').t;
const de = createI18n('de').t;

test.use({ locale: 'en-US' });

test('switches between English and German without losing the design', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(en('app:title'));
  await expect(page.getByRole('button', { name: 'English (EN)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: en('editor:addText') }).click();
  await page.getByLabel(en('editor:fields.text'), { exact: true }).fill('Grauburgunder');

  await page.getByRole('button', { name: 'Deutsch (DE)' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(de('app:title'));
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('button', { name: 'Deutsch (DE)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: de('editor:addText') })).toBeVisible();
  await expect(page.getByText(de('upload:label'))).toBeVisible();

  // The design and its undo history are kept.
  await expect(
    page.getByRole('list', { name: de('editor:layers') }).getByRole('button'),
  ).toHaveText(['Grauburgunder']);
  await page.getByRole('button', { name: de('editor:undo') }).click();
  await expect(page.getByLabel(de('editor:fields.text'), { exact: true })).toHaveValue(
    en('editor:defaultText'),
  );

  await page.getByRole('button', { name: 'English (EN)' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(en('app:title'));
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('remembers the choice after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deutsch (DE)' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(de('app:title'));
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(
    JSON.stringify({ 'wine-label.language': 'de' }),
  );
});

test('works with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deutsch (DE)' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(de('app:title'));
});

test('messages already on screen switch language too', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>(
      'input[type="file"][accept=".json,application/json"]',
    );
    if (!input) throw new Error('design input not found');
    const transfer = new DataTransfer();
    transfer.items.add(new File(['[]'], 'other.json', { type: 'application/json' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const error = { code: 'NOT_A_DESIGN', params: {} } as const;
  await expect(page.getByTestId('design-file-status')).toHaveText(
    formatDesignFileError(en, error, 'other.json'),
  );

  await page.getByRole('button', { name: 'Deutsch (DE)' }).click();
  await expect(page.getByTestId('design-file-status')).toHaveText(
    formatDesignFileError(de, error, 'other.json'),
  );
});

test('switching the language makes no network request', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.getByRole('button', { name: 'Deutsch (DE)' }).click();
  await page.getByRole('button', { name: 'English (EN)' }).click();
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);
});
