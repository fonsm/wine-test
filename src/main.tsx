import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { detectLanguage } from './i18n';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

const language = detectLanguage(navigator.languages);
document.documentElement.lang = language;

createRoot(rootElement).render(
  <StrictMode>
    <App language={language} />
  </StrictMode>,
);
