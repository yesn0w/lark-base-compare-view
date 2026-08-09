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

export type FilterConjunction = 'and' | 'or';

export type FilterOperator =
  | 'contains'
  | 'doesNotContain'
  | 'is'
  | 'isNot'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isGreater'
  | 'isGreaterEqual'
  | 'isLess'
  | 'isLessEqual'
  | 'isChecked'
  | 'isUnchecked';

export interface CompareFilterRule {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: string[];
}

export interface CompareSortRule {
  id: string;
  fieldId: string;
  direction: 'asc' | 'desc';
}

/**
 * The only data this extension persists. It is stored through the official
 * bridge data API, not in business records, fields, or native view settings.
 */
export interface CompareViewConfig {
  schemaVersion: 1;
  tableId: string;
  viewId: string | null;
  selectedRecordIds: string[];
  hiddenFieldIds: string[];
  filters: {
    conjunction: FilterConjunction;
    rules: CompareFilterRule[];
  };
  sortRules: CompareSortRule[];
  groupFieldId: string | null;
}

export type CellValueMap = Record<string, string>;
export type FieldValueMap = Record<string, unknown>;

export interface CompareRecordGroup {
  key: string;
  label: string;
  records: CompareRecord[];
}
