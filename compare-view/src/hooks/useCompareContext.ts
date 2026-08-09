import { useCallback, useEffect, useState } from 'react';
import { BaseAdapter } from '../services/baseAdapter';
import type { CompareContext } from '../types/compare';

interface CompareContextState {
  status: 'loading' | 'ready' | 'error';
  context: CompareContext | null;
  adapter: BaseAdapter | null;
  error: unknown;
}

const initialState: CompareContextState = {
  status: 'loading',
  context: null,
  adapter: null,
  error: null,
};

export function useCompareContext() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<CompareContextState>(initialState);

  const reload = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const adapter = new BaseAdapter();
    let active = true;
    let unsubscribe: () => void = () => undefined;

    const loadContext = async () => {
      setState((current) => ({ ...current, status: 'loading', error: null }));

      try {
        const context = await adapter.load();
        if (!active) {
          return;
        }

        unsubscribe = adapter.subscribe(reload);
        setState({ status: 'ready', context, adapter, error: null });
      } catch (error) {
        if (active) {
          setState((current) => ({ ...current, status: 'error', error }));
        }
      }
    };

    void loadContext();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshKey, reload]);

  return { ...state, reload };
}
