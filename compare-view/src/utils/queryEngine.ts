import { FieldType } from '@lark-opdev/block-bitable-api';
import type {
  CompareContext,
  CompareField,
  CompareFilterRule,
  CompareRecord,
  CompareRecordGroup,
  CompareSortRule,
  FieldValueMap,
  FilterOperator,
} from '../types/compare';
import { EMPTY_CELL_VALUE, normalizeDisplayValue } from './cellFormatting';

export type QueryFieldKind = 'text' | 'number' | 'date' | 'checkbox' | 'choice';

interface ComparableValue {
  empty: boolean;
  textValues: string[];
  numberValue: number | null;
  dateValue: number | null;
  checkboxValue: boolean | null;
}

const textOperators: FilterOperator[] = [
  'contains',
  'doesNotContain',
  'is',
  'isNot',
  'isEmpty',
  'isNotEmpty',
];
const numericOperators: FilterOperator[] = [
  'is',
  'isNot',
  'isGreater',
  'isGreaterEqual',
  'isLess',
  'isLessEqual',
  'isEmpty',
  'isNotEmpty',
];
const checkboxOperators: FilterOperator[] = ['isChecked', 'isUnchecked'];

function collectTextValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectTextValues).filter(Boolean);
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const direct = ['text', 'name', 'full_address', 'address', 'link']
      .map((key) => objectValue[key])
      .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
    if (direct.length) {
      return direct.map((item) => item.trim());
    }
  }

  const normalized = normalizeDisplayValue(value);
  return normalized === EMPTY_CELL_VALUE ? [] : [normalized];
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseCheckbox(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === 0 || value === '0' || value === 'false') {
    return false;
  }

  return null;
}

