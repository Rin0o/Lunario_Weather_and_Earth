import { useTranslation } from 'react-i18next';
import { catalog } from '../catalog/catalog.ts';
import type { Catalog, Text } from '../catalog/types.ts';
import { intlLocale } from '../i18n/format.ts';
import { href } from '../navigation/route.ts';

/** All crops, alphabetically in the current language, each linking to its sheet. */
export function CropsList({ source = catalog }: { source?: Catalog }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const pick = (text: Text) => (lang === 'en' ? text.en : text.pt);
  const collator = new Intl.Collator(intlLocale(lang));
  const crops = [...source.crops].sort((a, b) => collator.compare(pick(a.name), pick(b.name)));

  return (
    <section aria-labelledby="crops-heading">
      <h2 id="crops-heading">{t('crops.title')}</h2>
      <ul className="crops-index">
        {crops.map((crop) => (
          <li key={crop.id}>
            <a href={href.crop(crop.id)}>
              <span>{pick(crop.name)}</span>
              <span className="hint">{crop.scientificName}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
