import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Keep every asset as a separate self-hosted file; nothing is fetched from elsewhere.
    assetsInlineLimit: 0,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    environment: 'node',
    // Load CSS files for real (Vitest skips them by default), so `?raw` imports give the
    // stylesheet text, for the contrast tests.
    css: { include: [/.+/] },
  },
});
