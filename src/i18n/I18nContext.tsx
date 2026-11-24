import type { TFunction } from 'i18next';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createI18n, type Language } from './index';

const I18nContext = createContext<TFunction | null>(null);

/** Makes the translations of `language` available to all components below via useT(). */
export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const t = useMemo(() => createI18n(language).t, [language]);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

/** The translate function of the current language. */
export function useT(): TFunction {
  const t = useContext(I18nContext);
  if (!t) throw new Error('useT() must be used inside <I18nProvider>');
  return t;
}
