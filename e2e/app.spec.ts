import { expect, test } from '@playwright/test';

test('loads the app and shows the heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Wine Label Designer' })).toBeVisible();
});

test('makes no requests to other origins (AGENTS.md: no third-party requests)', async ({
  page,
  baseURL,
}) => {
  const appOrigin = new URL(baseURL ?? '').origin;
  const foreign: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'data:' && url.origin !== appOrigin) foreign.push(request.url());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(foreign).toEqual([]);
});
