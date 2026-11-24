import { useMemo, useState } from 'react';
import { createI18n, DEFAULT_LANGUAGE, type Language } from './i18n';
import { DesignFileControls } from './model/DesignFileControls';
import { createEmptyDesign, type Design } from './model/schema';
import { UploadField } from './upload/UploadField';

interface AppProps {
  language?: Language;
}

export function App({ language = DEFAULT_LANGUAGE }: AppProps) {
  const { t } = useMemo(() => createI18n(language), [language]);
  const [design, setDesign] = useState<Design>(createEmptyDesign);
  return (
    <main>
      <h1>Wine Label Designer</h1>
      <UploadField t={t} />
      <DesignFileControls t={t} design={design} onLoad={setDesign} />
    </main>
  );
}
