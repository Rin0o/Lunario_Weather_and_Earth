import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `intervalMs` and whenever the app comes back to the
 * foreground, so an installed app left open moves on to the next day.
 */
export function useNow(intervalMs = 10 * 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = setInterval(refresh, intervalMs);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
}
