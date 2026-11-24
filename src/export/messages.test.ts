import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import { exportMessages } from './messages';

function keys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? keys(child as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('export messages', () => {
  it('has the same keys in German and English', () => {
    expect(keys(exportMessages.de).sort()).toEqual(keys(exportMessages.en).sort());
  });

  it('has translated, non-empty texts', () => {
    const de = createI18n('de').t;
    const en = createI18n('en').t;
    for (const key of keys(exportMessages.en)) {
      expect(en(`export:${key}`)).not.toContain('export:');
      expect(de(`export:${key}`)).not.toContain('export:');
    }
    expect(de('export:download')).not.toBe(en('export:download'));
  });

  it('tells the user to print at 100 %, without scaling', () => {
    expect(createI18n('en').t('export:instructions')).toBe('Print at 100%, no scaling.');
    expect(createI18n('de').t('export:instructions')).toBe('Mit 100 % drucken, ohne Skalierung.');
  });

  it('uses only characters the PDF font can show on the calibration page', async () => {
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    for (const language of ['de', 'en'] as const) {
      for (const key of keys(exportMessages.en).filter((name) => name.startsWith('calibration.'))) {
        const text = createI18n(language).t(`export:${key}`, { square: 50, ruler: 150, cm: 15 });
        expect(() => font.encodeText(text), `${language} ${key}`).not.toThrow();
      }
    }
  });
});
