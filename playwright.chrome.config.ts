import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// Same tests, but in the installed Google Chrome instead of Playwright's bundled Chromium.
// For Macs where Playwright has no Chromium build (macOS 13). CI uses playwright.config.ts.
export default defineConfig({
  ...base,
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
});
