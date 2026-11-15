import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates favicon, apple-touch and maskable PNG icons from the single SVG source at build time.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: minimal2023Preset,
  images: ['public/icon.svg'],
});
