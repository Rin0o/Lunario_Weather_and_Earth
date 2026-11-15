/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// Cloudflare Pages serves the app from the domain root.
const base = '/';

export default defineConfig({
  root: 'app',
  base,
  publicDir: '../public',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Lunário',
        short_name: 'Lunário',
        description: 'Um almanaque rural no bolso.',
        lang: 'pt-PT',
        theme_color: '#2f3b2a',
        background_color: '#f4ecd8',
        display: 'standalone',
        start_url: base,
        scope: base,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
      },
    }),
  ],
  test: {
    root: repoRoot,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./app/src/test/setup.ts'],
    include: ['app/src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['app/src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', 'app/src/test/**', 'app/src/main.tsx', '**/*.d.ts'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
