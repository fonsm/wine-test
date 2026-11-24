import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import { formatDesignFileError } from './format';
import { designMessages } from './messages';
import { DESIGN_FILE_ERROR_CODES, type DesignFileError } from './serialize';

const SAMPLE: Record<DesignFileError['code'], DesignFileError> = {
  FILE_TOO_LARGE: { code: 'FILE_TOO_LARGE', params: { maxMegabytes: 50 } },
  INVALID_JSON: { code: 'INVALID_JSON', params: {} },
  NOT_A_DESIGN: { code: 'NOT_A_DESIGN', params: {} },
  UNSUPPORTED_VERSION: { code: 'UNSUPPORTED_VERSION', params: { version: 7, supportedVersion: 1 } },
  INVALID_DESIGN: { code: 'INVALID_DESIGN', params: {}, path: 'elements[2].height' },
};

describe('design file messages', () => {
  it('covers every error code in both languages', () => {
    expect(Object.keys(designMessages.en.errors).sort()).toEqual(
      [...DESIGN_FILE_ERROR_CODES].sort(),
    );
    expect(Object.keys(designMessages.de.errors).sort()).toEqual(
      [...DESIGN_FILE_ERROR_CODES].sort(),
    );
  });

  for (const language of ['de', 'en'] as const) {
    const { t } = createI18n(language);
    for (const code of DESIGN_FILE_ERROR_CODES) {
      it(`${language}: ${code} is a complete message naming the file`, () => {
        const text = formatDesignFileError(t, SAMPLE[code], 'Etikett.json');
        expect(text).toContain('Etikett.json');
        expect(text).not.toMatch(/\{\{|\}\}|design:/);
        expect(text.length).toBeGreaterThan(30);
      });
    }
  }

  it('German texts are actually translated', () => {
    const de = createI18n('de').t;
    const en = createI18n('en').t;
    for (const code of DESIGN_FILE_ERROR_CODES) {
      expect(formatDesignFileError(de, SAMPLE[code], 'x.json')).not.toBe(
        formatDesignFileError(en, SAMPLE[code], 'x.json'),
      );
    }
  });

  it('names the invalid field and the versions', () => {
    const { t } = createI18n('en');
    expect(formatDesignFileError(t, SAMPLE.INVALID_DESIGN, 'a.json')).toContain(
      'elements[2].height',
    );
    const version = formatDesignFileError(t, SAMPLE.UNSUPPORTED_VERSION, 'a.json');
    expect(version).toContain('7');
    expect(version).toContain('1');
  });
});
