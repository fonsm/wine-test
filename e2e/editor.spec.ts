import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createI18n } from '../src/i18n';
import { BLEED_MM, LABEL_WIDTH_MM } from '../src/print/geometry';

const { t } = createI18n('en');

/** Puts a canvas-generated photo into the image upload input, like a file chosen by the user. */
async function uploadPhoto(page: Page, width: number, height: number): Promise<void> {
  await page.evaluate(
    async ({ width, height }) => {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#2f4f2f');
      gradient.addColorStop(1, '#c9b27c');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
      const input = document.querySelector<HTMLInputElement>(
        'input[type="file"][accept^="image/"]',
      );
      if (!input) throw new Error('image input not found');
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], 'vineyard.jpg', { type: 'image/jpeg' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { width, height },
  );
}

const field = (page: Page, key: string) =>
  page.getByLabel(t(`editor:fields.${key}`), { exact: true });
const readMm = async (page: Page, key: string) => Number(await field(page, key).inputValue());
const layers = (page: Page) => page.getByRole('list', { name: t('editor:layers') });

/** Screen position of a point given in label millimetres (origin = trim corner). */
async function screenPoint(page: Page, xMm: number, yMm: number) {
  const canvas = page.getByTestId('label-canvas').locator('canvas').first();
  // Editing fields can scroll the canvas out of view on a phone; touches need it on screen.
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  const pxPerMm = box.width / (LABEL_WIDTH_MM + 2 * BLEED_MM);
  return {
    x: box.x + (BLEED_MM + xMm) * pxPerMm,
    y: box.y + (BLEED_MM + yMm) * pxPerMm,
    pxPerMm,
  };
}

async function dragWithMouse(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 12 });
  await page.mouse.up();
}

/** A real touch drag through the Chrome DevTools protocol (Playwright has no touch-drag API). */
async function dragWithTouch(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  const cdp = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => [{ x: Math.round(x), y: Math.round(y), id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: point(from.x, from.y),
  });
  for (let step = 1; step <= 12; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: point(from.x + (dx * step) / 12, from.y + (dy * step) / 12),
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

const viewports = [
  { name: 'desktop', use: { viewport: { width: 1280, height: 900 } }, touch: false },
  {
    name: 'phone',
    use: {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 3,
    },
    touch: true,
  },
] as const;

for (const { name, use, touch } of viewports) {
  test.describe(`on a ${name}`, () => {
    test.use(use);

    test('build a label: add text, add an image, move it, undo', async ({ page }, testInfo) => {
      await page.goto('/');
      await expect(page.getByTestId('label-canvas').locator('canvas').first()).toBeVisible();

      // Add and edit text.
      await page.getByRole('button', { name: t('editor:addText') }).click();
      await expect(layers(page).getByRole('button')).toHaveCount(1);
      await field(page, 'text').fill('Riesling 2024');
      await field(page, 'font').selectOption('Great Vibes');
      await field(page, 'fontSize').fill('28');
      await field(page, 'color').fill('#7b1e3a');
      await field(page, 'align').selectOption('left');
      await expect(layers(page).getByRole('button', { name: /Riesling 2024/ })).toBeVisible();

      // Add an image through the upload module.
      await uploadPhoto(page, 800, 600);
      await expect(layers(page).getByRole('button')).toHaveCount(2);
      await expect(
        layers(page).getByRole('button', { name: t('editor:imageLayer') }),
      ).toHaveAttribute('aria-pressed', 'true');

      // Move the image on the canvas.
      const x0 = await readMm(page, 'x');
      const y0 = await readMm(page, 'y');
      const width = await readMm(page, 'width');
      const height = await readMm(page, 'height');
      const centre = await screenPoint(page, x0 + width / 2, y0 + height / 2);
      const dx = 15 * centre.pxPerMm;
      const dy = 10 * centre.pxPerMm;
      if (touch) await dragWithTouch(page, centre, dx, dy);
      else await dragWithMouse(page, centre, dx, dy);

      await expect.poll(() => readMm(page, 'x')).toBeGreaterThan(x0 + 14);
      expect(await readMm(page, 'x')).toBeLessThan(x0 + 16);
      expect(await readMm(page, 'y')).toBeGreaterThan(y0 + 9);
      await attachScreenshot(page, testInfo, `${name}-moved`);

      // Undo the move: the image is back, both elements are still there.
      await page.getByRole('button', { name: t('editor:undo') }).click();
      await expect(field(page, 'x')).toHaveValue(String(x0));
      await expect(field(page, 'y')).toHaveValue(String(y0));
      await expect(layers(page).getByRole('button')).toHaveCount(2);

      // Redo and undo again work too.
      await page.getByRole('button', { name: t('editor:redo') }).click();
      await expect.poll(() => readMm(page, 'x')).toBeGreaterThan(x0 + 14);
      await page.getByRole('button', { name: t('editor:undo') }).click();
      await expect(field(page, 'x')).toHaveValue(String(x0));

      await attachScreenshot(page, testInfo, `${name}-label`);
      // The page must not scroll sideways on any viewport.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test('works with the keyboard only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: t('editor:addText') }).focus();
  await page.keyboard.press('Enter');
  await expect(layers(page).getByRole('button')).toHaveCount(1);
  const x0 = await readMm(page, 'x');

  // Arrow keys move the selected element while the canvas has focus.
  await page.getByTestId('label-canvas').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(field(page, 'x')).toHaveValue(String(x0 + 11));

  // Ctrl+Z undoes, Ctrl+Shift+Z redoes.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(field(page, 'x')).toHaveValue(String(x0));
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(field(page, 'x')).toHaveValue(String(x0 + 11));

  // Typed values work as well.
  await field(page, 'rotation').fill('90');
  await field(page, 'rotation').press('Tab');
  await expect(field(page, 'rotation')).toHaveValue('90');

  // Delete removes the element; undo brings it back.
  await page.getByTestId('label-canvas').focus();
  await page.keyboard.press('Delete');
  await expect(layers(page).getByRole('button')).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(layers(page).getByRole('button')).toHaveCount(1);
});

test('layer order buttons move the selected element', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: t('editor:addText') }).click();
  await field(page, 'text').fill('First');
  await page.getByRole('button', { name: t('editor:addText') }).click();
  await field(page, 'text').fill('Second');

  // The list shows the front-most element first.
  await expect(layers(page).getByRole('button')).toHaveText([/Second/, /First/]);
  await page.getByRole('button', { name: t('editor:order.back') }).click();
  await expect(layers(page).getByRole('button')).toHaveText([/First/, /Second/]);
  await page.getByRole('button', { name: t('editor:undo') }).click();
  await expect(layers(page).getByRole('button')).toHaveText([/Second/, /First/]);
});
