/**
 * Vignettes beside screen titles and in empty states: old public-domain engravings (art/vignettes,
 * art/vignettes/SOURCES.md), printed in the plates' brown ink by `npm run images`.
 */
const vignettes = import.meta.glob<string>('./images/vignettes/vignette-*-320.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** URL of the vignette `art/vignettes/<name>.png`, or null when it was not generated. */
export function vignetteFor(name: string): string | null {
  return vignettes[`./images/vignettes/vignette-${name}-320.webp`] ?? null;
}