function normalizeComparisonText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function parseDateValue(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(`${value}T00:00:00`);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeTimestamp(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  // The SDK may expose a timestamp in seconds for some field types.
  return Math.abs(value) < 100_000_000_000 ? value * 1000 : value;
}

export function getQueryFieldKind(field: CompareField): QueryFieldKind {
  switch (field.meta.type) {
    case FieldType.Number:
    case FieldType.AutoNumber:
    case FieldType.Progress:
    case FieldType.Currency:
    case FieldType.Rating:
      return 'number';
    case FieldType.DateTime:
    case FieldType.CreatedTime:
    case FieldType.ModifiedTime:
      return 'date';
    case FieldType.Checkbox:
      return 'checkbox';
    case FieldType.SingleSelect:
    case FieldType.MultiSelect:
      return 'choice';
    default:
      return 'text';
  }
}

export function getFilterOperators(field: CompareField): FilterOperator[] {
  switch (getQueryFieldKind(field)) {
    case 'number':
    case 'date':
      return numericOperators;
    case 'checkbox':
      return checkboxOperators;
    default:
      return textOperators;
  }
}

function toComparableValue(value: unknown, field: CompareField): ComparableValue {
  const textValues = collectTextValues(value);
  const kind = getQueryFieldKind(field);
  const numeric = parseNumber(value);

  return {
    empty: textValues.length === 0 && value !== false && value !== 0,
    textValues,
    numberValue: kind === 'number' ? numeric : null,
    dateValue: kind === 'date' ? normalizeTimestamp(numeric) : null,
    checkboxValue: kind === 'checkbox' ? parseCheckbox(value) : null,
  };
}

function matchesText(
  comparable: ComparableValue,
  operator: FilterOperator,
  values: string[]
): boolean {
  const expected = values.map(normalizeComparisonText).filter(Boolean);
  const actual = comparable.textValues.map(normalizeComparisonText);

  switch (operator) {
    case 'is':
      return expected.length > 0 && expected.every((item) => actual.includes(item));
    case 'isNot':
      return expected.length === 0 || expected.some((item) => !actual.includes(item));
    case 'contains':
      return expected.length > 0 && expected.every((item) => actual.some((text) => text.includes(item)));
    case 'doesNotContain':
      return expected.length === 0 || expected.every((item) => actual.every((text) => !text.includes(item)));
    default:
      return false;
  }
}

function matchesOrdered(
  actual: number | null,
  operator: FilterOperator,
  values: string[],
  parseValue: (value: string) => number | null
): boolean {
  const expected = parseValue(values[0] ?? '');
  if (actual === null || expected === null) {
    return false;
  }

  switch (operator) {
    case 'is':
      return actual === expected;
    case 'isNot':
      return actual !== expected;
    case 'isGreater':
      return actual > expected;
    case 'isGreaterEqual':
      return actual >= expected;
    case 'isLess':
      return actual < expected;
    case 'isLessEqual':
      return actual <= expected;
    default:
      return false;
  }
}

export function matchesFilterRule(
  recordId: string,
  rule: CompareFilterRule,
  fieldsById: Map<string, CompareField>,
  valuesByField: Record<string, FieldValueMap>
): boolean {
  const field = fieldsById.get(rule.fieldId);
  if (!field) {
    return true;
  }

  const comparable = toComparableValue(valuesByField[field.id]?.[recordId], field);
  if (rule.operator === 'isEmpty') {
    return comparable.empty;
  }
  if (rule.operator === 'isNotEmpty') {
    return !comparable.empty;
  }
  if (rule.operator === 'isChecked') {
    return comparable.checkboxValue === true;
  }
  if (rule.operator === 'isUnchecked') {
    return comparable.checkboxValue === false;
  }
  if (!rule.value.some((value) => value.trim())) {
    return true;
  }

  switch (getQueryFieldKind(field)) {
    case 'number':
      return matchesOrdered(comparable.numberValue, rule.operator, rule.value, (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      });
    case 'date':
      return matchesOrdered(comparable.dateValue, rule.operator, rule.value, parseDateValue);
    default:
      return matchesText(comparable, rule.operator, rule.value);
  }
}

export function filterRecords(
  records: CompareRecord[],
  context: CompareContext,
  rules: CompareFilterRule[],
  conjunction: 'and' | 'or',
  valuesByField: Record<string, FieldValueMap>
): CompareRecord[] {
  if (!rules.length) {
    return records;
  }

  const fieldsById = new Map(context.fields.map((field) => [field.id, field]));
  return records.filter((record) => {
    const results = rules.map((rule) =>
      matchesFilterRule(record.id, rule, fieldsById, valuesByField)
    );
    return conjunction === 'and' ? results.every(Boolean) : results.some(Boolean);
  });
}

function compareNullable(
  first: string | number | null,
  second: string | number | null,
  collator: Intl.Collator
): number {
  if (first === null && second === null) {
    return 0;
  }
  if (first === null) {
    return 1;
  }
  if (second === null) {
    return -1;
  }
  if (typeof first === 'number' && typeof second === 'number') {
    return first - second;
  }
  return collator.compare(String(first), String(second));
}

function getSortValue(
  recordId: string,
  field: CompareField,
  valuesByField: Record<string, FieldValueMap>
): string | number | null {
  const value = toComparableValue(valuesByField[field.id]?.[recordId], field);
  switch (getQueryFieldKind(field)) {
    case 'number':
      return value.numberValue;
    case 'date':
      return value.dateValue;
    case 'checkbox':
      return value.checkboxValue === null ? null : Number(value.checkboxValue);
    default:
      return value.textValues[0] ?? null;
  }
}

export function sortRecords(
  records: CompareRecord[],
  fields: CompareField[],
  sortRules: CompareSortRule[],
  valuesByField: Record<string, FieldValueMap>,
  locale: string
): CompareRecord[] {
  if (!sortRules.length) {
    return records;
  }

  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  const withIndex = records.map((record, index) => ({ record, index }));

  withIndex.sort((first, second) => {
    for (const rule of sortRules) {
      const field = fieldsById.get(rule.fieldId);
      if (!field) {
        continue;
      }

      const firstValue = getSortValue(first.record.id, field, valuesByField);
      const secondValue = getSortValue(second.record.id, field, valuesByField);
      const compared = compareNullable(firstValue, secondValue, collator);
      if (compared !== 0) {
        const hasEmptyValue = firstValue === null || secondValue === null;
        return hasEmptyValue || rule.direction === 'asc' ? compared : -compared;
      }
    }

    return first.index - second.index;
  });

  return withIndex.map(({ record }) => record);
}

export function mergeSelectedOrderIntoCandidates(
  candidates: CompareRecord[],
  selectedRecordIds: string[]
): CompareRecord[] {
  const selectedSet = new Set(selectedRecordIds);
  const candidateIds = new Set(candidates.map((record) => record.id));
  const orderedSelected = selectedRecordIds.filter((id) => candidateIds.has(id));
  const recordsById = new Map(candidates.map((record) => [record.id, record]));
  let selectedIndex = 0;

  return candidates.map((record) => {
    if (!selectedSet.has(record.id)) {
      return record;
    }

    const replacement = recordsById.get(orderedSelected[selectedIndex]);
    selectedIndex += 1;
    return replacement ?? record;
  });
}

export function groupRecords(
  records: CompareRecord[],
  fields: CompareField[],
  groupFieldId: string | null,
  valuesByField: Record<string, FieldValueMap>
): CompareRecordGroup[] {
  if (!groupFieldId) {
    return [{ key: 'all-records', label: '', records }];
  }

  const field = fields.find((item) => item.id === groupFieldId);
  if (!field) {
    return [{ key: 'all-records', label: '', records }];
  }

  const groups = new Map<string, CompareRecordGroup>();
  records.forEach((record) => {
    // For multi-value fields, use the first value so a selected record is never
    // duplicated into more than one comparison column.
    const value = toComparableValue(valuesByField[field.id]?.[record.id], field);
    const label = value.textValues[0] ?? EMPTY_CELL_VALUE;
    const key = label === EMPTY_CELL_VALUE ? 'empty-group' : `group:${normalizeComparisonText(label)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.records.push(record);
    } else {
      groups.set(key, { key, label, records: [record] });
    }
  });

  return [...groups.values()];
}

export function getUniqueFilterValues(
  field: CompareField,
  values: FieldValueMap
): string[] {
  const valuesSet = new Set<string>();
  Object.values(values).forEach((value) => {
    toComparableValue(value, field).textValues.forEach((item) => valuesSet.add(item));
  });

  return [...valuesSet].sort((first, second) =>
    new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare(first, second)
  );
}
