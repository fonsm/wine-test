// The app embedded in a shop page, as in Shopify (see README, "Shopify"): the page comes from
// the shop's domain, the app's files from a CDN. Both are simulated here; Playwright answers
// every request itself, so nothing reaches the internet.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './fixtures';
import { createI18n } from '../src/i18n';
import { IMAGE_INPUT, captureDownloads, chooseFile, download } from './helpers';
import { privacyProblems, type AllowedSource, type RecordedRequest } from './privacy';

const SHOP = 'https://wine-shop.example';
const PRODUCT_PATH = '/products/custom-label';
const CDN = 'https://cdn.shop.example';
const ASSETS = '/extensions/test-extension/assets/';

const de = createI18n('de').t;
const USER_TEXT = 'Weingut Geheim W4R';
const PHOTO_NAME = 'hof-foto-P2M.jpg';

const CONTENT_TYPES: Record<string, string> = {
  js: 'text/javascript',
  css: 'text/css',
  ttf: 'font/ttf',
  png: 'image/png',
};

/** Serves the fake shop page and the built embed files (dist-embed) as the CDN. */
async function openShop(page: Page): Promise<RecordedRequest[]> {
  const requests: RecordedRequest[] = [];
  page.on('request', (request) => {
    requests.push({
      url: request.url(),
      method: request.method(),
      postData: request.postData(),
      headers: request.headers(),
    });
  });
  await page.route(`${SHOP}/**`, (route) =>
    new URL(route.request().url()).pathname === PRODUCT_PATH
      ? route.fulfill({ path: 'e2e/shop/product.html', contentType: 'text/html' })
      : route.fulfill({ status: 404 }),
  );
  await page.route(`${CDN}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const name = pathname.slice(ASSETS.length);
    if (!pathname.startsWith(ASSETS) || !/^[\w.-]+$/.test(name)) {
      return route.fulfill({ status: 404 });
    }
    return route.fulfill({
      path: `dist-embed/${name}`,
      contentType: CONTENT_TYPES[name.split('.').pop() ?? ''] ?? 'application/octet-stream',
      // Like Shopify's CDN: module scripts and fonts from another origin need CORS.
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  // The theme's own fonts (see product.html). Answered here so a request is recorded, not sent.
  await page.route('https://theme-fonts.example/**', (route) =>
    route.fulfill({ status: 200, body: '', headers: { 'access-control-allow-origin': '*' } }),
  );
  await page.goto(`${SHOP}${PRODUCT_PATH}`);
  return requests;
}

const SOURCES: AllowedSource[] = [
  { origin: SHOP, paths: new RegExp(`^${PRODUCT_PATH}$`) },
  { origin: CDN, paths: new RegExp(`^${ASSETS}[\\w.-]+$`) },
];

const bottles = (page: Page) => page.getByRole('group', { name: de('templates:bottles') });

test("runs in the shop page in the shop's language, with the shop's bottles", async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  await openShop(page);

  await expect(page.getByRole('region', { name: de('app:title') })).toBeVisible();
  await expect(page.getByRole('heading', { name: de('templates:title') })).toBeVisible();
  await expect(bottles(page).getByRole('button')).toHaveText([
    'Riesling-Flasche (Shop)',
    'Spätburgunder-Flasche (Shop)',
  ]);
  await expect(bottles(page).getByRole('button', { pressed: true })).toHaveText(
    'Riesling-Flasche (Shop)',
  );
  const preview = page.getByTestId('bottle-preview');
  await expect(preview).toHaveAttribute('data-bottle', 'shop-schlegel');
  await expect(preview).toHaveAttribute('data-mode', /3d|flat/, { timeout: 20_000 });

  // The badly typed shop bottle is skipped and reported on the console, not shown.
  expect(warnings.join('\n')).toContain('typo');

  // The page stays the shop's: its title, language, single <main> and <h1>; nothing stored.
  expect(await page.title()).toBe('Eigenes Etikett – Testshop');
  expect(await page.locator('html').getAttribute('lang')).toBe('de');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eigenes Etikett');
  await expect(page.getByRole('button', { name: 'Deutsch (DE)' })).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test("the shop theme's CSS does not change the app", async ({ page }) => {
  const look = (target: ReturnType<Page['getByRole']>) =>
    target.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        color: style.color,
        background: style.backgroundColor,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
        lineHeight: style.lineHeight,
        borderRadius: style.borderRadius,
        boxSizing: style.boxSizing,
      };
    });
  const targets = (target: Page) => [
    target.getByRole('heading', { name: de('templates:title') }),
    target.getByRole('button', { name: de('editor:addText') }),
    target.getByRole('combobox', { name: de('editor:labelSize.title') }),
  ];

  // The same elements in the standalone app, in German.
  await page.goto('/');
  await page.getByRole('button', { name: 'Deutsch (DE)' }).click();
  const standalone = await Promise.all(targets(page).map(look));

  await openShop(page);
  await expect(page.getByRole('heading', { name: de('templates:title') })).toBeVisible();
  expect(await Promise.all(targets(page).map(look))).toEqual(standalone);
});

test('in a narrow column on a wide screen, and on a right-to-left page, the layout holds', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openShop(page);
  const host = page.locator('#wine-label-designer');
  const stage = page.getByTestId('label-canvas');
  const panel = page.getByRole('heading', { name: de('templates:title') });
  await expect(panel).toBeVisible();

  // Wide column: the panel is next to the label.
  const wide = { stage: await stage.boundingBox(), panel: await panel.boundingBox() };
  expect(wide.panel?.x).toBeGreaterThan((wide.stage?.x ?? 0) + (wide.stage?.width ?? 0) - 1);

  // A product column of 400 px with an RTL page around it (for example an Arabic theme).
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    const element = document.querySelector<HTMLElement>('#wine-label-designer');
    if (element) element.style.width = '400px';
  });
  await expect
    .poll(async () => (await panel.boundingBox())?.y ?? 0)
    .toBeGreaterThan(
      ((await stage.boundingBox())?.y ?? 0) + ((await stage.boundingBox())?.height ?? 0) - 1,
    );
  const box = await host.boundingBox();
  for (const target of [stage, panel, page.getByRole('button', { name: de('editor:addText') })]) {
    const inner = await target.boundingBox();
    expect(inner?.x ?? -1).toBeGreaterThanOrEqual((box?.x ?? 0) - 1);
    expect((inner?.x ?? 0) + (inner?.width ?? 0)).toBeLessThanOrEqual(
      (box?.x ?? 0) + (box?.width ?? 0) + 1,
    );
  }
  expect(
    await page
      .getByRole('button', { name: de('editor:addText') })
      .evaluate((element) => getComputedStyle(element).direction),
  ).toBe('ltr');
});

test('no accessibility problems in the embedded app (WCAG 2.2 A and AA, as a11y.spec.ts)', async ({
  page,
}) => {
  for (const size of [
    { width: 1280, height: 900 },
    { width: 320, height: 640 },
  ]) {
    await page.setViewportSize(size);
    await openShop(page);
    await expect(page.getByTestId('bottle-preview')).toHaveAttribute('data-mode', /3d|flat/, {
      timeout: 20_000,
    });
    // Only the app: the shop page around it is the theme's responsibility.
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .include('#wine-label-designer')
      .analyze();
    expect(
      violations.map(
        (violation) =>
          `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
      ),
      `${String(size.width)} px`,
    ).toEqual([]);
    // No horizontal scrolling on a small phone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    );
  }
});

