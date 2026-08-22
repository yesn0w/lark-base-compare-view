import { useEffect, useMemo, useState } from 'react';
import { BaseAdapter } from '../services/baseAdapter';
import type { CellValueMap, CompareField } from '../types/compare';
import { makeCellKey } from '../utils/cellFormatting';

interface CellValueState {
  values: CellValueMap;
  loading: boolean;
}

export function useCellValues(
  adapter: BaseAdapter | null,
  fields: CompareField[],
  recordIds: string[]
): CellValueState {
  const fieldKey = useMemo(() => fields.map((field) => field.id).join(','), [fields]);
  const recordKey = useMemo(() => recordIds.join(','), [recordIds]);
  const [state, setState] = useState<CellValueState>({
    values: {},
    loading: false,
  });

  useEffect(() => {
    let active = true;

    if (!adapter || !fields.length || !recordIds.length) {
      setState({ values: {}, loading: false });
      return () => {
        active = false;
      };
    }

    setState((current) => ({ ...current, loading: true }));

    const loadValues = async () => {
      try {
        const entries = await Promise.all(
          fields.flatMap((field) =>
            recordIds.map(async (recordId) => {
              const value = await adapter.getCellDisplayValue(field, recordId);
              return [makeCellKey(field.id, recordId), value] as const;
            })
          )
        );
        const values = entries.reduce<CellValueMap>((current, [key, value]) => {
          current[key] = value;
          return current;
        }, {});

        if (active) {
          setState({ values, loading: false });
        }
      } catch {
        if (active) {
          setState({ values: {}, loading: false });
        }
      }
    };

    void loadValues();

    return () => {
      active = false;
    };
  }, [adapter, fieldKey, fields, recordIds, recordKey]);

  return state;
}
