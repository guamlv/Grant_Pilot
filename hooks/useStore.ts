
import { useState, useEffect, useSyncExternalStore, useMemo } from 'react';
import { api } from '../services/api.ts';

/**
 * Professional State Synchronization Hook
 * Leverages useSyncExternalStore for efficient, tearing-free updates.
 */
export function useStore<T>(
  fetcher: () => Promise<T>, 
  deps: any[] = [],
  storeName: keyof typeof api = 'grants'
): T | undefined {
  const [data, setData] = useState<T>();
  
  // Connect to the specific store's subscription system
  const store = api[storeName] as any;
  const snapshot = useSyncExternalStore(
    (callback) => store.subscribe(callback),
    () => store.getSnapshot()
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const result = await fetcher();
      if (mounted) setData(result);
    };
    load();
    return () => { mounted = false; };
  }, [snapshot, ...deps]);

  return data;
}
