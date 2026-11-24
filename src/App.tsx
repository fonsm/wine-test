import { useMemo, useState } from 'react';
import { LanguageSwitch } from './app/LanguageSwitch';
import { Editor } from './editor/Editor';
import { useEditorState } from './editor/useEditorState';
import { createI18n, DEFAULT_LANGUAGE, type Language } from './i18n';
import { browserStorage, storeLanguage } from './i18n/storage';

interface AppProps {
  /** Initial language: the stored choice or the browser language (see main.tsx). */
  language?: Language;
}

export function App({ language: initial = DEFAULT_LANGUAGE }: AppProps) {
  const [language, setLanguage] = useState<Language>(initial);
  const { t } = useMemo(() => createI18n(language), [language]);
  // Lives here, not in the editor: kept across language switches and shared with other views.
  const [editorState, dispatch] = useEditorState();

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
      <Editor t={t} state={editorState} dispatch={dispatch} />
    </main>
  );
}
