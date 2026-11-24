// Finds translation keys that are used in the code but missing in German or English, and
// user-visible text that is written directly into components instead of going through i18next.
import { describe, expect, it } from 'vitest';
import { LANGUAGES, createI18n } from './index';

const sources = import.meta.glob<string>(
  ['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../**/testing/**'],
  { query: '?raw', import: 'default', eager: true },
);

const NAMESPACES = ['app', 'upload', 'design', 'editor', 'preview', 'export', 'templates'];
const nsPattern = NAMESPACES.join('|');

/** Every 'ns:key' string literal, and the fixed prefix of `ns:prefix.${...}` template literals. */
function usedKeys(source: string): { keys: string[]; prefixes: string[] } {
  const keys = [...source.matchAll(new RegExp(`['"\`]((?:${nsPattern}):[\\w.]+)['"\`]`, 'g'))].map(
    (match) => match[1] ?? '',
  );
  const prefixes = [
    ...source.matchAll(new RegExp(`\`((?:${nsPattern}):[\\w.]*?)\\.?\\$\\{`, 'g')),
  ].map((match) => match[1] ?? '');
  return { keys, prefixes };
}

function resource(language: string, key: string): unknown {
  const [ns = '', path = ''] = key.split(':');
  const i18n = createI18n(language as (typeof LANGUAGES)[number]);
  const bundle = i18n.getResourceBundle(language, ns) as Record<string, unknown> | undefined;
  // `ns:${...}`: the whole key is built at run time; the namespace must exist.
  if (path === '') return bundle;
  return path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        typeof node === 'object' && node !== null
          ? (node as Record<string, unknown>)[part]
          : undefined,
      bundle,
    );
}

/** A key exists if it is a text, or has plural forms (key_one, key_other). */
function exists(language: string, key: string): boolean {
  return (
    typeof resource(language, key) === 'string' ||
    (typeof resource(language, `${key}_one`) === 'string' &&
      typeof resource(language, `${key}_other`) === 'string')
  );
}

describe('translation keys', () => {
  it('finds the source files', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(30);
  });

  it('every key used in the code exists in German and English', () => {
    const missing: string[] = [];
    let count = 0;
    for (const [file, source] of Object.entries(sources)) {
      for (const key of usedKeys(source).keys) {
        count++;
        for (const language of LANGUAGES) {
          if (!exists(language, key)) missing.push(`${language} ${key} (${file})`);
        }
      }
    }
    expect(count).toBeGreaterThan(50);
    expect(missing).toEqual([]);
  });

  it('every key built from a prefix (`ns:prefix.${id}`) has that group in both languages', () => {
    const missing: string[] = [];
    for (const [file, source] of Object.entries(sources)) {
      for (const prefix of usedKeys(source).prefixes) {
        for (const language of LANGUAGES) {
          const group = resource(language, prefix);
          if (typeof group !== 'object' || group === null) {
            missing.push(`${language} ${prefix}.* (${file})`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('finds a missing key (self-test of the scanner)', () => {
    const { keys } = usedKeys(`t('editor:notThere'); t("app:title")`);
    expect(keys).toEqual(['editor:notThere', 'app:title']);
    expect(exists('en', 'editor:notThere')).toBe(false);
    expect(exists('de', 'app:title')).toBe(true);
    expect(exists('en', 'export:lowResolution')).toBe(true);
    expect(usedKeys('t(`upload:${group}.${code}`)').prefixes).toEqual(['upload:']);
    expect(usedKeys('t(`templates:templateNames.${id}`)').prefixes).toEqual([
      'templates:templateNames',
    ]);
  });
});

/** Text with letters written directly in JSX or in user-visible attributes. */
function hardCodedTexts(source: string): string[] {
  const found: string[] = [];
  // Text between tags: >Some words< (not after "=>", which is TypeScript, not JSX)
  for (const match of source.matchAll(/(?<!=)>\s*([^<>{}()=;`'"]*\p{L}[^<>{}()=;`'"]*?)\s*</gu)) {
    const text = match[1]?.trim() ?? '';
    if (text) found.push(text);
  }
  // Attributes people see or hear: aria-label="...", alt="Photo", title="...", placeholder="..."
  for (const match of source.matchAll(
    /\b(aria-label|aria-description|aria-roledescription|alt|title|placeholder)="([^"]*\p{L}[^"]*)"/gu,
  )) {
    found.push(`${match[1] ?? ''}="${match[2] ?? ''}"`);
  }
  return found;
}

describe('hard-coded text', () => {
  it('no component writes visible text directly (everything goes through i18next)', () => {
    const found = Object.entries(sources)
      .filter(([file]) => file.endsWith('.tsx'))
      .flatMap(([file, source]) => hardCodedTexts(source).map((text) => `${file}: ${text}`));
    expect(found).toEqual([]);
  });

  it('finds hard-coded text (self-test of the scanner)', () => {
    expect(hardCodedTexts('<p>Hello world</p><img alt="Photo" /><b>{t("x")}</b>')).toEqual([
      'Hello world',
      'alt="Photo"',
    ]);
    expect(hardCodedTexts('<div className="x">\n  {value}\n</div>')).toEqual([]);
    expect(hardCodedTexts('const wait = () => new Promise<void>((resolve) => {});')).toEqual([]);
  });
});
