import type { CellValueMap, CompareCellValue } from '../types/compare';
import { EMPTY_CELL_VALUE, makeCellKey } from './cellFormatting';

/**
 * Grid cells render on a single line, so anything longer than this is assumed
 * to be clipped and gets an inline expand action. Compare View is read-only,
 * so the expand dialog is the only way to read such a value in full.
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

/**
 * A field counts as differing when the compared records do not all share the
 * same displayed value. A single record can never differ from itself.
 */
export function fieldHasDifference(
  values: CellValueMap,
  fieldId: string,
  recordIds: string[]
): boolean {
  if (recordIds.length < 2) {
    return false;
  }

  const first = readCellValue(values, fieldId, recordIds[0]).text;
  return recordIds.some((recordId) => readCellValue(values, fieldId, recordId).text !== first);
}

export function isLongCellValue(value: string): boolean {
  return value.length > LONG_VALUE_LENGTH || value.includes('\n');
}
