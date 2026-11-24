import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { createI18n } from '../src/i18n';
import { recordNetworkRequests, sameBytes, screenshotBytes } from './helpers';

const { t } = createI18n('en');

const preview = (page: Page) => page.getByTestId('bottle-preview');
/** Waits for the 3D view; the first start (Three.js download, shader compile) can be slow in CI. */
const expect3d = (page: Page) =>
  expect(preview(page)).toHaveAttribute('data-mode', '3d', { timeout: 20_000 });

/** A screenshot once two in a row are identical (the view has finished changing). */
async function settledScreenshot(target: Locator): Promise<Uint8Array> {
  let previous = await screenshotBytes(target);
  for (let attempt = 0; attempt < 20; attempt++) {
    const next = await screenshotBytes(target);
    if (sameBytes(next, previous)) return next;
    previous = next;
  }
  throw new Error('the preview did not settle');
}

const revision = async (page: Page) =>
  Number((await preview(page).getAttribute('data-revision')) ?? '0');

/** Collects console errors and uncaught exceptions. */
function recordErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function attach(target: Locator, testInfo: TestInfo, name: string): Promise<Uint8Array> {
  const path = testInfo.outputPath(`${name}.png`);
  const image = await screenshotBytes(target, path);
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return image;
}

/** An edit shows on the bottle within this time (on a phone, see the CPU throttling below). */
const UPDATE_TARGET_MS = 300;

/**
 * Clicks a button inside the page and measures, with the page's own clock, how long it takes
 * until the preview has drawn the change (data-revision is set after the frame is rendered).
 */
async function timeUntilPreviewUpdate(page: Page, buttonName: string): Promise<number> {
  return page.evaluate(async (name) => {
    const section = document.querySelector('[data-testid="bottle-preview"]');
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent === name,
    );
    if (!section || !button) throw new Error('preview or button missing');
    const before = section.getAttribute('data-revision');
    return new Promise<number>((resolve) => {
      const observer = new MutationObserver(() => {
        if (section.getAttribute('data-revision') === before) return;
        observer.disconnect();
        resolve(performance.now() - start);
      });
      observer.observe(section, { attributes: true, attributeFilter: ['data-revision'] });
      const start = performance.now();
      button.click();
    });
  }, buttonName);
}

const viewports = [
  { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  {
    name: 'phone',
    use: {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 3,
    },
  },
] as const;

for (const { name, use } of viewports) {
  test.describe(`3D preview on ${name}`, () => {
    test.use(use);

    test('shows the label on a 3D bottle and updates it live', async ({ page }, testInfo) => {
      const errors = recordErrors(page);
      await page.goto('/');
      await expect3d(page);
      const stage = preview(page).getByRole('img', { name: t('preview:canvasLabel') });
      await stage.scrollIntoViewIfNeeded();
      const before = await attach(stage, testInfo, `preview-${name}-empty`);

      // The first text also loads its font; then a second edit is timed.
      const start = await revision(page);
      await page.getByRole('button', { name: t('editor:addText') }).click();
      await expect.poll(() => revision(page)).toBeGreaterThan(start);

      // A mid-range phone is roughly 4 times slower than a desktop CPU.
      const cdp = name === 'phone' ? await page.context().newCDPSession(page) : null;
      await cdp?.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      // Median of three edits, so one hiccup of a busy test machine does not decide.
      const times: number[] = [];
      for (let edit = 0; edit < 3; edit++) {
        times.push(await timeUntilPreviewUpdate(page, t('editor:addText')));
      }
      await cdp?.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const median = times.sort((a, b) => a - b)[1] ?? Infinity;
      testInfo.annotations.push({
        type: 'update time',
        description: times.map((time) => `${time.toFixed(0)} ms`).join(', '),
      });
      expect(median).toBeLessThan(UPDATE_TARGET_MS);

      await stage.scrollIntoViewIfNeeded();
      const after = await attach(stage, testInfo, `preview-${name}-with-text`);
      expect(sameBytes(after, before)).toBe(false);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('3D preview controls', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('turns the bottle by dragging and with the buttons', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect3d(page);
    const stage = preview(page).getByRole('img', { name: t('preview:canvasLabel') });
    const frontView = page.getByRole('button', { name: t('preview:frontView') });
    await frontView.click();
    const front = await settledScreenshot(stage);
    await attach(stage, testInfo, 'preview-front');

    const box = await stage.boundingBox();
    if (!box) throw new Error('preview not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect.poll(async () => sameBytes(await screenshotBytes(stage), front)).toBe(false);
    await attach(stage, testInfo, 'preview-turned');

    await frontView.click();
    await expect.poll(async () => sameBytes(await screenshotBytes(stage), front)).toBe(true);
    await page.getByRole('button', { name: t('preview:turnLeft') }).click();
    await expect.poll(async () => sameBytes(await screenshotBytes(stage), front)).toBe(false);
  });

  test('loads Three.js separately, after the editor, from the same origin only', async ({
    page,
  }) => {
    const requests = recordNetworkRequests(page);
    await page.goto('/');
    await expect3d(page);
    const origin = new URL(page.url()).origin;
    expect(requests.filter((url) => new URL(url).origin !== origin)).toEqual([]);

    const entry = await page.locator('script[type="module"]').getAttribute('src');
    if (!entry) throw new Error('no entry script');
    const entryCode = await (await page.request.get(entry)).text();
    expect(entryCode).not.toContain('WebGLRenderer');
    expect(requests.some((url) => /\/BottlePreview-[\w-]+\.js$/.test(url))).toBe(true);
  });
});
