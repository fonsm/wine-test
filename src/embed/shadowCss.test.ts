import { describe, expect, it } from 'vitest';
import appCss from '../styles.css?raw';
import { CONTAINER_NAME, ROOT_CLASS, toShadowCss } from './shadowCss';

const root = `.${ROOT_CLASS}`;

/** CSS generic font families: keywords, never the name of a downloaded font. */
const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
  'inherit',
]);

describe('toShadowCss', () => {
  it('starts with a reset, so nothing the shop theme sets is inherited', () => {
    expect(toShadowCss('')).toMatch(new RegExp(`^\\${root}\\s*\\{[^}]*all:\\s*initial`));
  });

  it('resets text direction too (not covered by all: initial), for right-to-left shop pages', () => {
    expect(toShadowCss('')).toMatch(/direction:\s*ltr/);
  });

  it("lays out by the app's own width, not the window's: the app may sit in a narrow column", () => {
    expect(toShadowCss('')).toMatch(
      new RegExp(`container:\\s*${CONTAINER_NAME}\\s*/\\s*inline-size`),
    );
    const css = toShadowCss(
      '@media (width>=900px){.a{b:c}}@media (min-width: 1200px) {.d{e:f}}' +
        '@media (min-width:600px) and (max-width:899px){.g{h:i}}' +
        '@media (prefers-reduced-motion:reduce){.j{k:l}}@media print{.m{n:o}}',
    );
    expect(css).toContain(`@container ${CONTAINER_NAME} (width>=900px){.a{b:c}}`);
    expect(css).toContain(`@container ${CONTAINER_NAME} (min-width: 1200px) {.d{e:f}}`);
    expect(css).toContain(`@container ${CONTAINER_NAME} (min-width:600px) and (max-width:899px){`);
    expect(css).toContain('@media (prefers-reduced-motion:reduce){.j{k:l}}');
    expect(css).toContain('@media print{.m{n:o}}');
  });

  it('moves page-level rules (:root, html, body) to the app root inside the shadow root', () => {
    const css = toShadowCss(':root{--a:1}html{x:1}body{margin:0}main{padding:0}');
    expect(css).toContain(`${root}{--a:1}`);
    expect(css).toContain(`${root}{x:1}`);
    expect(css).toContain(`${root}{margin:0}`);
    expect(css).toContain('main{padding:0}');
    expect(toShadowCss('/* base */\n:root {\n  --a: 1;\n}\nbody,\nmain { a: b }')).toContain(
      `${root},\nmain { a: b }`,
    );
  });

  it('leaves other selectors alone', () => {
    const css = ['tbody{a:b}', '.body{a:b}', '.x body-text{a:b}', 'a:root-ish{a:b}'].join('');
    expect(toShadowCss(css)).toContain(css);
  });

  it('turns rem into px, because the shop page sets its own root font size', () => {
    const css = toShadowCss(
      'h1{font-size:1.5rem}p{font-size:.875rem;margin:-0.5rem}a{width:calc(1rem + 2px)}',
    );
    expect(css).toContain('font-size:24px');
    expect(css).toContain('font-size:14px');
    expect(css).toContain('margin:-8px');
    expect(css).toContain('calc(16px + 2px)');
    expect(toShadowCss('.gap-2rem{a:b}')).toContain('.gap-2rem{a:b}');
  });

  it("names only generic fonts in the app's CSS: a theme may define any other name, elsewhere", () => {
    const sheets = import.meta.glob<string>(['../**/*.css', '!../fonts/fonts.css'], {
      eager: true,
      query: '?raw',
      import: 'default',
    });
    expect(Object.keys(sheets).length).toBeGreaterThan(3);
    for (const [file, css] of Object.entries(sheets)) {
      for (const [, value = ''] of css.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
        const families = value.split(',').map((family) => family.trim());
        expect(
          families.filter((family) => !GENERIC_FAMILIES.has(family)),
          file,
        ).toEqual([]);
      }
    }
  });

  it("converts the app's real stylesheet completely", () => {
    const css = toShadowCss(appCss);
    expect(css).not.toMatch(/\d+rem\b/);
    expect(css).not.toMatch(/(^|[\s,}])(:root|html|body)\s*[,{]/);
    expect(css).toContain('--color-accent');
    expect(css).not.toMatch(/@media[^{]*width/);
  });
});
