import { ChevronLeft } from 'lucide-react';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { catalog } from '../catalog/catalog.ts';
import type { Catalog } from '../catalog/types.ts';
import { PreviousRouteContext, hashOf, routeLabelKey, type Route } from './route.ts';

interface BackButtonProps {
  /** Where to go when the screen was opened directly (a link, a notification). */
  fallback: Route;
  source?: Catalog;
}

/**
 * Back to the screen the user came from, named ("‹ Hoje", "‹ Tomate"), the same as the phone's
 * back button. Opened directly, it goes to the screen's natural parent instead.
 */
export function BackButton({ fallback, source = catalog }: BackButtonProps) {
  const { t, i18n } = useTranslation();
  const previous = useContext(PreviousRouteContext);
  const target = previous ?? fallback;

  const crop = target.name === 'crop' ? source.crops.find((c) => c.id === target.id) : undefined;
  const label = crop
    ? i18n.resolvedLanguage === 'en'
      ? crop.name.en
      : crop.name.pt
    : t(routeLabelKey(target));

  return (
    <a
      className="back-button"
      href={hashOf(target)}
      aria-label={t('nav.back', { page: label })}
      onClick={
        previous
          ? (event) => {
              event.preventDefault();
              window.history.back();
            }
          : undefined
      }
    >
      <ChevronLeft aria-hidden="true" size={20} />
      {label}
    </a>
  );
}