test("full flow: only the shop page and the app's files on the CDN, nothing about the user", async ({
  page,
  context,
}) => {
  await captureDownloads(page);
  const requests = await openShop(page);
  await expect(page.getByTestId('bottle-preview')).toHaveAttribute('data-mode', /3d|flat/, {
    timeout: 20_000,
  });

  // Template (loads its fonts from the CDN), own text, other bottle, photo, PDF.
  await page
    .getByRole('group', { name: de('templates:templates') })
    .getByRole('button', { name: de('templates:templateNames.classic') })
    .click();
  const layers = page.getByRole('list', { name: de('editor:layers') });
  await layers.getByRole('button', { name: 'Spätburgunder' }).click();
  await page.getByLabel(de('editor:fields.text'), { exact: true }).fill(USER_TEXT);
  await bottles(page).getByRole('button', { name: 'Spätburgunder-Flasche (Shop)' }).click();
  await expect(page.getByTestId('bottle-preview')).toHaveAttribute('data-bottle', 'shop-burgund');
  await chooseFile(page, IMAGE_INPUT, PHOTO_NAME, 'image/jpeg', {
    canvas: { type: 'image/jpeg', width: 1200, height: 900 },
  });
  await expect(layers.getByRole('button', { name: de('editor:imageLayer') })).toBeVisible();
  const { bytes } = await download(page, de('export:download'));
  expect(new TextDecoder('latin1').decode(bytes.slice(0, 5))).toBe('%PDF-');
  await expect(page.getByTestId('export-status')).toHaveText(de('export:done'));

  // The label fonts came from the CDN and are in use, under the app's own names; the theme's
  // font with the same name (product.html) was never loaded.
  expect(requests.some(({ url }) => url.startsWith(CDN) && url.endsWith('.ttf'))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('16px "WLD Playfair Display"'))).toBe(true);

  expect(
    privacyProblems(requests, { sources: SOURCES, userData: [USER_TEXT, PHOTO_NAME] }),
  ).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  expect(
    await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)]),
  ).toEqual([[], []]);
});
