import type { CellValueMap, CompareCellValue } from '../types/compare';
import { EMPTY_CELL_VALUE, makeCellKey } from './cellFormatting';

/**
 * Non-wrapped text beyond this threshold gets an inline row expansion action.
 */
const LONG_VALUE_LENGTH = 36;

export function readCellValue(
  values: CellValueMap,
  fieldId: string,
  recordId: string
): CompareCellValue {
  return (
    values[makeCellKey(fieldId, recordId)] ?? {
      text: EMPTY_CELL_VALUE,
      attachments: [],
    }
  );
}

/** Missing values are still loading, not empty business cells. */
export function isFieldLoaded(values: CellValueMap, fieldId: string, recordIds: string[]): boolean {
  return recordIds.every((recordId) => Boolean(values[makeCellKey(fieldId, recordId)]));
}

/**
 * A field counts as differing when the compared records do not all share the
 * same displayed value. A single record can never differ from itself.
 */
export function fieldHasDifference(
  values: CellValueMap,
  fieldId: string,
  recordIds: string[]
): boolean {
  if (recordIds.length < 2 || !isFieldLoaded(values, fieldId, recordIds)) {
    return false;
  }

  const first = readCellValue(values, fieldId, recordIds[0]).text;
  return recordIds.some((recordId) => readCellValue(values, fieldId, recordId).text !== first);
}

export function isLongCellValue(value: string): boolean {
  return value.length > LONG_VALUE_LENGTH || value.includes('\n');
}
