// App-level texts (title, language switch), German and English.
// Loaded into i18next as the "app" namespace (see src/i18n/index.ts).

export interface AppMessages {
  title: string;
  language: string;
  /** Each language is named in that language, in both locales, so users find their own. */
  languageDe: string;
  languageEn: string;
}

const en: AppMessages = {
  title: 'Wine Label Designer',
  language: 'Language',
  languageDe: 'Deutsch (DE)',
  languageEn: 'English (EN)',
};

const de: AppMessages = {
  title: 'Weinetiketten-Designer',
  language: 'Sprache',
  languageDe: 'Deutsch (DE)',
  languageEn: 'English (EN)',
};

export const appMessages = { en, de } as const;
