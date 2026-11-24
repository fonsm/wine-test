import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import { previewMessages } from './messages';

describe('preview messages', () => {
  it('has the same keys in German and English', () => {
    expect(Object.keys(previewMessages.de).sort()).toEqual(Object.keys(previewMessages.en).sort());
  });

  it('has translated, non-empty texts in both languages', () => {
    const de = createI18n('de').t;
    const en = createI18n('en').t;
    for (const key of Object.keys(previewMessages.en)) {
      expect(en(`preview:${key}`)).not.toContain('preview:');
      expect(de(`preview:${key}`)).not.toContain('preview:');
      expect(de(`preview:${key}`), key).not.toBe(en(`preview:${key}`));
    }
  });

  it('explains why the flat preview is shown', () => {
    const { t } = createI18n('en');
    expect(t('preview:fallbackNoWebgl')).toMatch(/WebGL/);
    expect(t('preview:fallbackSlow')).toMatch(/slow/);
  });
});
