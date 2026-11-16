import { useCallback, useEffect, useRef, useState } from 'react';
import { getMeta, setMeta } from '../garden/db.ts';

/** The optional "Lua" mode (RF-09, D-10): off unless the user turns it on; saved on the device. */
export function useMoonMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  // If the user toggles before the saved value has loaded, their choice wins.
  const touched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getMeta('moonMode')
      .then((value) => {
        if (!cancelled && !touched.current) setOn(value === 'on');
      })
      .catch(() => undefined); // no storage: stays off
    return () => {
      cancelled = true;
    };
  }, []);

  const set = useCallback((next: boolean) => {
    touched.current = true;
    setOn(next);
    void setMeta('moonMode', next ? 'on' : 'off').catch(() => undefined);
  }, []);

  return [on, set];
}
