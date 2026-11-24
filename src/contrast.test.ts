// Colour contrast of the design tokens (WCAG 2.2: 1.4.3 text, 1.4.11 non-text). axe checks the
// rendered text in the browser tests; this also covers field borders and the focus ring.
import { describe, expect, it } from 'vitest';
import editorCss from './editor/editor.css?raw';
import stylesCss from './styles.css?raw';

function tokens(css: string): Record<string, string> {
  const root = /:root\s*{([^}]*)}/.exec(css)?.[1] ?? '';
  return Object.fromEntries(
    [...root.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((match) => [
      match[1] ?? '',
      match[2] ?? '',
    ]),
  );
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const color = tokens(stylesCss);
const c = (name: string) => {
  const value = color[name];
  if (!value) throw new Error(`token --${name} missing`);
  return value;
};

describe('contrast', () => {
  it('computes WCAG contrast ratios', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 6);
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it.each([
    ['text', 'bg'],
    ['text', 'surface'],
    ['muted', 'bg'],
    ['muted', 'surface'],
    ['accent-text', 'accent'],
    ['accent', 'surface'],
    ['error', 'surface'],
  ])('text --color-%s on --color-%s is at least 4.5:1', (foreground, background) => {
    expect(contrast(c(`color-${foreground}`), c(`color-${background}`))).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it.each([
    ['focus', 'bg'],
    ['focus', 'surface'],
    ['control-border', 'surface'],
    ['control-border', 'bg'],
  ])('--color-%s against --color-%s is at least 3:1', (foreground, background) => {
    expect(contrast(c(`color-${foreground}`), c(`color-${background}`))).toBeGreaterThanOrEqual(3);
  });

  it('form fields use the control border, so they can be seen', () => {
    const fieldRule =
      /input:not\(\[type='checkbox'\]\)[^{]*{([^}]*)}/.exec(stylesCss)?.[1] ?? 'missing';
    expect(fieldRule).toContain('border: 1px solid var(--color-control-border)');
    const colorRule = /\.editor-field input\[type='color'\]\s*{([^}]*)}/.exec(editorCss)?.[1] ?? '';
    expect(colorRule).toContain('var(--color-control-border)');
  });

  it('shows a focus ring on everything that can be focused', () => {
    const focusRule = /(?:^|\n):focus-visible\s*{([^}]*)}/.exec(stylesCss)?.[1] ?? 'missing';
    expect(focusRule).toMatch(/outline:\s*3px solid var\(--color-focus\)/);
  });
});
