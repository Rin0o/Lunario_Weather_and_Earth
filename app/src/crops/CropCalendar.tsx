import { useTranslation } from 'react-i18next';
import { fortnightDates, inWindow } from '../catalog/catalog.ts';
import { ACTIONS, type Action, type CalendarWindow, type Fortnight } from '../catalog/types.ts';
import { isoDateToNoonUtc } from '../calendar/dates.ts';
import { formatDayMonthLong, formatMonthShort } from '../i18n/format.ts';

interface CropCalendarProps {
  windows: CalendarWindow[];
  /** Highlighted as "now". */
  currentFortnight: Fortnight;
  year: number;
}

const FORTNIGHTS = Array.from({ length: 24 }, (_, i) => i + 1);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** The "now" needle's head: an ear of wheat on a 14×14 box, the needle its stalk. */
const WHEAT_EAR = (
  <svg viewBox="0 0 14 14" fill="currentColor">
    <ellipse cx="7" cy="2.6" rx="1.3" ry="2.2" />
    {[5.6, 8.6, 11.4].map((y) => (
      <g key={y}>
        <ellipse cx="5.2" cy={y} rx="1.2" ry="2" transform={`rotate(-32 5.2 ${y})`} />
        <ellipse cx="8.8" cy={y} rx="1.2" ry="2" transform={`rotate(32 8.8 ${y})`} />
      </g>
    ))}
  </svg>
);

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

  const nowMonth = Math.ceil(currentFortnight / 2);

  return (
    <div className="crop-calendar">
      <div
        className="strip"
        aria-hidden="true"
        style={{ '--now': currentFortnight } as React.CSSProperties}
      >
        <span />
        <div className="strip-months">
          {MONTHS.map((m) => (
            <span key={m} className={m === nowMonth ? 'now-month' : undefined}>
              {formatMonthShort(m, lang)}
            </span>
          ))}
        </div>
        <span className="strip-now">{WHEAT_EAR}</span>
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
