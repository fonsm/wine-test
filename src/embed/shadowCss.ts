// Turns the app's stylesheet into one for the shadow root the embedded app lives in (src/embed).
// The shadow root keeps the shop theme's CSS out and the app's CSS in. Two things still reach
// in from the page and are handled here: inherited properties (reset on the app root) and rem
// units (relative to the shop page's root font size, which themes change, for example to 62.5%).
// Used by the embed build (vite.embed.config.ts) on the built CSS.

/** Class of the element inside the shadow root that takes the role of html/body. */
export const ROOT_CLASS = 'wld-root';

/** The browser's default root font size, which the app's rem values are written for. */
const REM_PX = 16;

const RESET = `.${ROOT_CLASS}{all:initial;display:block}`;

/** Selectors for the whole page, as a complete selector in a list (not part of a longer one). */
const PAGE_SELECTOR = /(^|[{};,/]\s*)(:root|html|body)(?=\s*[,{])/g;
const REM = /(?<![\w.-])(-?\d*\.?\d+)rem\b/g;

export function toShadowCss(css: string): string {
  const converted = css
    .replace(PAGE_SELECTOR, (_, before: string) => `${before}.${ROOT_CLASS}`)
    .replace(
      REM,
      (_, value: string) => `${String(Math.round(Number(value) * REM_PX * 1000) / 1000)}px`,
    );
  return `${RESET}\n${converted}`;
}
