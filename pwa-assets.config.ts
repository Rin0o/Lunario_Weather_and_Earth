import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the favicon, Apple touch and maskable PNG icons from the square logo at build time.
// The logo has transparent corners: the Apple and maskable icons (which must be opaque) get the
// night-sky blue of the logo behind it.
const NIGHT = '#1d3346';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0.1, resizeOptions: { background: NIGHT } },
    apple: { ...minimal2023Preset.apple, padding: 0.05, resizeOptions: { background: NIGHT } },
  },
  // Written by `npm run images` from art/backgrounds/Logo_round-square.png.
  images: ['public/app-icon.png'],
});
