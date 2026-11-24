import { useMemo, useState } from 'react';
import { LanguageSwitch } from './app/LanguageSwitch';
import { Editor } from './editor/Editor';
import { createI18n, DEFAULT_LANGUAGE, type Language } from './i18n';
import { browserStorage, storeLanguage } from './i18n/storage';

interface AppProps {
  /** Initial language: the stored choice or the browser language (see main.tsx). */
  language?: Language;
}

export function App({ language: initial = DEFAULT_LANGUAGE }: AppProps) {
  const [language, setLanguage] = useState<Language>(initial);
  const { t } = useMemo(() => createI18n(language), [language]);

  function changeLanguage(next: Language) {
    setLanguage(next);
    document.documentElement.lang = next;
    storeLanguage(browserStorage(), next);
  }

  return (
    <main>
      <header className="app-header">
        <h1>{t('app:title')}</h1>
        <LanguageSwitch t={t} language={language} onChange={changeLanguage} />
      </header>
      {/* The editor keeps its state (design, undo history) when the language changes. */}
      <Editor t={t} />
    </main>
  );
}
