import { createI18n, type Language } from './index';

interface DocumentLike {
  documentElement: { lang: string };
  title: string;
}

/** Sets <html lang> (pronunciation, hyphenation) and the translated page title. */
export function applyDocumentLanguage(doc: DocumentLike, language: Language): void {
  doc.documentElement.lang = language;
  doc.title = createI18n(language).t('app:title');
}
