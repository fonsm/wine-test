import { expect, test, type Page } from '@playwright/test';
import { createI18n, type Language } from '../src/i18n';

interface Stop {
  name: string;
  top: number;
  left: number;
  outline: string;
  outlineWidth: number;
}

/** Describes the focused element: what it is, where it is on the page, and its focus ring. */
async function focused(page: Page): Promise<Stop | null> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const label = element.getAttribute('aria-label') ?? element.textContent.trim().slice(0, 30);
    return {
      name: `${element.tagName.toLowerCase()} "${label}"`,
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      outline: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
    };
  });
}

/** Everything a keyboard user should reach (one stop per radio group). */
async function focusableCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const candidates = [
      ...document.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => {
      if ((element as HTMLButtonElement).disabled) return false;
      if (element.tabIndex < 0) return false;
      if (element.closest('[hidden]')) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const radioGroups = new Set<string>();
    return candidates.filter((element) => {
      if (element instanceof HTMLInputElement && element.type === 'radio') {
        if (radioGroups.has(element.name)) return false;
        radioGroups.add(element.name);
      }
      return true;
    }).length;
  });
}

for (const language of ['en', 'de'] as const satisfies readonly Language[]) {
  const { t } = createI18n(language);

  test.describe(`keyboard, small phone, ${language}`, () => {
    test.use({
      viewport: { width: 320, height: 568 },
      locale: language === 'de' ? 'de-DE' : 'en-US',
    });

    test('Tab reaches every control, top to bottom, each with a visible focus ring', async ({
      page,
    }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('app:title'));
      await expect(page.getByTestId('bottle-preview')).toHaveAttribute('data-mode', /3d|flat/, {
        timeout: 20_000,
      });
      const expected = await focusableCount(page);

      const stops: Stop[] = [];
      for (let press = 0; press < expected + 5; press++) {
        await page.keyboard.press('Tab');
        const stop = await focused(page);
        if (!stop) break;
        stops.push(stop);
      }

      expect(stops.length, stops.map((stop) => stop.name).join('\n')).toBe(expected);
      for (const stop of stops) {
        expect(stop.outline, `focus ring on ${stop.name}`).not.toBe('none');
        expect(stop.outlineWidth, `focus ring on ${stop.name}`).toBeGreaterThanOrEqual(2);
      }
      // One column on a phone: focus moves down the page (controls on one line go left to right).
      for (let index = 1; index < stops.length; index++) {
        const previous = stops[index - 1];
        const stop = stops[index];
        if (!previous || !stop) continue;
        const sameLine = Math.abs(stop.top - previous.top) < 8;
        const inOrder = sameLine ? stop.left > previous.left : stop.top > previous.top;
        expect(inOrder, `${previous.name} → ${stop.name}`).toBe(true);
      }
    });
  });
}
