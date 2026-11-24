import { useMemo } from 'react';
import { createI18n, DEFAULT_LANGUAGE, type Language } from './i18n';
import { UploadField } from './upload/UploadField';

interface AppProps {
  language?: Language;
}

export function App({ language = DEFAULT_LANGUAGE }: AppProps) {
  const { t } = useMemo(() => createI18n(language), [language]);
  return (
    <main>
      <h1>Wine Label Designer</h1>
      <UploadField t={t} />
    </main>
  );
}
