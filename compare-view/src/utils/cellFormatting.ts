import type { CompareCellAttachment, CompareCellValue } from '../types/compare';

export const EMPTY_CELL_VALUE = '—';

export function makeCellKey(fieldId: string, recordId: string): string {
  return `${fieldId}::${recordId}`;
}

function getReadableObjectValue(value: Record<string, unknown>): string | null {
  const readableKeys = ['text', 'name', 'full_address', 'address', 'link'];

  for (const key of readableKeys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

/**
 * Normalizes values returned by the SDK's display API and its raw-value
 * fallback. It intentionally returns text only: Compare View never edits or
 * reconstructs native Bitable cell controls.
 */
export function normalizeDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return EMPTY_CELL_VALUE;
  }

  if (typeof value === 'string') {
    return value.trim() || EMPTY_CELL_VALUE;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map(normalizeDisplayValue)
      .filter((item) => item !== EMPTY_CELL_VALUE);

    return items.length ? items.join(', ') : EMPTY_CELL_VALUE;
  }

  if (typeof value === 'object') {
    const readable = getReadableObjectValue(value as Record<string, unknown>);
    if (readable) {
      return readable;
    }

    try {
      const serialized = JSON.stringify(value);
      return serialized && serialized !== '{}' ? serialized : EMPTY_CELL_VALUE;
    } catch {
      return EMPTY_CELL_VALUE;
    }
  }

  return EMPTY_CELL_VALUE;
}

export function makeTextCellValue(value: unknown): CompareCellValue {
  return {
    text: normalizeDisplayValue(value),
    attachments: [],
  };
}

export function makeAttachmentCellValue(
  attachments: CompareCellAttachment[]
): CompareCellValue {
  const safeAttachments = attachments.map(({ name, mimeType, thumbnailUrl }) => ({
    name,
    mimeType,
    thumbnailUrl,
  }));

  return {
    text:
      safeAttachments
        .map((attachment) => attachment.name.trim())
        .filter(Boolean)
        .join(', ') || EMPTY_CELL_VALUE,
    attachments: safeAttachments,
  };
}
