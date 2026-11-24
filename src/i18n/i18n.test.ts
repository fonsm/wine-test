import { describe, expect, it } from 'vitest';
import { createI18n, detectLanguage } from './index';

describe('detectLanguage', () => {
  it('picks German for any German browser locale', () => {
    expect(detectLanguage(['de-AT', 'en'])).toBe('de');
    expect(detectLanguage(['DE'])).toBe('de');
  });

  it('picks the first supported language in order of preference', () => {
    expect(detectLanguage(['fr-FR', 'en-GB', 'de'])).toBe('en');
  });

  it('falls back to English', () => {
    expect(detectLanguage(['fr'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });
});

describe('createI18n', () => {
  it('creates independent instances per language', () => {
    expect(createI18n('de').language).toBe('de');
    expect(createI18n('en').language).toBe('en');
  });

  it('does not HTML-escape interpolated values (React escapes text when rendering)', () => {
    const { t } = createI18n('en');
    expect(t('upload:errors.UNSUPPORTED_TYPE', { fileName: '<b>&' })).toContain('<b>&');
  });
});
