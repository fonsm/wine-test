import { useState, type ReactNode } from 'react';
import { LanguageSwitch } from './app/LanguageSwitch';
import { Editor } from './editor/Editor';
import { useEditorState } from './editor/useEditorState';
import { DEFAULT_LANGUAGE, type Language } from './i18n';
import { applyDocumentLanguage } from './i18n/document';
import { I18nProvider, useT } from './i18n/I18nContext';
import { browserStorage, storeLanguage } from './i18n/storage';
import { createEmptyDesign } from './model/schema';
import { LazyBottlePreview } from './preview/LazyBottlePreview';
import { defaultBottleId } from './templates/catalog';

interface AppProps {
  /** Initial language: the stored choice or the browser language (see main.tsx). */
  language?: Language;
  /**
   * Embedded in a shop page (src/embed): the page belongs to the shop, so the app has no
   * <main>, no page title and no language switch (it follows the shop's language), and it
   * never changes the document or stores anything.
   */
  embedded?: boolean;
  /** The bottle to start with (the product's bottle in a shop). */
  initialBottleId?: string;
}

export function App({
  language: initial = DEFAULT_LANGUAGE,
  embedded = false,
  initialBottleId,
}: AppProps) {
  const [language, setLanguage] = useState<Language>(initial);
  // Lives here, not in the editor: kept across language switches and shared with other views.
  const [editorState, dispatch] = useEditorState({
    ...createEmptyDesign(),
    bottleId: initialBottleId ?? defaultBottleId(),
  });

  function changeLanguage(next: Language) {
    setLanguage(next);
    applyDocumentLanguage(document, next);
    storeLanguage(browserStorage(), next);
  }

  const editor = (
    <Editor
      state={editorState}
      dispatch={dispatch}
      preview={<LazyBottlePreview design={editorState.history.present} />}
    />
  );

  return (
    <I18nProvider language={language}>
      {embedded ? (
        <EmbeddedShell>{editor}</EmbeddedShell>
      ) : (
        <main>
          <Header language={language} onLanguageChange={changeLanguage} />
          {editor}
        </main>
      )}
    </I18nProvider>
  );
}

function EmbeddedShell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <section className="app-embedded" aria-label={t('app:title')}>
      {children}
    </section>
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
