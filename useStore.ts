
import { useState, useEffect } from 'react';
import { api } from '../services/api';

// This hook simulates the "Live Query" aspect of Dexie but works with our API layer.
// When the API triggers a 'data_change' event, this hook re-runs the fetcher.
export function useStore<T>(
  fetcher: () => Promise<T>, 
  deps: any[] = []
): T | undefined {
  const [data, setData] = useState<T>();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const result = await fetcher();
        if (mounted) setData(result);
      } catch (err) {
        console.error("Data load failed", err);
      }
    };

    load();

    const handleUpdate = () => load();
    window.addEventListener('data_change', handleUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('data_change', handleUpdate);
    };
  }, deps);

  return data;
}
