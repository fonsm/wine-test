import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import { createI18n } from './index';
import { applyDocumentLanguage } from './document';

describe('applyDocumentLanguage', () => {
  it('sets the page language and the translated title (browser tab, screen readers)', () => {
    const doc = { documentElement: { lang: 'en' }, title: '' };
    applyDocumentLanguage(doc, 'de');
    expect(doc.documentElement.lang).toBe('de');
    expect(doc.title).toBe(createI18n('de').t('app:title'));
    applyDocumentLanguage(doc, 'en');
    expect(doc.title).toBe('Wine Label Designer');
  });

  it('index.html starts with the English title and language, before the script runs', () => {
    expect(indexHtml).toContain(`<title>${createI18n('en').t('app:title')}</title>`);
    expect(indexHtml).toContain('<html lang="en">');
  });
});
