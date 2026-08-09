export const MIN_COMPARE_RECORDS = 1;
export const MAX_COMPARE_RECORDS = 10;

export function moveRecordId(
  recordIds: string[],
  recordId: string,
  direction: -1 | 1
): string[] {
  const currentIndex = recordIds.indexOf(recordId);
  const nextIndex = currentIndex + direction;

  if (
    currentIndex === -1 ||
    nextIndex < 0 ||
    nextIndex >= recordIds.length
  ) {
    return recordIds;
  }

  const next = [...recordIds];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(nextIndex, 0, moved);
  return next;
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
