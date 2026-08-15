import type { MessageKey } from '../i18n';

/** The four densities offered by the toolbar's row-height menu, in order. */
export const ROW_HEIGHTS = [32, 40, 56, 88] as const;

export type RowHeight = (typeof ROW_HEIGHTS)[number];

export const DEFAULT_ROW_HEIGHT: RowHeight = 32;

export const ROW_HEIGHT_LABEL_KEYS: Record<RowHeight, MessageKey> = {
  32: 'rowHeightShort',
  40: 'rowHeightMedium',
  56: 'rowHeightTall',
  88: 'rowHeightExtraTall',
};

/** Row height is a per-session view preference and is never persisted. */
export function isRowHeight(value: number): value is RowHeight {
  return (ROW_HEIGHTS as readonly number[]).includes(value);
}
