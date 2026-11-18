import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { nextMoonQuarters } from '../astro/moon.ts';
import { formatShortDate, formatTime } from '../i18n/format.ts';
import { formatDecimal } from './format.ts';
import { tideDay, tideNow } from './portTides.ts';

interface TideCardProps {
  now: Date;
  portId: string;
  portName: string;
}

const W = 320;
const H = 96;
const PAD = 6;

/** The day's tide curve: the level from midnight to midnight, its waters and the present. */
function TideCurve({
  now,
  day,
  lang,
}: {
  now: Date;
  day: NonNullable<ReturnType<typeof tideDay>>;
  lang: string | undefined;
}) {
  const first = day.curve[0];
  const last = day.curve.at(-1);
  if (!first || !last) return null;
  const t0 = first.time.getTime();
  const span = last.time.getTime() - t0;
  const top = Math.max(...day.curve.map((p) => p.height)) + 0.3;
  const x = (t: Date) => ((t.getTime() - t0) / span) * W;
  const y = (h: number) => PAD + (1 - Math.max(0, h) / top) * (H - 2 * PAD);
  const line = day.curve
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.time).toFixed(1)} ${y(p.height).toFixed(1)}`)
    .join(' ');
  const nowX = now.getTime() >= t0 && now.getTime() <= t0 + span ? x(now) : null;
  return (
    <svg className="tide-curve" viewBox={`0 0 ${W} ${H + 16}`} aria-hidden="true">
      <path className="tide-water" d={`${line} L${W} ${H} L0 ${H} Z`} />
      <path className="tide-line" d={line} />
      {[6, 12, 18].map((hour) => {
        const t = new Date(t0 + (hour / 24) * span);
        return (
          <g key={hour} className="tide-hour">
            <line x1={x(t)} x2={x(t)} y1={H} y2={H + 4} />
            <text x={x(t)} y={H + 14}>
              {formatTime(t, lang).slice(0, 2)}h
            </text>
          </g>
        );
      })}
      {day.extremes.map((e) => (
        <circle
          key={e.time.toISOString()}
          className={`tide-dot ${e.kind}`}
          cx={x(e.time)}
          cy={y(e.height)}
          r={3.5}
        />
      ))}
      {nowX !== null && <line className="tide-now" x1={nowX} x2={nowX} y1={0} y2={H} />}
    </svg>
  );
}

/** "Marés": the day's high and low waters for the port, computed on the phone (D-34). */
export function TideCard({ now, portId, portName }: TideCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const day = useMemo(() => tideDay(portId, now), [portId, now]);
  const current = tideNow(portId, now);
  const quarter = useMemo(
    () => nextMoonQuarters(now, 4).find((q) => q.phase === 'new' || q.phase === 'full'),
    [now],
  );
  if (!day) return null;
  const metres = (h: number) => t('sea.metres', { value: formatDecimal(h, lang) });

  return (
    <article className="card tide-card" aria-labelledby="tide-heading">
      <h3 id="tide-heading">{t('sea.tides.title')}</h3>
      <p className="tide-summary">
        <span>
          <strong>{t(`sea.tides.strength.${day.strength}`)}</strong>
          {' · '}
          {t('sea.tides.range', { height: metres(day.range) })}
        </span>
        {current && (
          <span className="tide-current">
            {current.rising ? (
              <ArrowUp aria-hidden="true" size={16} />
            ) : (
              <ArrowDown aria-hidden="true" size={16} />
            )}
            {t(current.rising ? 'sea.tides.rising' : 'sea.tides.falling', {
              height: metres(current.height),
            })}
          </span>
        )}
      </p>
      <TideCurve now={now} day={day} lang={lang} />
      <ol className="tide-list">
        {day.extremes.map((e) => (
          <li key={e.time.toISOString()} className={e.kind} data-past={e.time < now || undefined}>
            <span className="tide-kind">{t(`sea.tides.${e.kind}`)}</span>
            <span className="tide-time">{formatTime(e.time, lang)}</span>
            <span className="tide-height">{metres(e.height)}</span>
          </li>
        ))}
      </ol>
      {quarter && day.strength !== 'spring' && (
        <p className="hint">
          {t('sea.tides.nextSpring', {
            phase: t(`moon.phases.${quarter.phase}`),
            date: formatShortDate(quarter.time, lang),
          })}
        </p>
      )}
      <p className="hint">
        {t(day.method === 'gauge' ? 'sea.tides.sourceGauge' : 'sea.tides.sourceModel', {
          port: portName,
        })}
      </p>
    </article>
  );
}
