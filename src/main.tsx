import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './fonts/fonts.css';
import { applyDocumentLanguage } from './i18n/document';
import { browserStorage, initialLanguage } from './i18n/storage';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

const language = initialLanguage(browserStorage(), navigator.languages);
applyDocumentLanguage(document, language);

createRoot(rootElement).render(
  <StrictMode>
    <App language={language} />
  </StrictMode>,
);
