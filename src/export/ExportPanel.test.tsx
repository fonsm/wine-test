import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createI18n, type Language } from '../i18n';
import { I18nProvider } from '../i18n/I18nContext';
import { createEmptyDesign } from '../model/schema';
import { ExportPanel } from './ExportPanel';

function render(language: Language = 'en') {
  return renderToStaticMarkup(
    <I18nProvider language={language}>
      <ExportPanel design={createEmptyDesign()} />
    </I18nProvider>,
  );
}

describe('ExportPanel', () => {
  it('shows the printing instructions before the download buttons', () => {
    const { t } = createI18n('en');
    const html = render();
    const instructions = html.indexOf(t('export:instructions'));
    expect(instructions).toBeGreaterThan(-1);
    expect(instructions).toBeLessThan(html.indexOf(t('export:download')));
    expect(instructions).toBeLessThan(html.indexOf(t('export:downloadCalibration')));
  });

  it('offers both layouts, own printer first and chosen', () => {
    const { t } = createI18n('en');
    const html = render();
    expect(html.indexOf(t('export:layout.printer'))).toBeLessThan(
      html.indexOf(t('export:layout.shop')),
    );
    // Attribute order does not matter: React writes `checked` before `value`.
    expect(html).toMatch(
      /<input(?=[^>]*type="radio")(?=[^>]*value="printer")(?=[^>]*checked)[^>]*>/,
    );
    expect(html).not.toMatch(/<input(?=[^>]*value="shop")(?=[^>]*checked)[^>]*>/);
  });

  it('adds bleed by default', () => {
    expect(render()).toMatch(/<input[^>]*type="checkbox"[^>]*checked/);
  });

  it('is translated', () => {
    const { t } = createI18n('de');
    const html = render('de');
    expect(html).toContain(t('export:instructions'));
    expect(html).toContain(t('export:download'));
  });
});
