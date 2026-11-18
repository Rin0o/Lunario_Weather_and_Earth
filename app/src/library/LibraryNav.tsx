import { useTranslation } from 'react-i18next';
import { LIBRARY_SHELVES, href } from '../navigation/route.ts';

type Shelf = (typeof LIBRARY_SHELVES)[number];

/**
 * The top of the Biblioteca tab: its title and a switcher between its shelves (crops, sayings…).
 * More lists (saints, holidays…) become one more entry in LIBRARY_SHELVES.
 */
export function LibraryNav({ current }: { current: Shelf }) {
  const { t } = useTranslation();
  return (
    <header className="library-header">
      <p className="library-title">{t('library.title')}</p>
      <nav className="library-nav" aria-label={t('library.shelves')}>
        {LIBRARY_SHELVES.map((shelf) => (
          <a key={shelf} href={href[shelf]} aria-current={shelf === current ? 'page' : undefined}>
            {t(`nav.${shelf}`)}
          </a>
        ))}
      </nav>
    </header>
  );
}
