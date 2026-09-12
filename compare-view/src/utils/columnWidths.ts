import type { CompareViewConfig } from '../types/compare';

export const FIELD_WIDTH = { default: 200, min: 140, max: 420 };
export const RECORD_WIDTH = { default: 220, min: 160, max: 800 };
export type ColumnId = string | null; // null identifies the field-name column.
export type WidthSettings = Pick<CompareViewConfig, 'fieldColumnWidth' | 'recordColumnWidths'>;

export function normalizeWidth(value: unknown, record: boolean): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const range = record ? RECORD_WIDTH : FIELD_WIDTH;
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

export function readRecordWidths(raw: unknown, recordIds: Set<string>): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .flatMap(([id, value]) => {
      const width = normalizeWidth(value, true);
      return recordIds.has(id) && width !== null ? [[id, width]] : [];
    }));
}

export function columnWidth(settings: WidthSettings, id: ColumnId): number {
  return id === null ? settings.fieldColumnWidth ?? FIELD_WIDTH.default
    : settings.recordColumnWidths[id] ?? RECORD_WIDTH.default;
}

export function withWidths<T extends WidthSettings>(config: T, widths: WidthSettings): T {
  return { ...config, fieldColumnWidth: widths.fieldColumnWidth, recordColumnWidths: { ...widths.recordColumnWidths } };
}

export function patchWidths<T extends WidthSettings>(config: T, patch: ReadonlyMap<ColumnId, number | null>): T {
  const next = withWidths(config, config);
  for (const [id, width] of patch) {
    if (id === null) next.fieldColumnWidth = width;
    else if (width === null) delete next.recordColumnWidths[id];
    else Object.defineProperty(next.recordColumnWidths, id, { value: width, enumerable: true, configurable: true, writable: true });
  }
  next.recordColumnWidths = readRecordWidths(next.recordColumnWidths, new Set(Object.keys(next.recordColumnWidths)));
  return next;
}
