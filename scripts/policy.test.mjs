import { describe, expect, it } from 'vitest';
import { checkLicense, findNonStaticFiles } from './policy.mjs';

describe('checkLicense', () => {
  it.each(['MIT', 'ISC', 'Apache-2.0', 'BSD-3-Clause', '0BSD', 'BlueOak-1.0.0', 'CC-BY-4.0'])(
    'allows permissive license %s',
    (license) => {
      expect(checkLicense('some-pkg', license).ok).toBe(true);
    },
  );

  it.each(['GPL-3.0-only', 'GPL-2.0-or-later', 'AGPL-3.0', 'LGPL-2.1', 'MPL-2.0', 'EPL-2.0'])(
    'rejects copyleft license %s',
    (license) => {
      expect(checkLicense('some-pkg', license).ok).toBe(false);
    },
  );

  it.each([undefined, '', 'UNLICENSED', 'SEE LICENSE IN LICENSE.txt', 'Custom-1.0'])(
    'rejects unknown license %s',
    (license) => {
      expect(checkLicense('some-pkg', license).ok).toBe(false);
    },
  );

  it('allows an OR expression when one side is allowed', () => {
    expect(checkLicense('p', '(MIT OR GPL-3.0-only)').ok).toBe(true);
  });

  it('rejects an AND expression when one side is not allowed', () => {
    expect(checkLicense('p', '(MIT AND GPL-3.0-only)').ok).toBe(false);
  });

  it('allows an AND expression when both sides are allowed', () => {
    expect(checkLicense('p', 'MIT AND CC-BY-4.0').ok).toBe(true);
  });

  it('rejects WITH exceptions (they need a manual review)', () => {
    expect(checkLicense('p', 'GPL-2.0-only WITH Classpath-exception-2.0').ok).toBe(false);
  });

  it('allows the documented lightningcss exception, and only for MPL-2.0', () => {
    expect(checkLicense('lightningcss', 'MPL-2.0').ok).toBe(true);
    expect(checkLicense('lightningcss-linux-x64-gnu', 'MPL-2.0').ok).toBe(true);
    expect(checkLicense('lightningcss', 'GPL-3.0-only').ok).toBe(false);
    expect(checkLicense('not-lightningcss', 'MPL-2.0').ok).toBe(false);
  });

  it('allows the documented axe-core exception (accessibility tests), only for MPL-2.0', () => {
    expect(checkLicense('axe-core', 'MPL-2.0').ok).toBe(true);
    expect(checkLicense('@axe-core/playwright', 'MPL-2.0').ok).toBe(true);
    expect(checkLicense('axe-core', 'GPL-3.0-only').ok).toBe(false);
    expect(checkLicense('axe-core-extra', 'MPL-2.0').ok).toBe(false);
    expect(checkLicense('@axe-core/react', 'MPL-2.0').ok).toBe(false);
  });
});

describe('findNonStaticFiles', () => {
  it('accepts typical static build output', () => {
    expect(
      findNonStaticFiles([
        'index.html',
        'assets/index-abc123.js',
        'assets/index-abc123.css',
        'assets/font.woff2',
        'assets/photo.webp',
      ]),
    ).toEqual([]);
  });

  it('flags server-side or unexpected files', () => {
    expect(findNonStaticFiles(['index.html', 'server.php', 'api/handler.cjs', 'run.sh'])).toEqual([
      'server.php',
      'api/handler.cjs',
      'run.sh',
    ]);
  });

  it('flags a build without index.html', () => {
    expect(findNonStaticFiles(['assets/app.js'])).toEqual(['(missing) index.html']);
  });
});
