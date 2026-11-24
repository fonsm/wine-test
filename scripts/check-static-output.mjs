// Fails if the build output contains anything other than static files a plain web host can serve.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { findNonStaticFiles } from './policy.mjs';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

let files;
try {
  files = readdirSync(distDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      `${entry.parentPath}/${entry.name}`
        .slice(distDir.length)
        .replaceAll('\\', '/')
        .replace(/^\//, ''),
    );
} catch {
  console.error('dist/ not found. Run "npm run build" first.');
  process.exit(1);
}

const problems = findNonStaticFiles(files);
if (problems.length > 0) {
  console.error('Build output contains non-static files:');
  console.error(problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log(`Static output check passed: ${String(files.length)} files in dist/.`);
