// The embedded build, for a shop page (Shopify theme app extension): dist-embed/ holds one
// flat folder of files, as a theme extension's assets folder needs. The page loads
// wine-label-designer.js; it finds everything else next to itself (relative base).
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { toShadowCss } from './src/embed/shadowCss';

/** Makes the built CSS work inside the app's shadow root (see src/embed/shadowCss.ts). */
function shadowCss(): Plugin {
  return {
    name: 'wine-label-shadow-css',
    apply: 'build',
    // After Vite's own CSS handling, on the final stylesheet.
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName.endsWith('.css')) {
          const css =
            typeof file.source === 'string' ? file.source : new TextDecoder().decode(file.source);
          file.source = toShadowCss(css);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), shadowCss()],
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist-embed',
    emptyOutDir: true,
    assetsDir: '',
    assetsInlineLimit: 0,
    // One stylesheet, loaded into the shadow root. Split CSS would go into the shop's <head>.
    cssCodeSplit: false,
    rolldownOptions: {
      input: 'src/embed/main.tsx',
      output: {
        entryFileNames: 'wine-label-designer.js',
        chunkFileNames: 'wld-[name]-[hash].js',
        assetFileNames: (asset) =>
          asset.names.some((name) => name.endsWith('.css'))
            ? 'wine-label-designer.css'
            : 'wld-[name]-[hash][extname]',
      },
    },
  },
});
