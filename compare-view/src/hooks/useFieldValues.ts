import { useEffect, useMemo, useState } from 'react';
import { BaseAdapter } from '../services/baseAdapter';
import type { FieldValueMap } from '../types/compare';

interface FieldValuesState {
  values: Record<string, FieldValueMap>;
  loading: boolean;
}

/** Loads raw values only for fields needed by the local query controls. */
export function useFieldValues(
  adapter: BaseAdapter | null,
  requestedFieldIds: string[]
): FieldValuesState {
  const fieldKey = useMemo(
    () => [...new Set(requestedFieldIds.filter(Boolean))].join(','),
    [requestedFieldIds]
  );
  const fieldIds = useMemo(() => (fieldKey ? fieldKey.split(',') : []), [fieldKey]);
  const [state, setState] = useState<FieldValuesState>({ values: {}, loading: false });

  useEffect(() => {
    let active = true;

    if (!adapter || !fieldIds.length) {
      setState({ values: {}, loading: false });
      return () => {
        active = false;
      };
    }

    setState((current) => ({ ...current, loading: true }));
    void Promise.all(
      fieldIds.map(async (fieldId) => [fieldId, await adapter.getFieldValueMap(fieldId)] as const)
    )
      .then((entries) => {
        if (!active) {
          return;
        }

        setState({ values: Object.fromEntries(entries), loading: false });
      })
      .catch(() => {
        if (active) {
          setState({ values: {}, loading: false });
        }
      });

    return () => {
      active = false;
    };
  }, [adapter, fieldKey]);

  return state;
}
