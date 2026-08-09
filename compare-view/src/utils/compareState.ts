export const MIN_COMPARE_RECORDS = 1;
export const MAX_COMPARE_RECORDS = 10;

/**
 * Reorders a selected record from a drag-and-drop target in the unified
 * candidate list. Candidates that do not match the current filter are kept
 * in their relative positions in the comparison order.
 */
export function moveSelectedRecordToCandidatePosition(
  selectedRecordIds: string[],
  candidateRecordIds: string[],
  recordId: string,
  targetRecordId: string
): string[] {
  if (
    recordId === targetRecordId ||
    !selectedRecordIds.includes(recordId) ||
    !candidateRecordIds.includes(recordId) ||
    !candidateRecordIds.includes(targetRecordId)
  ) {
    return selectedRecordIds;
  }

  const candidateIdSet = new Set(candidateRecordIds);
  const activeSelectedIds = selectedRecordIds.filter((id) => candidateIdSet.has(id));
  const currentIndex = activeSelectedIds.indexOf(recordId);
  if (currentIndex === -1) {
    return selectedRecordIds;
  }

  const nextActiveIds = activeSelectedIds.filter((id) => id !== recordId);
  const selectedIdSet = new Set(selectedRecordIds);
  const draggedCandidateIndex = candidateRecordIds.indexOf(recordId);
  const targetIndex = candidateRecordIds.indexOf(targetRecordId);
  const selectedBeforeTarget = candidateRecordIds
    .slice(0, targetIndex)
    .filter((id) => selectedIdSet.has(id)).length;
  const insertionIndex = selectedIdSet.has(targetRecordId)
    ? candidateRecordIds
        .slice(0, targetIndex)
        .filter((id) => id !== recordId && nextActiveIds.includes(id)).length
    : targetIndex > draggedCandidateIndex
      ? selectedBeforeTarget
      : Math.max(0, selectedBeforeTarget - 1);
  nextActiveIds.splice(Math.min(insertionIndex, nextActiveIds.length), 0, recordId);

  let activeIndex = 0;
  const next = selectedRecordIds.map((id) => {
    if (!candidateIdSet.has(id)) {
      return id;
    }

    const replacement = nextActiveIds[activeIndex];
    activeIndex += 1;
    return replacement;
  });

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
