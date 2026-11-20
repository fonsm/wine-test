// Fails if any installed package (prod or dev, all platforms) has an unknown or copyleft license.
// Reads package-lock.json, so it works on a clean clone without node_modules.
import { readFileSync } from 'node:fs';
import { checkLicense } from './policy.mjs';

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
if (!lock.packages || lock.lockfileVersion < 2) {
  console.error('package-lock.json must be lockfileVersion 2 or newer.');
  process.exit(1);
}

const failures = [];
const exceptions = [];
let checked = 0;

for (const [path, entry] of Object.entries(lock.packages)) {
  if (path === '' || entry.link) continue;
  const name = entry.name ?? path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
  const license = typeof entry.license === 'object' ? entry.license?.type : entry.license;
  const result = checkLicense(name, license);
  checked++;
  if (!result.ok) failures.push(`  ${name}@${entry.version ?? '?'}: ${result.reason}`);
  else if (result.reason.startsWith('exception')) exceptions.push(`${name} (${String(license)})`);
}

if (exceptions.length > 0) {
  console.log(`Allowed by reviewed exception (see scripts/policy.mjs): ${exceptions.join(', ')}`);
}
if (failures.length > 0) {
  console.error(`License check failed for ${String(failures.length)} package(s):`);
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`License check passed: ${String(checked)} packages.`);
