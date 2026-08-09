import type {
  CompareContext,
  CompareFilterRule,
  CompareSortRule,
  CompareViewConfig,
  FilterConjunction,
  FilterOperator,
} from '../types/compare';
import { MAX_COMPARE_RECORDS } from './compareState';

const CONFIG_KEY = 'compareViewConfig';
const FILTER_OPERATORS: FilterOperator[] = [
  'contains',
  'doesNotContain',
  'is',
  'isNot',
  'isEmpty',
  'isNotEmpty',
  'isGreater',
  'isGreaterEqual',
  'isLess',
  'isLessEqual',
  'isChecked',
  'isUnchecked',
];

let generatedId = 0;

export function makeConfigId(prefix: string): string {
  generatedId += 1;
  return `${prefix}-${Date.now().toString(36)}-${generatedId.toString(36)}`;
}

export function createFilterRule(fieldId: string): CompareFilterRule {
  return {
    id: makeConfigId('filter'),
    fieldId,
    operator: 'contains',
    value: [],
  };
}

export function createSortRule(fieldId: string): CompareSortRule {
  return {
    id: makeConfigId('sort'),
    fieldId,
    direction: 'asc',
  };
}

export function createDefaultCompareConfig(context: CompareContext): CompareViewConfig {
  return {
    schemaVersion: 1,
    tableId: context.tableId,
    viewId: context.viewId,
    selectedRecordIds: [],
    hiddenFieldIds: context.primaryFieldId ? [context.primaryFieldId] : [],
    filters: {
      conjunction: 'and',
      rules: [],
    },
    sortRules: [],
    groupFieldId: null,
  };
}

export function cloneCompareConfig(config: CompareViewConfig): CompareViewConfig {
  return {
    ...config,
    selectedRecordIds: [...config.selectedRecordIds],
    hiddenFieldIds: [...config.hiddenFieldIds],
    filters: {
      conjunction: config.filters.conjunction,
      rules: config.filters.rules.map((rule) => ({ ...rule, value: [...rule.value] })),
    },
    sortRules: config.sortRules.map((rule) => ({ ...rule })),
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFilterConjunction(value: unknown): value is FilterConjunction {
  return value === 'and' || value === 'or';
}

function isFilterOperator(value: unknown): value is FilterOperator {
  return typeof value === 'string' && FILTER_OPERATORS.includes(value as FilterOperator);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function getConfigCandidate(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const candidate = data as Record<string, unknown>;
  return candidate[CONFIG_KEY] ?? candidate;
}

/**
 * Reject malformed bridge data and strip IDs that no longer exist in the
 * active table/view. This keeps a stale shared configuration harmless.
 */
export function readCompareConfig(
  data: unknown,
  context: CompareContext
): CompareViewConfig | null {
  const candidate = getConfigCandidate(data);
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const value = candidate as Record<string, unknown>;
  if (
    value.schemaVersion !== 1 ||
    value.tableId !== context.tableId ||
    value.viewId !== context.viewId
  ) {
    return null;
  }

  const fieldIds = new Set(context.fields.map((field) => field.id));
  const recordIds = new Set(context.records.map((record) => record.id));
  const selectedRecordIds = isStringArray(value.selectedRecordIds)
    ? unique(value.selectedRecordIds.filter((id) => recordIds.has(id))).slice(
        0,
        MAX_COMPARE_RECORDS
      )
    : [];
  const hiddenFieldIds = isStringArray(value.hiddenFieldIds)
    ? unique(value.hiddenFieldIds.filter((id) => fieldIds.has(id)))
    : context.primaryFieldId
      ? [context.primaryFieldId]
      : [];
  const filtersValue = value.filters;
  const filtersRecord =
    filtersValue && typeof filtersValue === 'object'
      ? (filtersValue as Record<string, unknown>)
      : null;
  const rawConjunction = filtersRecord?.conjunction;
  const rawFilterRules = filtersRecord?.rules;
  const conjunction = isFilterConjunction(rawConjunction)
    ? rawConjunction
    : 'and';
  const rules: CompareFilterRule[] = Array.isArray(rawFilterRules)
    ? rawFilterRules
        .filter((rule): rule is Record<string, unknown> => Boolean(rule) && typeof rule === 'object')
        .flatMap((rule) => {
          if (
            typeof rule.id !== 'string' ||
            typeof rule.fieldId !== 'string' ||
            !fieldIds.has(rule.fieldId) ||
            !isFilterOperator(rule.operator)
          ) {
            return [];
          }

          return [
            {
              id: rule.id,
              fieldId: rule.fieldId,
              operator: rule.operator,
              value: isStringArray(rule.value) ? rule.value : [],
            },
          ];
        })
        .slice(0, 50)
    : [];
  const sortRules: CompareSortRule[] = Array.isArray(value.sortRules)
    ? value.sortRules
        .filter((rule): rule is Record<string, unknown> => Boolean(rule) && typeof rule === 'object')
        .flatMap((rule) => {
          if (
            typeof rule.id !== 'string' ||
            typeof rule.fieldId !== 'string' ||
            !fieldIds.has(rule.fieldId) ||
            (rule.direction !== 'asc' && rule.direction !== 'desc')
          ) {
            return [];
          }

          return [
            {
              id: rule.id,
              fieldId: rule.fieldId,
              direction: rule.direction as CompareSortRule['direction'],
            },
          ];
        })
    : [];
  const groupFieldId =
    typeof value.groupFieldId === 'string' && fieldIds.has(value.groupFieldId)
      ? value.groupFieldId
      : null;

  return {
    schemaVersion: 1,
    tableId: context.tableId,
    viewId: context.viewId,
    selectedRecordIds,
    hiddenFieldIds,
    filters: { conjunction, rules },
    sortRules,
    groupFieldId,
  };
}

export function makePersistedConfig(config: CompareViewConfig): Record<string, unknown> {
  return {
    [CONFIG_KEY]: cloneCompareConfig(config),
  };
}

export function compareConfigs(
  first: CompareViewConfig | null,
  second: CompareViewConfig | null
): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}
