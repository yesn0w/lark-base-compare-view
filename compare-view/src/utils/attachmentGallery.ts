import type { CellValueMap, CompareCellAttachment } from '../types/compare';
import { makeCellKey } from './cellFormatting';

export const imageAttachments = (attachments: CompareCellAttachment[]) => attachments.filter(file => file.mimeType.toLowerCase().startsWith('image/'));
export const attachmentSignature = (attachments: CompareCellAttachment[]) => JSON.stringify(attachments);
export const clampImageIndex = (index: number, count: number) => Math.max(0, Math.min(index, Math.max(0, count - 1)));
export type ImagePositions = Record<string, { signature: string; index: number }>;
export function imageIndex(positions: ImagePositions, key: string, attachments: CompareCellAttachment[]) {
  const position = positions[key];
  return position?.signature === attachmentSignature(attachments) ? clampImageIndex(position.index, imageAttachments(attachments).length) : 0;
}
export function retainImagePositions(positions: ImagePositions, fieldIds: string[], recordIds: string[], values: CellValueMap): ImagePositions {
  const fields = new Set(fieldIds), records = new Set(recordIds);
  const next = Object.fromEntries(Object.entries(positions).filter(([key, position]) => {
    const [field, record] = key.split('::');
    return fields.has(field) && records.has(record) && (!values[makeCellKey(field, record)] || position.signature === attachmentSignature(values[key].attachments));
  }));
  return Object.keys(next).length === Object.keys(positions).length ? positions : next;
}
