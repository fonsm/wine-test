import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the "Wine Label Designer" heading', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('<h1>Wine Label Designer</h1>');
  });
});
