// Remembers the UI language chosen with the DE | EN switch (decided by the project owner).
// Only the language code is stored, in this browser's localStorage. No cookie, nothing is sent.
import { LANGUAGES, detectLanguage, type Language } from './index';

export const LANGUAGE_STORAGE_KEY = 'wine-label.language';

/** The part of the Web Storage API used here; null when storage is not available at all. */
type LanguageStorage = Pick<Storage, 'getItem' | 'setItem'> | null;

export function readStoredLanguage(storage: LanguageStorage): Language | null {
  try {
    const value = storage?.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGES.find((language) => language === value) ?? null;
  } catch {
    // Storage can throw in private windows or when site data is blocked.
    return null;
  }
}

export function storeLanguage(storage: LanguageStorage, language: Language): void {
  try {
    storage?.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Not remembered, but the switch still works for this visit.
  }
}

/** The stored choice if there is one, otherwise the browser language. */
export function initialLanguage(storage: LanguageStorage, preferred: readonly string[]): Language {
  return readStoredLanguage(storage) ?? detectLanguage(preferred);
}

/** localStorage, or null if even accessing it throws. */
export function browserStorage(): LanguageStorage {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
