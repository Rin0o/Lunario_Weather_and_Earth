import { useTranslation } from 'react-i18next';

/** Credit for the saints and sayings, required by their CC BY-SA licence (data/README.md). */
export function AlmanacSources() {
  const { t } = useTranslation();
  return (
    <p className="hint">
      {t('almanac.sources')}{' '}
      <a href="https://pt.wikipedia.org/wiki/Calend%C3%A1rio_Romano_Geral" rel="noopener">
        Wikipédia
      </a>
      {' · '}
      <a href="https://pt.wikiquote.org/wiki/Prov%C3%A9rbios_portugueses" rel="noopener">
        Wikiquote
      </a>
      {' · '}
      <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt" rel="noopener license">
        CC BY-SA 4.0
      </a>
    </p>
  );
}
