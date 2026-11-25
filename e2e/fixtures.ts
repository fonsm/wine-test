// The Playwright `test` used by all specs. It fails any test whose page logs a console error or
// throws an uncaught exception, so errors anywhere in the app are noticed.
import { test as base, expect } from '@playwright/test';

export const test = base.extend<{
  /** Console errors a test causes on purpose (rarely needed; give the reason where it is set). */
  expectedConsoleErrors: RegExp[];
  noConsoleErrors: undefined;
}>({
  expectedConsoleErrors: [[], { option: true }],
  noConsoleErrors: [
    async ({ page, expectedConsoleErrors }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
      });
      page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));
      await use(undefined);
      const unexpected = errors.filter(
        (error) => !expectedConsoleErrors.some((pattern) => pattern.test(error)),
      );
      expect(unexpected, 'errors in the browser console').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export type { Locator, Page, TestInfo } from '@playwright/test';
