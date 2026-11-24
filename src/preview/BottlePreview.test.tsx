import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/I18nContext';
import { createI18n, type Language } from '../i18n';
import { createEmptyDesign } from '../model/schema';
import BottlePreview from './BottlePreview';
import { LazyBottlePreview } from './LazyBottlePreview';

function render(element: React.ReactElement, language: Language = 'en') {
  return renderToStaticMarkup(<I18nProvider language={language}>{element}</I18nProvider>);
}

describe('BottlePreview', () => {
  it('starts in the loading state with a heading', () => {
    const { t } = createI18n('de');
    const html = render(<BottlePreview design={createEmptyDesign()} />, 'de');
    expect(html).toContain(`>${t('preview:title')}</h2>`);
    expect(html).toContain('data-mode="loading"');
    expect(html).toContain(t('preview:loading'));
  });

  it('has a described flat fallback canvas, hidden until needed', () => {
    const { t } = createI18n('en');
    const html = render(<BottlePreview design={createEmptyDesign()} />);
    expect(html).toMatch(
      new RegExp(`<canvas[^>]*aria-label="${t('preview:flatLabel')}"[^>]*hidden`),
    );
  });
});

describe('LazyBottlePreview', () => {
  it('shows the loading text while the 3D code downloads', () => {
    const { t } = createI18n('en');
    const html = render(<LazyBottlePreview design={createEmptyDesign()} />);
    expect(html).toContain(t('preview:loading'));
    expect(html).toContain(`>${t('preview:title')}</h2>`);
  });
});
