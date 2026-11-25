// Fails the build if the output is larger than the budgets in policy.mjs, and prints the sizes.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { BUNDLE_BUDGETS, bundleProblems, initialAssets } from './policy.mjs';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const initial = new Set(initialAssets(readFileSync(`${distDir}index.html`, 'utf8')));

const files = readdirSync(`${distDir}assets`).map((name) => {
  const file = `assets/${name}`;
  const content = readFileSync(`${distDir}${file}`);
  return {
    file,
    initial: initial.has(file),
    bytes: content.length,
    gzipBytes: gzipSync(content, { level: 9 }).length,
  };
});

const kB = (bytes) => `${(bytes / 1000).toFixed(1)} kB`.padStart(10);
for (const file of files.sort((a, b) => b.gzipBytes - a.gzipBytes)) {
  console.log(
    `${file.initial ? 'first load' : 'on demand '} ${kB(file.bytes)} ${kB(file.gzipBytes)} gz  ${file.file}`,
  );
}

const problems = bundleProblems(files, BUNDLE_BUDGETS);
if (problems.length > 0) {
  console.error('Bundle size check failed:');
  console.error(problems.map((problem) => `  ${problem}`).join('\n'));
  process.exit(1);
}
console.log('Bundle size check passed.');
