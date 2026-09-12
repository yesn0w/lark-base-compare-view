import type { CellValueMap, CompareCellValue, CompareField } from '../types/compare';
import { makeCellKey, makeTextCellValue } from './cellFormatting';

const CELL_BATCH_SIZE = 12;

/** An order-independent identity for a set of requested fields or records. */
export function cellSelectionKey(ids: string[]): string {
  return JSON.stringify([...new Set(ids)].sort());
}

export function retainCellValues(
  values: CellValueMap,
  fields: CompareField[],
  recordIds: string[]
): CellValueMap {
  const retained: CellValueMap = {};
  for (const field of fields) {
    for (const recordId of recordIds) {
      const key = makeCellKey(field.id, recordId);
      if (values[key]) {
        retained[key] = values[key];
      }
    }
  }
  return retained;
}

/**
 * Generate only the next batch's promises. Cancellation stops future batches
 * and publication; SDK calls already in flight are allowed to finish.
 */
export async function loadCellValuesInBatches({
  fields,
  recordIds,
  initialValues,
  readCell,
  isActive,
  onBatch,
}: {
  fields: CompareField[];
  recordIds: string[];
  initialValues: CellValueMap;
  readCell: (field: CompareField, recordId: string) => Promise<CompareCellValue>;
  isActive: () => boolean;
  onBatch: (batch: CellValueMap) => void;
}): Promise<void> {
  const total = fields.length * recordIds.length;
  let nextIndex = 0;

  while (nextIndex < total && isActive()) {
    const batch: Promise<readonly [string, CompareCellValue]>[] = [];
    while (nextIndex < total && batch.length < CELL_BATCH_SIZE && isActive()) {
      const index = nextIndex++;
      const field = fields[Math.floor(index / recordIds.length)];
      const recordId = recordIds[index % recordIds.length];
      const key = makeCellKey(field.id, recordId);
      if (initialValues[key]) continue;

      batch.push((async () => {
        try {
          return [key, await readCell(field, recordId)] as const;
        } catch {
          return [key, makeTextCellValue(null)] as const;
        }
      })());
    }
    if (!batch.length) break;
    const entries = await Promise.all(batch);
    if (!isActive()) return;
    onBatch(Object.fromEntries(entries));
  }
}
