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
 * @param {string[]} files paths relative to the build directory, using "/" separators
 * @returns {string[]} files that are not static assets, plus "(missing) index.html" if absent
 */
export function findNonStaticFiles(files) {
  const problems = files.filter((file) => {
    const match = /\.([a-z0-9]+)$/i.exec(file);
    return !match?.[1] || !STATIC_EXTENSIONS.has(match[1].toLowerCase());
  });
  if (!files.includes('index.html')) problems.push('(missing) index.html');
  return problems;
}
