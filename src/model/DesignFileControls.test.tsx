import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/I18nContext';
import { DesignFileControls } from './DesignFileControls';
import { createEmptyDesign } from './schema';

const noop = () => undefined;

describe('DesignFileControls', () => {
  it('renders a save button and a JSON file input', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <DesignFileControls design={createEmptyDesign()} onLoad={noop} />
      </I18nProvider>,
    );
    expect(html).toContain('Save design');
    expect(html).toContain('Open design');
    expect(html).toContain('accept=".json,application/json"');
  });

  it('uses the German texts in German', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="de">
        <DesignFileControls design={createEmptyDesign()} onLoad={noop} />
      </I18nProvider>,
    );
    expect(html).toContain('Entwurf speichern');
    expect(html).toContain('Entwurf öffnen');
  });
});
