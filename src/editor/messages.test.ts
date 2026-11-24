import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import { editorMessages } from './messages';

function keys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? keys(child as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('editor messages', () => {
  it('has the same keys in German and English', () => {
    expect(keys(editorMessages.de).sort()).toEqual(keys(editorMessages.en).sort());
  });

  it('has no empty texts', () => {
    for (const language of ['de', 'en'] as const) {
      const { t } = createI18n(language);
      for (const key of keys(editorMessages.en)) {
        const text = t(`editor:${key}`);
        expect(text, `${language} ${key}`).not.toBe('');
        expect(text, `${language} ${key}`).not.toContain('editor:');
      }
    }
  });

  it('German UI texts are translated', () => {
    const de = createI18n('de').t;
    const en = createI18n('en').t;
    for (const key of [
      'addText',
      'undo',
      'redo',
      'delete',
      'layers',
      'properties',
      'fields.font',
    ]) {
      expect(de(`editor:${key}`)).not.toBe(en(`editor:${key}`));
    }
  });
});
