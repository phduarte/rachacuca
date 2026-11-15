import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // Versão exibida abaixo da marca (src/ui/brand.ts).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: '/rachacuca/', // GitHub Pages: https://phduarte.github.io/rachacuca/
  plugins: [
    VitePWA({
      registerType: 'prompt', // seção 9.4: perguntar antes de atualizar
      injectRegister: false, // o registro é feito em src/pwa/sw.ts
      manifest: false, // usamos public/manifest.webmanifest (seção 9.1)
      workbox: {
        globPatterns: ['**/*.{html,js,css,woff2,png,webp,svg,webmanifest}'],
      },
    }),
  ],
  build: { target: 'es2022' },
});
