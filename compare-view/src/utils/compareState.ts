export const MIN_COMPARE_RECORDS = 1;

/**
 * Reorders a selected record directly against another selected record, which is
 * how the comparison grid's column handles work.
 */
export function moveSelectedRecordBefore(
  selectedRecordIds: string[],
  recordId: string,
  targetRecordId: string
): string[] {
  if (
    recordId === targetRecordId ||
    !selectedRecordIds.includes(recordId) ||
    !selectedRecordIds.includes(targetRecordId)
  ) {
    return selectedRecordIds;
  }

  const next = selectedRecordIds.filter((id) => id !== recordId);
  next.splice(next.indexOf(targetRecordId), 0, recordId);
  return next;
}

/** Resets manual selection order to the current query ordering. */
export function orderSelectedRecordIdsByRecords(
  selectedRecordIds: string[],
  orderedRecordIds: string[]
): string[] {
  const selectedIdSet = new Set(selectedRecordIds);
  const orderedIdSet = new Set(orderedRecordIds);
  return [
    ...orderedRecordIds.filter((recordId) => selectedIdSet.has(recordId)),
    ...selectedRecordIds.filter((recordId) => !orderedIdSet.has(recordId)),
  ];
}

export function toggleId(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  return next;
}
