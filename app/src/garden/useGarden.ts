import { useCallback, useEffect, useState } from 'react';
import {
  addPlanting,
  deletePlanting,
  listPlantings,
  requestPersistentStorage,
  updatePlanting,
} from './db.ts';
import type { NewPlanting, Planting } from './plantings.ts';

export interface Garden {
  plantings: Planting[];
  loading: boolean;
  /** Set when the device storage cannot be read or written. */
  failed: boolean;
  add: (input: NewPlanting) => Promise<void>;
  setStatus: (id: string, status: Planting['status']) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** The plantings stored on this device, with the operations the garden screen needs. */
export function useGarden(): Garden {
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    try {
      setPlantings(await listPlantings());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading from IndexedDB is asynchronous; state is only set once it answers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const run = useCallback(
    async (operation: () => Promise<unknown>) => {
      let ok = true;
      try {
        await operation();
      } catch {
        ok = false;
      }
      await reload();
      // A successful reload clears the flag, so a failed operation must set it afterwards.
      if (!ok) setFailed(true);
    },
    [reload],
  );

  const add = useCallback(
    (input: NewPlanting) =>
      run(async () => {
        const isFirst = plantings.length === 0;
        await addPlanting(input);
        if (isFirst) await requestPersistentStorage();
      }),
    [run, plantings.length],
  );
  const setStatus = useCallback(
    (id: string, status: Planting['status']) => run(() => updatePlanting(id, { status })),
    [run],
  );
  const remove = useCallback((id: string) => run(() => deletePlanting(id)), [run]);

  return { plantings, loading, failed, add, setStatus, remove };
}
