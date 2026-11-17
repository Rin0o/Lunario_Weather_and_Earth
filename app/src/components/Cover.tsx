import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { artwork } from '../assets/artwork.ts';

const SEEN_KEY = 'lunario.coverSeen';
/** How long the cover takes to open after the tap. */
const OPEN_MS = 450;

function seenThisSession(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * The notebook's leather cover, shown when the app starts (once per session). It stays until
 * it is tapped, then opens onto the app, which is already rendered underneath.
 */
export function Cover() {
  const { t } = useTranslation();
  const [state, setState] = useState<'shown' | 'opening' | 'gone'>(() =>
    seenThisSession() ? 'gone' : 'shown',
  );

  useEffect(() => {
    if (state === 'shown') {
      try {
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch {
        // No session storage: the cover just shows again next time.
      }
    }
    if (state === 'opening') {
      const timer = setTimeout(() => setState('gone'), OPEN_MS);
      return () => clearTimeout(timer);
    }
  }, [state]);

  if (state === 'gone') return null;
  return (
    <button
      type="button"
      className={`cover${state === 'opening' ? ' opening' : ''}`}
      aria-label={t('cover.open')}
      onClick={() => setState('opening')}
    >
      <img
        className="cover-book"
        src={artwork.cover.src}
        srcSet={artwork.cover.srcSet}
        sizes="(min-width: 640px) 520px, 90vw"
        alt=""
      />
      <img
        className="cover-logo"
        src={artwork.logoText.src}
        srcSet={artwork.logoText.srcSet}
        sizes="(min-width: 640px) 420px, 72vw"
        alt=""
      />
      <span className="cover-hint" aria-hidden="true">
        {t('cover.hint')}
      </span>
    </button>
  );
}
