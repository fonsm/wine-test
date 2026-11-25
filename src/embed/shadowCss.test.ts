import { describe, expect, it } from 'vitest';
import appCss from '../styles.css?raw';
import { ROOT_CLASS, toShadowCss } from './shadowCss';

const root = `.${ROOT_CLASS}`;

describe('toShadowCss', () => {
  it('starts with a reset, so nothing the shop theme sets is inherited', () => {
    expect(toShadowCss('')).toMatch(new RegExp(`^\\${root}\\s*\\{[^}]*all:\\s*initial`));
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

  it("converts the app's real stylesheet completely", () => {
    const css = toShadowCss(appCss);
    expect(css).not.toMatch(/\d+rem\b/);
    expect(css).not.toMatch(/(^|[\s,}])(:root|html|body)\s*[,{]/);
    expect(css).toContain('--color-accent');
  });
});
