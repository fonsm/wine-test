// Fails if the build output contains anything other than static files a plain web host can serve.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SHOPIFY_ASSET_EXTENSIONS, findNonStaticFiles } from './policy.mjs';

// The folder to check and its entry file: dist/ with index.html (standalone app), or the ones
// given, for example: dist-embed wine-label-designer.js --shopify
// --shopify: only the file types a Shopify theme app extension accepts.
const [folder = 'dist', entry = 'index.html'] = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith('--'));
const shopify = process.argv.includes('--shopify');
const distDir = fileURLToPath(new URL(`../${folder}/`, import.meta.url));

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
  console.error(`${folder}/ not found. Run "npm run build" first.`);
  process.exit(1);
}

const problems = findNonStaticFiles(files, {
  entry,
  ...(shopify ? { extensions: SHOPIFY_ASSET_EXTENSIONS } : {}),
});
if (problems.length > 0) {
  console.error(
    shopify
      ? 'Build output contains files a Shopify theme app extension does not accept:'
      : 'Build output contains non-static files:',
  );
  console.error(problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log(`Static output check passed: ${String(files.length)} files in ${folder}/.`);
