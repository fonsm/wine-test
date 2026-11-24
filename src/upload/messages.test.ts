import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import { formatIssue } from './format';
import { uploadMessages } from './messages';
import { UPLOAD_ERROR_CODES, UPLOAD_WARNING_CODES, type UploadIssue } from './types';

const SAMPLE_PARAMS = {
  maxMegabytes: 10,
  maxSidePx: 8000,
  maxMegapixels: 40,
  width: 800,
  height: 600,
  minWidth: 1134,
  minHeight: 1489,
  dpi: 300,
};

const allIssues: UploadIssue[] = [
  ...UPLOAD_ERROR_CODES.map((code) => ({ code, params: SAMPLE_PARAMS })),
  ...UPLOAD_WARNING_CODES.map((code) => ({ code, params: SAMPLE_PARAMS })),
];

describe('upload messages', () => {
  it('has the same keys in German and English', () => {
    expect(Object.keys(uploadMessages.de.errors).sort()).toEqual(
      Object.keys(uploadMessages.en.errors).sort(),
    );
    expect(Object.keys(uploadMessages.de.warnings).sort()).toEqual(
      Object.keys(uploadMessages.en.warnings).sort(),
    );
  });

  it('covers every error and warning code', () => {
    expect(Object.keys(uploadMessages.en.errors).sort()).toEqual([...UPLOAD_ERROR_CODES].sort());
    expect(Object.keys(uploadMessages.en.warnings).sort()).toEqual(
      [...UPLOAD_WARNING_CODES].sort(),
    );
  });

  for (const language of ['de', 'en'] as const) {
    const { t } = createI18n(language);

    for (const issue of allIssues) {
      it(`${language}: ${issue.code} is a complete message naming the file`, () => {
        const text = formatIssue(t, issue, 'Etikett.png');
        expect(text).toContain('Etikett.png');
        expect(text).not.toMatch(/\{\{|\}\}|upload:/); // no missing values or raw keys
        expect(text.length).toBeGreaterThan(30);
      });
    }
  }

  it('German texts are actually translated', () => {
    const de = createI18n('de').t;
    const en = createI18n('en').t;
    for (const issue of allIssues) {
      expect(formatIssue(de, issue, 'x.png')).not.toBe(formatIssue(en, issue, 'x.png'));
    }
  });

  it('includes the limits in the messages', () => {
    const { t } = createI18n('en');
    expect(
      formatIssue(t, { code: 'FILE_TOO_LARGE', params: { maxMegabytes: 10 } }, 'a.png'),
    ).toContain('10 MB');
  });
});
