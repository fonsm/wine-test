import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './fonts/fonts.css';
import { browserStorage, initialLanguage } from './i18n/storage';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

const language = initialLanguage(browserStorage(), navigator.languages);
document.documentElement.lang = language;

createRoot(rootElement).render(
  <StrictMode>
    <App language={language} />
  </StrictMode>,
);
