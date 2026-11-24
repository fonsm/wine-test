import { useState } from 'react';
import { LanguageSwitch } from './app/LanguageSwitch';
import { Editor } from './editor/Editor';
import { useEditorState } from './editor/useEditorState';
import { DEFAULT_LANGUAGE, type Language } from './i18n';
import { I18nProvider, useT } from './i18n/I18nContext';
import { browserStorage, storeLanguage } from './i18n/storage';
import { LazyBottlePreview } from './preview/LazyBottlePreview';

interface AppProps {
  /** Initial language: the stored choice or the browser language (see main.tsx). */
  language?: Language;
}

export function App({ language: initial = DEFAULT_LANGUAGE }: AppProps) {
  const [language, setLanguage] = useState<Language>(initial);
  // Lives here, not in the editor: kept across language switches and shared with other views.
  const [editorState, dispatch] = useEditorState();

  function changeLanguage(next: Language) {
    setLanguage(next);
    document.documentElement.lang = next;
    storeLanguage(browserStorage(), next);
  }

  return (
    <I18nProvider language={language}>
      <main>
        <Header language={language} onLanguageChange={changeLanguage} />
        <Editor
          state={editorState}
          dispatch={dispatch}
          preview={<LazyBottlePreview design={editorState.history.present} />}
        />
      </main>
    </I18nProvider>
  );
}

function Header({
  language,
  onLanguageChange,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
}) {
  const t = useT();
  return (
    <header className="app-header">
      <h1>{t('app:title')}</h1>
      <LanguageSwitch language={language} onChange={onLanguageChange} />
    </header>
  );
}
