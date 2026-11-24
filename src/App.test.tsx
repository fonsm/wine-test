import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the "Wine Label Designer" heading', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('<h1>Wine Label Designer</h1>');
  });

  it('renders the German heading and language switch in German', () => {
    const html = renderToStaticMarkup(<App language="de" />);
    expect(html).toContain('<h1>Weinetiketten-Designer</h1>');
    expect(html).toContain('aria-label="Sprache"');
  });

  it('shows the bottle preview next to the editor (loaded on demand)', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('data-testid="bottle-preview"');
    expect(html).toContain('Loading the 3D preview');
  });
});
