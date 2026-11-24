import i18next, { type i18n } from 'i18next';
import { appMessages } from '../app/messages';
import { editorMessages } from '../editor/messages';
import { exportMessages } from '../export/messages';
import { designMessages } from '../model/messages';
import { previewMessages } from '../preview/messages';
import { templateMessages } from '../templates/messages';
import { uploadMessages } from '../upload/messages';

export const LANGUAGES = ['de', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'en';

/** Picks the first supported language from the browser's preference list (navigator.languages). */
export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    const match = LANGUAGES.find((language) => language === base);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

/** Creates a ready-to-use i18next instance. Resources are bundled, so init is synchronous. */
export function createI18n(language: Language): i18n {
  const instance = i18next.createInstance();
  void instance.init({
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES,
    ns: ['app', 'upload', 'design', 'editor', 'preview', 'export', 'templates'],
    resources: {
      en: {
        app: appMessages.en,
        upload: uploadMessages.en,
        design: designMessages.en,
        editor: editorMessages.en,
        preview: previewMessages.en,
        export: exportMessages.en,
        templates: templateMessages.en,
      },
      de: {
        app: appMessages.de,
        upload: uploadMessages.de,
        design: designMessages.de,
        editor: editorMessages.de,
        preview: previewMessages.de,
        export: exportMessages.de,
        templates: templateMessages.de,
      },
    },
    initAsync: false,
    // React escapes all text it renders, so escaping here would show "&lt;" to the user.
    // Never pass translated text to dangerouslySetInnerHTML (blocked by ESLint).
    interpolation: { escapeValue: false },
  });
  return instance;
}
