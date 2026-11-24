import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import { DesignFileControls } from './DesignFileControls';
import { createEmptyDesign } from './schema';

const noop = () => undefined;

describe('DesignFileControls', () => {
  it('renders a save button and a JSON file input', () => {
    const html = renderToStaticMarkup(
      <DesignFileControls t={createI18n('en').t} design={createEmptyDesign()} onLoad={noop} />,
    );
    expect(html).toContain('Save design');
    expect(html).toContain('Open design');
    expect(html).toContain('accept=".json,application/json"');
  });

  it('uses the German texts in German', () => {
    const html = renderToStaticMarkup(
      <DesignFileControls t={createI18n('de').t} design={createEmptyDesign()} onLoad={noop} />,
    );
    expect(html).toContain('Entwurf speichern');
    expect(html).toContain('Entwurf öffnen');
  });
});
