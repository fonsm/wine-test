import { describe, expect, it } from 'vitest';
import {
  BUNDLE_BUDGETS,
  bundleProblems,
  checkLicense,
  findNonStaticFiles,
  initialAssets,
} from './policy.mjs';

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

describe('initialAssets', () => {
  it('lists the files index.html loads directly (scripts, styles, module preloads)', () => {
    const html = `<!doctype html><html><head>
      <link rel="icon" href="data:," />
      <script type="module" crossorigin src="/assets/index-abc.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/shared-def.js">
      <link rel="stylesheet" crossorigin href="/assets/index-xyz.css">
    </head><body></body></html>`;
    expect(initialAssets(html)).toEqual([
      'assets/index-abc.js',
      'assets/shared-def.js',
      'assets/index-xyz.css',
    ]);
  });
});

describe('bundleProblems', () => {
  const ok = [
    { file: 'assets/index-a.js', initial: true, bytes: 700_000, gzipBytes: 200_000 },
    { file: 'assets/index-a.css', initial: true, bytes: 8_000, gzipBytes: 2_000 },
    { file: 'assets/BottlePreview-b.js', initial: false, bytes: 600_000, gzipBytes: 150_000 },
    { file: 'assets/classic-c.png', initial: false, bytes: 6_000, gzipBytes: 6_000 },
    { file: 'assets/Inter-d.ttf', initial: false, bytes: 900_000, gzipBytes: 500_000 },
  ];

  it('accepts a build within the budgets', () => {
    expect(bundleProblems(ok)).toEqual([]);
  });

  it('reports what is over budget, with sizes', () => {
    const problems = bundleProblems([
      { file: 'assets/index-a.js', initial: true, bytes: 900_000, gzipBytes: 250_000 },
      { file: 'assets/index-b.js', initial: true, bytes: 10_000, gzipBytes: 5_000 },
      { file: 'assets/lazy-c.js', initial: false, bytes: 900_000, gzipBytes: 250_000 },
      { file: 'assets/photo-d.png', initial: false, bytes: 80_000, gzipBytes: 80_000 },
      { file: 'assets/Big-e.ttf', initial: false, bytes: 2_000_000, gzipBytes: 900_000 },
    ]);
    expect(problems).toHaveLength(4);
    expect(problems[0]).toMatch(/initial JavaScript .*255 kB.*limit 240 kB/);
    expect(problems.join('\n')).toContain('assets/lazy-c.js');
    expect(problems.join('\n')).toContain('assets/photo-d.png');
    expect(problems.join('\n')).toContain('assets/Big-e.ttf');
  });

  it('keeps fonts and the 3D and PDF code out of the first load', () => {
    const problems = bundleProblems([
      ...ok,
      { file: 'assets/Inter-x.ttf', initial: true, bytes: 900_000, gzipBytes: 500_000 },
    ]);
    expect(problems.join('\n')).toMatch(/assets\/Inter-x\.ttf.*first load/);
  });

  it('has budgets for every kind of file', () => {
    expect(BUNDLE_BUDGETS).toEqual({
      initialJsGzip: 240_000,
      initialCssGzip: 10_000,
      lazyJsGzip: 200_000,
      image: 30_000,
      font: 1_000_000,
    });
  });
});
