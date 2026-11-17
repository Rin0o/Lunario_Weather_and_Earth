/**
 * The project's artwork, as WebP made from /art by `npm run images` (scripts/lib/images.ts).
 * Phones get the small width; `srcSet` lets sharper screens take the larger one.
 */
import coverLarge from './images/cover-1024.webp';
import cover from './images/cover-640.webp';
import logoRoundLarge from './images/logo-round-144.webp';
import logoRound from './images/logo-round-96.webp';
import logoTextLarge from './images/logo-text-960.webp';
import logoText from './images/logo-text-480.webp';

export const artwork = {
  logoRound: { src: logoRound, srcSet: `${logoRound} 96w, ${logoRoundLarge} 144w` },
  logoText: { src: logoText, srcSet: `${logoText} 480w, ${logoTextLarge} 960w` },
  cover: { src: cover, srcSet: `${cover} 640w, ${coverLarge} 1024w` },
};
