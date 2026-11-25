import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createI18n, type Language } from '../i18n';
import { I18nProvider } from '../i18n/I18nContext';
import { createEmptyDesign } from '../model/schema';
import { BOTTLES, TEMPLATES, templateDesign } from './catalog';
import { GalleryPanel } from './GalleryPanel';
import { thumbnailUrl } from './thumbnails';

function render(language: Language = 'en', design = createEmptyDesign()) {
  return renderToStaticMarkup(
    <I18nProvider language={language}>
      <GalleryPanel
        design={design}
        onApplyTemplate={() => undefined}
        onPickBottle={() => undefined}
      />
    </I18nProvider>,
  );
}

describe('GalleryPanel', () => {
  it('offers every template and every bottle as a button with its name', () => {
    for (const language of ['en', 'de'] as const) {
      const { t } = createI18n(language);
      const html = render(language);
      for (const { id } of TEMPLATES) expect(html).toContain(t(`templates:templateNames.${id}`));
      for (const { id } of BOTTLES) expect(html).toContain(t(`templates:bottleNames.${id}`));
      expect(html.match(/<button/g)).toHaveLength(TEMPLATES.length + BOTTLES.length);
    }
  });

  it('marks the template and bottle the design uses', () => {
    const design = { ...templateDesign('modern'), bottleId: 'sparkling-750' };
    const html = render('en', design);
    const { t } = createI18n('en');
    const pressed = [...html.matchAll(/<button[^>]*aria-pressed="true"[^>]*>(.*?)<\/button>/g)].map(
      (match) => match[1] ?? '',
    );
    expect(pressed).toHaveLength(2);
    expect(pressed.some((inner) => inner.includes(t('templates:templateNames.modern')))).toBe(true);
    expect(pressed.some((inner) => inner.includes(t('templates:bottleNames.sparkling-750')))).toBe(
      true,
    );
  });

  it('shows the pre-rendered thumbnail of every template (no fonts needed)', () => {
    const html = render();
    for (const { id } of TEMPLATES) {
      const url = thumbnailUrl(id);
      expect(url).not.toBeNull();
      expect(html).toContain(`<img src="${url ?? ''}" alt=""`);
    }
  });

  it('says that a template replaces the label and can be undone', () => {
    const { t } = createI18n('en');
    expect(render()).toContain(t('templates:replaceHint'));
  });
});
