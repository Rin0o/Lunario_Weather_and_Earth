/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { toIsoDate } from './app/src/calendar/ics.ts';
import { TEST_FEED_PATH, buildTestFeed } from './app/teste-calendario/feed.ts';
import pkg from './package.json' with { type: 'json' };

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Cloudflare Pages serves the app from the domain root.
const base = '/';

/** Emits the sample regional feed for the Q-09 calendar test page at build time. */
const calendarTestFeed = (): Plugin => ({
  name: 'lunario:calendar-test-feed',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: TEST_FEED_PATH,
      source: buildTestFeed(toIsoDate(new Date())),
    });
  },
});

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
    rolldownOptions: {
      input: {
        main: fromRoot('./app/index.html'),
        // Temporary Q-09 phone test page, served at /teste-calendario/.
        calendarTest: fromRoot('./app/teste-calendario/index.html'),
      },
    },
  },
  plugins: [
    react(),
    calendarTestFeed(),
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
        // The test page is not part of the offline app: don't precache it, and don't let the
        // app shell answer navigations to it.
        globIgnores: ['teste-calendario/**', 'assets/calendarTest-*'],
        navigateFallbackDenylist: [/^\/teste-calendario/],
      },
    }),
  ],
  test: {
    root: repoRoot,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./app/src/test/setup.ts'],
    include: ['app/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
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
