// Entry of the embedded build (vite.embed.config.ts), for a shop page such as Shopify's. The
// page has an element with the attribute data-wine-label-designer (plus data-language and
// data-bottle, and a JSON script with the shop's bottles inside it, see config.ts), and loads
// wine-label-designer.js as a module script.
// The app lives in a shadow root on that element, so the shop theme's CSS and the app's CSS
// stay apart. Its files (chunks, fonts, pictures) load next to this script, from the shop's
// CDN. It reads its settings from the page and never changes or stores anything outside.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../App';
import '../styles.css';
import { setBottleCatalog } from '../templates/catalog';
import { parseEmbedConfig } from './config';
import { registerFonts } from './fontFaces';
import { ROOT_CLASS } from './shadowCss';

export const HOST_SELECTOR = '[data-wine-label-designer]';
/** The built stylesheet, next to this script (named in vite.embed.config.ts). */
const STYLESHEET_FILE = 'wine-label-designer.css';

function mount(host: HTMLElement): void {
  if (host.shadowRoot) return;
  const config = parseEmbedConfig(
    {
      language: host.dataset.language,
      bottle: host.dataset.bottle,
      bottlesJson: host.querySelector('script[type="application/json"]')?.textContent ?? null,
    },
    navigator.languages,
  );
  for (const warning of config.warnings) console.warn(`Wine Label Designer: ${warning}`);
  setBottleCatalog(config.bottles);
  registerFonts(document.fonts);

  const shadow = host.attachShadow({ mode: 'open' });
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL(STYLESHEET_FILE, import.meta.url).href;
  const container = document.createElement('div');
  container.className = ROOT_CLASS;
  container.lang = config.language;
  // German and English are written left to right, also on a right-to-left shop page.
  container.dir = 'ltr';
  shadow.append(stylesheet, container);

  // Render once the styles are there (or failed), so the shop never shows an unstyled app.
  const render = () => {
    createRoot(container).render(
      <StrictMode>
        <App embedded language={config.language} initialBottleId={config.bottleId ?? undefined} />
      </StrictMode>,
    );
  };
  stylesheet.addEventListener('load', render, { once: true });
  stylesheet.addEventListener('error', render, { once: true });
}

const hosts = document.querySelectorAll<HTMLElement>(HOST_SELECTOR);
if (hosts.length > 1) console.warn('Wine Label Designer: only one designer per page is supported.');
if (hosts[0]) mount(hosts[0]);
