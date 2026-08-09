import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BaseAdapter } from '../services/baseAdapter';
import type { CompareContext, CompareViewConfig } from '../types/compare';
import {
  cloneCompareConfig,
  compareConfigs,
  createDefaultCompareConfig,
  makePersistedConfig,
  readCompareConfig,
} from '../utils/compareConfig';

interface CompareConfigState {
  status: 'loading' | 'ready' | 'error';
  applied: CompareViewConfig | null;
  draft: CompareViewConfig | null;
  canSave: boolean;
  saving: boolean;
  remoteChanged: boolean;
  error: string | null;
}

const initialState: CompareConfigState = {
  status: 'loading',
  applied: null,
  draft: null,
  canSave: false,
  saving: false,
  remoteChanged: false,
  error: null,
};

function getSourceKey(context: CompareContext | null): string | null {
  return context ? `${context.tableId}::${context.viewId ?? 'no-view'}` : null;
}

function sanitizeConfig(config: CompareViewConfig, context: CompareContext): CompareViewConfig {
  return (
    readCompareConfig(makePersistedConfig(config), context) ?? createDefaultCompareConfig(context)
  );
}

function getRemoteConfig(data: unknown, context: CompareContext): CompareViewConfig {
  return readCompareConfig(data, context) ?? createDefaultCompareConfig(context);
}

export function useCompareConfig(adapter: BaseAdapter | null, context: CompareContext | null) {
  const sourceKey = getSourceKey(context);
  const contextShapeKey = useMemo(
    () =>
      context
        ? `${sourceKey}::${context.fields.map((field) => field.id).join(',')}::${context.records
            .map((record) => record.id)
            .join(',')}`
        : null,
    [context, sourceKey]
  );
  const [state, setState] = useState<CompareConfigState>(initialState);
  const stateRef = useRef(state);
  const loadedSourceKeyRef = useRef<string | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyRemoteConfig = useCallback((remote: CompareViewConfig) => {
    setState((current) => {
      const dirty = !compareConfigs(current.draft, current.applied);
      if (!dirty || compareConfigs(current.draft, remote)) {
        return {
          ...current,
          status: 'ready',
          applied: cloneCompareConfig(remote),
          draft: cloneCompareConfig(remote),
          remoteChanged: false,
          error: null,
        };
      }

      return {
        ...current,
        status: 'ready',
        applied: cloneCompareConfig(remote),
        remoteChanged: true,
        error: null,
      };
    });
  }, []);

  const reloadSharedConfig = useCallback(async () => {
    if (!adapter || !context) {
      return;
    }

    try {
      const remote = getRemoteConfig(await adapter.getPersistentData(), context);
      applyRemoteConfig(remote);
    } catch {
      setState((current) => ({
        ...current,
        error: 'Unable to refresh the shared extension configuration.',
      }));
    }
  }, [adapter, applyRemoteConfig, context]);

  useEffect(() => {
    if (!adapter || !context || !sourceKey) {
      loadedSourceKeyRef.current = null;
      setState(initialState);
      return;
    }

    let active = true;
    const sourceChanged = loadedSourceKeyRef.current !== sourceKey;

    if (sourceChanged) {
      loadedSourceKeyRef.current = sourceKey;
      setState({ ...initialState, status: 'loading' });
      void Promise.all([adapter.getPersistentData(), adapter.canEditBase()])
        .then(([data, canSave]) => {
          if (!active) {
            return;
          }

          const config = getRemoteConfig(data, context);
          setState({
            status: 'ready',
            applied: cloneCompareConfig(config),
            draft: cloneCompareConfig(config),
            canSave,
            saving: false,
            remoteChanged: false,
            error: null,
          });
        })
        .catch(() => {
          if (active) {
            const config = createDefaultCompareConfig(context);
            setState({
              status: 'error',
              applied: cloneCompareConfig(config),
              draft: cloneCompareConfig(config),
              canSave: false,
              saving: false,
              remoteChanged: false,
              error: 'Unable to read the shared extension configuration.',
            });
          }
        });
    } else {
      setState((current) => {
        if (!current.applied || !current.draft) {
          return current;
        }

        return {
          ...current,
          applied: sanitizeConfig(current.applied, context),
          draft: sanitizeConfig(current.draft, context),
        };
      });
    }

    return () => {
      active = false;
    };
  }, [adapter, context, contextShapeKey, sourceKey]);

  useEffect(() => {
    if (!adapter || !sourceKey) {
      return () => undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = adapter.subscribeToPersistentData(() => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        void reloadSharedConfig();
      }, 100);
    });

    return () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      unsubscribe();
    };
  }, [adapter, reloadSharedConfig, sourceKey]);

  const updateDraft = useCallback(
    (updater: (config: CompareViewConfig) => CompareViewConfig) => {
      setState((current) => {
        if (!current.draft) {
          return current;
        }

        return { ...current, draft: updater(cloneCompareConfig(current.draft)) };
      });
    },
    []
  );

  const discard = useCallback(() => {
    setState((current) =>
      current.applied
        ? {
            ...current,
            draft: cloneCompareConfig(current.applied),
            remoteChanged: false,
          }
        : current
    );
  }, []);

  const reset = useCallback(() => {
    if (!context) {
      return;
    }

    setState((current) => ({
      ...current,
      draft: createDefaultCompareConfig(context),
      remoteChanged: false,
    }));
  }, [context]);

  const save = useCallback(async () => {
    const currentState = stateRef.current;
    if (!adapter || !currentState.draft || !currentState.canSave || currentState.saving) {
      return false;
    }

    const next = cloneCompareConfig(currentState.draft);
    setState((current) => ({ ...current, saving: true, error: null }));
    try {
      await adapter.setPersistentData(makePersistedConfig(next));
      setState((current) => ({
        ...current,
        status: 'ready',
        applied: cloneCompareConfig(next),
        draft: cloneCompareConfig(next),
        saving: false,
        remoteChanged: false,
        error: null,
      }));
      return true;
    } catch {
      setState((current) => ({
        ...current,
        saving: false,
        error: 'Unable to save the shared extension configuration.',
      }));
      return false;
    }
  }, [adapter]);

  const isDirty = !compareConfigs(state.draft, state.applied);

  return {
    ...state,
    isDirty,
    updateDraft,
    save,
    discard,
    reset,
    reloadSharedConfig,
  };
}
