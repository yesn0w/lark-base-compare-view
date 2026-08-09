import type { IFieldMeta } from '@lark-opdev/block-bitable-api';

export type UiLocale = 'zh-CN' | 'en-US';

export interface CompareField {
  id: string;
  name: string;
  meta: IFieldMeta;
  isPrimary: boolean;
}

export interface CompareRecord {
  id: string;
  title: string;
}

export interface CompareContext {
  tableId: string;
  viewId: string | null;
  tableName: string;
  primaryFieldId: string | null;
  fields: CompareField[];
  records: CompareRecord[];
}

export interface CompareViewState {
  selectedRecordIds: string[];
  hiddenFieldIds: string[];
  locale: UiLocale;
}

export type CellValueMap = Record<string, string>;
