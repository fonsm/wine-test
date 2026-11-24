import { createI18n } from '../src/i18n';
import { expect, test, type Page } from './fixtures';

const { t } = createI18n('en');

/** Limits for the first visit on a slow phone connection (see README, "First load"). */
const INTERACTIVE_LIMIT_MS = 5000;
const FIRST_LOAD_LIMIT_BYTES = 500_000;

interface Loaded {
  path: string;
  bytes: number;
}

function recordResponses(page: Page): Loaded[] {
  const loaded: Loaded[] = [];
  page.on('requestfinished', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return;
    void request.sizes().then((sizes) => {
      loaded.push({
        path: url.pathname,
        bytes: sizes.responseBodySize + sizes.responseHeadersSize,
      });
    });
  });
  return loaded;
}

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('first load on a slow phone connection: usable quickly, small, fonts and PDF code on demand', async ({
  page,
}, testInfo) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  // "Slow 4G" as in Lighthouse: 150 ms round trip, 1.6 Mbit/s down, 750 kbit/s up.
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  // A mid-range phone is roughly 4 times slower than a desktop CPU.
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const loaded = recordResponses(page);

  await page.goto('/');
  await expect(page.getByRole('button', { name: t('editor:addText') })).toBeEnabled();
  await expect(page.getByTestId('label-canvas').locator('canvas').first()).toBeVisible();
  const interactiveMs = await page.evaluate(() => performance.now());

  await expect(page.getByTestId('bottle-preview')).toHaveAttribute('data-mode', /3d|flat/, {
    timeout: 30_000,
  });
  await page.waitForLoadState('networkidle');
  const total = loaded.reduce((sum, file) => sum + file.bytes, 0);
  testInfo.annotations.push(
    { type: 'interactive', description: `${interactiveMs.toFixed(0)} ms` },
    {
      type: 'first load',
      description: `${(total / 1000).toFixed(0)} kB in ${String(loaded.length)} files`,
    },
  );

  expect(interactiveMs).toBeLessThan(INTERACTIVE_LIMIT_MS);
  expect(total).toBeLessThan(FIRST_LOAD_LIMIT_BYTES);
  const paths = loaded.map((file) => file.path);
  expect(
    paths.filter((path) => path.endsWith('.ttf')),
    'fonts on the first load',
  ).toEqual([]);
  expect(
    paths.filter((path) => path.includes('exportPdf')),
    'PDF code on the first load',
  ).toEqual([]);

  // Fonts load when a label uses them.
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page
    .getByRole('group', { name: t('templates:templates') })
    .getByRole('button', { name: t('templates:templateNames.classic') })
    .click();
  await expect
    .poll(() => loaded.filter((file) => file.path.endsWith('.ttf')).length, { timeout: 30_000 })
    .toBeGreaterThan(0);
});
