import { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseAdapter } from '../services/baseAdapter';
import type { CellValueMap, CompareField } from '../types/compare';
import { cellSelectionKey, loadCellValuesInBatches, retainCellValues } from '../utils/cellLoading';

interface CellValueState {
  values: CellValueMap;
  loading: boolean;
}

export function useCellValues(
  adapter: BaseAdapter | null,
  fields: CompareField[],
  recordIds: string[]
): CellValueState {
  const fieldKey = cellSelectionKey(fields.map((field) => field.id));
  const recordKey = cellSelectionKey(recordIds);
  // A pure reorder must not cancel or restart a load. Metadata changes arrive
  // with a new adapter when the Base context refreshes.
  const request = useMemo(() => ({ fields, recordIds }), [adapter, fieldKey, recordKey]);
  const cache = useRef<{ adapter: BaseAdapter | null; values: CellValueMap }>({
    adapter: null,
    values: {},
  });
  const [state, setState] = useState<CellValueState & {
    adapter: BaseAdapter | null;
    request: typeof request | null;
  }>({ adapter: null, request: null, values: {}, loading: false });

  useEffect(() => {
    let active = true;
    const values =
      adapter && cache.current.adapter === adapter
        ? retainCellValues(cache.current.values, request.fields, request.recordIds)
        : {};
    cache.current = { adapter, values };
    const hasCells = Boolean(adapter && request.fields.length && request.recordIds.length);
    setState({ adapter, request, values, loading: hasCells });

    if (adapter && hasCells) {
      void loadCellValuesInBatches({
        ...request,
        initialValues: values,
        readCell: (field, recordId) => adapter.getCellDisplayValue(field, recordId),
        isActive: () => active,
        onBatch: (batch) => {
          const nextValues = { ...cache.current.values, ...batch };
          cache.current = { adapter, values: nextValues };
          setState({ adapter, request, values: nextValues, loading: true });
        },
      }).then(() => {
        if (active) {
          setState({ adapter, request, values: cache.current.values, loading: false });
        }
      });
    }

    return () => {
      active = false;
    };
  }, [adapter, request]);

  // Mask old-source values during the render before effect cleanup/setup.
  const visibleValues = useMemo(() => {
    if (state.adapter !== adapter) {
      return {};
    }
    return state.request === request
      ? state.values
      : retainCellValues(state.values, request.fields, request.recordIds);
  }, [adapter, request, state]);
  const hasCells = Boolean(adapter && fields.length && recordIds.length);
  return {
    values: visibleValues,
    loading: hasCells && (state.adapter !== adapter || state.request !== request || state.loading),
  };
}
