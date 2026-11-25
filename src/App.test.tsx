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

  describe('embedded in a shop page', () => {
    it("fits into the shop's page: no <main>, no page title, no language switch", () => {
      const html = renderToStaticMarkup(<App embedded language="de" />);
      expect(html).not.toContain('<main');
      expect(html).not.toContain('<h1');
      expect(html).not.toContain('aria-label="Sprache"');
      expect(html).toMatch(/<section[^>]*aria-label="Weinetiketten-Designer"/);
      expect(html).toContain('data-testid="bottle-preview"');
    });

    it("starts with the product's bottle", () => {
      const html = renderToStaticMarkup(<App embedded initialBottleId="schlegel-750" />);
      expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*Schlegel/);
    });
  });
});
