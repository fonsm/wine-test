// Pure policy functions used by check-licenses.mjs and check-static-output.mjs.

/** Permissive SPDX licenses. Anything else, including unknown or missing, fails. */
export const ALLOWED_LICENSES = new Set([
  '0BSD',
  'Apache-2.0',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC-BY-4.0', // caniuse-lite (browser support data; attribution, not copyleft)
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'Python-2.0',
  'Unlicense',
  'Zlib',
]);

/**
 * Narrow, reviewed exceptions. Each one allows exactly one license for matching package names.
 * Add entries only with the project owner's approval and a reason.
 */
export const LICENSE_EXCEPTIONS = [
  {
    name: /^lightningcss(-[a-z0-9-]+)?$/,
    license: 'MPL-2.0',
    reason:
      'Required build-time dependency of Vite (the CSS minifier). Used unmodified, never shipped in dist/.',
  },
  {
    name: /^(axe-core|@axe-core\/playwright)$/,
    license: 'MPL-2.0',
    reason:
      'Accessibility checks in the Playwright tests (approved by the project owner). Dev-only, used unmodified, never shipped in dist/.',
  },
];

const SPDX_ID = /^[A-Za-z0-9.+-]+$/;

function isAllowedExpression(expression) {
  const clean = expression.replace(/[()]/g, ' ').trim();
  if (clean === '' || / WITH /.test(clean)) return false;
  // Sufficient for flat SPDX expressions (with optional outer parentheses).
  return clean.split(/\s+OR\s+/).some((alternative) =>
    alternative
      .split(/\s+AND\s+/)
      .map((id) => id.trim())
      .every((id) => SPDX_ID.test(id) && ALLOWED_LICENSES.has(id)),
  );
}

/**
 * @param {string} name package name
 * @param {unknown} license the "license" value from package-lock.json
 * @returns {{ ok: boolean, reason: string }}
 */
export function checkLicense(name, license) {
  if (typeof license !== 'string' || license.trim() === '') {
    return { ok: false, reason: 'unknown (no license declared)' };
  }
  const exception = LICENSE_EXCEPTIONS.find((e) => e.name.test(name) && e.license === license);
  if (exception) return { ok: true, reason: `exception: ${exception.reason}` };
  if (isAllowedExpression(license)) return { ok: true, reason: 'allowed' };
  return { ok: false, reason: `not allowed: ${license}` };
}

/** File types a static host may serve. Anything else in dist/ fails the build check. */
export const STATIC_EXTENSIONS = new Set([
  'html',
  'js',
  'mjs',
  'css',
  'map',
  'json',
  'webmanifest',
  'txt',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'ico',
  'woff',
  'woff2',
  'ttf',
  'otf',
]);

/**
 * The only file types a Shopify theme app extension accepts in its assets folder (the Shopify
 * CLI rejects all others, fonts included). Checked on the embedded build.
 */
export const SHOPIFY_ASSET_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'js',
  'css',
  'png',
  'svg',
  'json',
  'wasm',
]);

/**
 * @param {string[]} files paths relative to the build directory, using "/" separators
 * @param {{ entry?: string, extensions?: Set<string> }} [options] the file the build must
 *   contain (default index.html), and the allowed file types (default STATIC_EXTENSIONS)
 * @returns {string[]} files that are not static assets, plus "(missing) <entry>" if absent
 */
export function findNonStaticFiles(
  files,
  { entry = 'index.html', extensions = STATIC_EXTENSIONS } = {},
) {
  const problems = files.filter((file) => {
    const match = /\.([a-z0-9]+)$/i.exec(file);
    return !match?.[1] || !extensions.has(match[1].toLowerCase());
  });
  if (!files.includes(entry)) problems.push(`(missing) ${entry}`);
  return problems;
}

/**
 * Size limits for the build (bytes; kB = 1000 bytes). Regression guards, set a little above the
 * sizes at the time (see README). Gzip sizes, because static hosts compress JS and CSS.
 */
export const BUNDLE_BUDGETS = {
  /** Everything index.html loads before the editor works. */
  initialJsGzip: 240_000,
  initialCssGzip: 10_000,
  /** Each lazily loaded file (3D preview, PDF export). */
  lazyJsGzip: 200_000,
  /** Each image file (template thumbnails). */
  image: 30_000,
  /** Each font file, uncompressed (loaded only when a label uses the font). */
  font: 1_000_000,
};

/** The files index.html loads directly: module scripts, module preloads and stylesheets. */
export function initialAssets(indexHtml) {
  const found = [];
  for (const match of indexHtml.matchAll(/<(script|link)\b([^>]*)>/g)) {
    const attributes = match[2] ?? '';
    const url = /\b(?:src|href)="\/?(assets\/[^"]+)"/.exec(attributes)?.[1];
    if (!url) continue;
    if (match[1] === 'link' && !/\brel="(stylesheet|modulepreload)"/.test(attributes)) continue;
    found.push(url);
  }
  return found;
}

const kB = (bytes) => `${String(Math.round(bytes / 1000))} kB`;
const extension = (file) => /\.([a-z0-9]+)$/i.exec(file)?.[1]?.toLowerCase() ?? '';
const FONT = new Set(['ttf', 'otf', 'woff', 'woff2']);
const IMAGE = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif']);

/**
 * @param {{ file: string, initial: boolean, bytes: number, gzipBytes: number }[]} files
 * @param {typeof BUNDLE_BUDGETS} budgets
 * @returns {string[]} one message per file or group over its budget
 */
export function bundleProblems(files, budgets = BUNDLE_BUDGETS) {
  const problems = [];
  const sum = (list) => list.reduce((total, file) => total + file.gzipBytes, 0);
  const initial = files.filter((file) => file.initial);
  const initialJs = sum(initial.filter((file) => extension(file.file) === 'js'));
  const initialCss = sum(initial.filter((file) => extension(file.file) === 'css'));
  if (initialJs > budgets.initialJsGzip) {
    problems.push(
      `initial JavaScript is ${kB(initialJs)} gzipped (limit ${kB(budgets.initialJsGzip)})`,
    );
  }
  if (initialCss > budgets.initialCssGzip) {
    problems.push(`initial CSS is ${kB(initialCss)} gzipped (limit ${kB(budgets.initialCssGzip)})`);
  }
  for (const file of files) {
    const type = extension(file.file);
    if (file.initial && FONT.has(type)) {
      problems.push(`${file.file} is part of the first load; fonts must load on demand`);
    }
    if (!file.initial && type === 'js' && file.gzipBytes > budgets.lazyJsGzip) {
      problems.push(
        `${file.file} is ${kB(file.gzipBytes)} gzipped (limit ${kB(budgets.lazyJsGzip)})`,
      );
    }
    if (IMAGE.has(type) && file.bytes > budgets.image) {
      problems.push(`${file.file} is ${kB(file.bytes)} (limit ${kB(budgets.image)})`);
    }
    if (FONT.has(type) && file.bytes > budgets.font) {
      problems.push(`${file.file} is ${kB(file.bytes)} (limit ${kB(budgets.font)})`);
    }
  }
  return problems;
}
