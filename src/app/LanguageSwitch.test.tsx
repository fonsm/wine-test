import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import { I18nProvider } from '../i18n/I18nContext';
import { appMessages } from './messages';
import { LanguageSwitch } from './LanguageSwitch';

const noop = () => undefined;

describe('LanguageSwitch', () => {
  it('shows DE and EN as a labelled group with the current language pressed', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="de">
        <LanguageSwitch language="de" onChange={noop} />
      </I18nProvider>,
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Sprache"');
    expect(html).toMatch(/<button[^>]*lang="de"[^>]*aria-pressed="true"[^>]*>DE<\/button>/);
    expect(html).toMatch(/<button[^>]*lang="en"[^>]*aria-pressed="false"[^>]*>EN<\/button>/);
  });

  it('names each language in that language, so screen readers pronounce it correctly', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <LanguageSwitch language="en" onChange={noop} />
      </I18nProvider>,
    );
    expect(html).toContain('aria-label="Language"');
    expect(html).toContain('aria-label="Deutsch (DE)"');
    expect(html).toContain('aria-label="English (EN)"');
  });
});

describe('app messages', () => {
  it('has the same keys in German and English, and a German title', () => {
    expect(Object.keys(appMessages.de).sort()).toEqual(Object.keys(appMessages.en).sort());
    expect(createI18n('de').t('app:title')).not.toBe(createI18n('en').t('app:title'));
  });
});
