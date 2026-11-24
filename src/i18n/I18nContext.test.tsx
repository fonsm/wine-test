import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider, useT } from './I18nContext';

function Title() {
  const t = useT();
  return <h1>{t('app:title')}</h1>;
}

describe('I18nProvider / useT', () => {
  it('gives components the translations of the chosen language', () => {
    expect(
      renderToStaticMarkup(
        <I18nProvider language="de">
          <Title />
        </I18nProvider>,
      ),
    ).toBe('<h1>Weinetiketten-Designer</h1>');
    expect(
      renderToStaticMarkup(
        <I18nProvider language="en">
          <Title />
        </I18nProvider>,
      ),
    ).toBe('<h1>Wine Label Designer</h1>');
  });

  it('fails loudly when a component is used outside the provider', () => {
    expect(() => renderToStaticMarkup(<Title />)).toThrow(/I18nProvider/);
  });
});
