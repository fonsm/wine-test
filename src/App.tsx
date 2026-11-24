import { useMemo } from 'react';
import { Editor } from './editor/Editor';
import { createI18n, DEFAULT_LANGUAGE, type Language } from './i18n';

interface AppProps {
  language?: Language;
}

export function App({ language = DEFAULT_LANGUAGE }: AppProps) {
  const { t } = useMemo(() => createI18n(language), [language]);
  return (
    <main>
      <h1>Wine Label Designer</h1>
      <Editor t={t} />
    </main>
  );
}
