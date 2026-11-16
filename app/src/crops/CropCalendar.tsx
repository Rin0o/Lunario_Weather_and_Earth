import { useTranslation } from 'react-i18next';
import { fortnightDates, inWindow } from '../catalog/catalog.ts';
import { ACTIONS, type Action, type CalendarWindow, type Fortnight } from '../catalog/types.ts';
import { isoDateToNoonUtc } from '../calendar/dates.ts';
import { formatDayMonthLong, formatMonthInitial } from '../i18n/format.ts';

interface CropCalendarProps {
  windows: CalendarWindow[];
  /** Highlighted as "now". */
  currentFortnight: Fortnight;
  year: number;
}

const FORTNIGHTS = Array.from({ length: 24 }, (_, i) => i + 1);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * A crop's year in one zone: a 24-fortnight strip per action, plus the same windows as text.
 * The strip is decorative for screen readers; the list below it carries the information.
 */
export function CropCalendar({ windows, currentFortnight, year }: CropCalendarProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const actions = ACTIONS.filter((a) => windows.some((w) => w.action === a));

  const range = (w: CalendarWindow) => {
    const from = fortnightDates(w.start, year).first;
    const to = fortnightDates(w.end, year).last;
    return `${formatDayMonthLong(isoDateToNoonUtc(from), lang)} – ${formatDayMonthLong(isoDateToNoonUtc(to), lang)}`;
  };
  const windowsOf = (action: Action) =>
    windows.filter((w) => w.action === action).sort((a, b) => a.start - b.start);

  return (
    <div className="crop-calendar">
      <div className="strip" aria-hidden="true">
        <span />
        <div className="strip-months">
          {MONTHS.map((m) => (
            <span key={m}>{formatMonthInitial(m, lang)}</span>
          ))}
        </div>
        {actions.map((action) => (
          <div className="strip-row" key={action}>
            <span className="strip-label">{t(`sowing.short.${action}`)}</span>
            <div className="strip-cells">
              {FORTNIGHTS.map((n) => (
                <span
                  key={n}
                  className={[
                    'strip-cell',
                    windowsOf(action).some((w) => inWindow(n, w)) ? `on action-${action}` : '',
                    n === currentFortnight ? 'now' : '',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <dl className="calendar-list">
        {actions.map((action) => (
          <div key={action}>
            <dt>
              <span className={`legend action-${action}`} aria-hidden="true" />
              {t(`sowing.actions.${action}`)}
            </dt>
            {windowsOf(action).map((w) => (
              <dd key={`${w.start}-${w.end}`}>
                {range(w)}
                {w.origin === 'calculated' && (
                  <span className="hint"> · {t('crops.calculated')}</span>
                )}
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </div>
  );
}
