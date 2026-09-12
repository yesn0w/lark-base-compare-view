import type { CompareField } from '../types/compare';

/** Saved IDs lead; new fields follow in the adapter's order. */
export function orderFields(fields: CompareField[], orderIds: string[]): CompareField[] {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const ordered: CompareField[] = [];
  for (const id of orderIds) {
    const field = byId.get(id);
    if (field) { ordered.push(field); byId.delete(id); }
  }
  return [...ordered, ...byId.values()];
}

export function moveField(
  ids: string[], id: string, targetId: string, after = false
): string[] {
  if (id === targetId || !ids.includes(id) || !ids.includes(targetId)) return ids;
  const next = ids.filter((item) => item !== id);
  next.splice(next.indexOf(targetId) + (after ? 1 : 0), 0, id);
  return next;
}

export function retainExpandedFields(current: Set<string>, visibleIds: string[]): Set<string> {
  const allowed = new Set(visibleIds);
  const next = new Set([...current].filter((id) => allowed.has(id)));
  return next.size === current.size ? current : next;
}
