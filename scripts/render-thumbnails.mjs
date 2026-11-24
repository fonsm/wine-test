// Renders the template thumbnails (src/templates/thumbnails/*.png) and their checksums.
// Run after adding or changing a template: npm run thumbnails
// Uses the Vite dev server and Playwright's Chromium (or Google Chrome with PW_CHANNEL=chrome,
// for Macs where Playwright has no Chromium build).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const outDir = fileURLToPath(new URL('../src/templates/thumbnails/', import.meta.url));

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const address = server.httpServer?.address();
if (!address || typeof address === 'string') throw new Error('Vite server has no port');

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${String(address.port)}/src/templates/thumbnails/render.html`);
  const rendered = await page.evaluate(() => globalThis.thumbnails);
  const checksums = {};
  for (const { id, png, checksum } of rendered) {
    writeFileSync(`${outDir}${id}.png`, Buffer.from(png.split(',')[1], 'base64'));
    checksums[id] = checksum;
  }
  writeFileSync(`${outDir}checksums.json`, `${JSON.stringify(checksums, null, 2)}\n`);
  console.log(`Rendered ${String(rendered.length)} thumbnails into src/templates/thumbnails/.`);
} finally {
  await browser.close();
  await server.close();
}
