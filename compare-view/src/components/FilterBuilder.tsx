import { translate, type MessageKey } from '../i18n';
import type {
  CompareField,
  CompareViewConfig,
  FieldValueMap,
  FilterOperator,
  UiLocale,
} from '../types/compare';
import { createFilterRule } from '../utils/compareConfig';
import {
  getFilterOperators,
  getQueryFieldKind,
  getUniqueFilterValues,
} from '../utils/queryEngine';
import { FilterValuePicker } from './FilterValuePicker';

interface FilterBuilderProps {
  locale: UiLocale;
  fields: CompareField[];
  filters: CompareViewConfig['filters'];
  fieldValues: Record<string, FieldValueMap>;
  disabled?: boolean;
  onChange: (filters: CompareViewConfig['filters']) => void;
}

function hasValueControl(operator: CompareViewConfig['filters']['rules'][number]['operator']): boolean {
  return !['isEmpty', 'isNotEmpty', 'isChecked', 'isUnchecked'].includes(operator);
}

const operatorKeys: Record<FilterOperator, MessageKey> = {
  contains: 'filterOperatorContains',
  doesNotContain: 'filterOperatorDoesNotContain',
  is: 'filterOperatorIs',
  isNot: 'filterOperatorIsNot',
  isEmpty: 'filterOperatorIsEmpty',
  isNotEmpty: 'filterOperatorIsNotEmpty',
  isGreater: 'filterOperatorIsGreater',
  isGreaterEqual: 'filterOperatorIsGreaterEqual',
  isLess: 'filterOperatorIsLess',
  isLessEqual: 'filterOperatorIsLessEqual',
  isChecked: 'filterOperatorIsChecked',
  isUnchecked: 'filterOperatorIsUnchecked',
};

export function FilterBuilder({
  locale,
  fields,
  filters,
  fieldValues,
  disabled = false,
  onChange,
}: FilterBuilderProps) {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const fieldsById = new Map(fields.map((field) => [field.id, field]));

  const updateRule = (
    ruleId: string,
    updater: (rule: CompareViewConfig['filters']['rules'][number]) => CompareViewConfig['filters']['rules'][number]
  ) => {
    onChange({
      ...filters,
      rules: filters.rules.map((rule) => (rule.id === ruleId ? updater(rule) : rule)),
    });
  };

  const addRule = () => {
    const firstField = fields[0];
    if (!firstField) {
      return;
    }
    onChange({
      ...filters,
      rules: [
        ...filters.rules,
        { ...createFilterRule(firstField.id), operator: getFilterOperators(firstField)[0] },
      ],
    });
  };

  return (
    <section className="query-panel" aria-labelledby="filter-builder-title">
      <div className="query-panel__heading">
        <div>
          <h2 id="filter-builder-title">{t('filters')}</h2>
          <p>{t('filtersHint')}</p>
        </div>
        <button
          type="button"
          className="text-button"
          disabled={disabled || !fields.length || filters.rules.length >= 50}
          onClick={addRule}
        >
          {t('addFilter')}
        </button>
      </div>

      {filters.rules.length > 1 ? (
        <label className="query-conjunction">
          <span>{t('match')}</span>
          <select
            value={filters.conjunction}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...filters,
                conjunction: event.target.value as CompareViewConfig['filters']['conjunction'],
              })
            }
          >
            <option value="and">{t('allFilters')}</option>
            <option value="or">{t('anyFilter')}</option>
          </select>
        </label>
      ) : null}

      {filters.rules.length ? (
        <div className="query-rule-list">
          {filters.rules.map((rule) => {
            const field = fieldsById.get(rule.fieldId) ?? fields[0];
            if (!field) {
              return null;
            }
            const supportedOperators = getFilterOperators(field);
            const operator = supportedOperators.includes(rule.operator)
              ? rule.operator
              : supportedOperators[0];
            const kind = getQueryFieldKind(field);
            const choices =
              kind === 'choice' ? getUniqueFilterValues(field, fieldValues[field.id] ?? {}) : [];

            return (
              <div className="query-rule" key={rule.id}>
                <select
                  aria-label={t('filterField')}
                  value={field.id}
                  disabled={disabled}
                  onChange={(event) => {
                    const nextField = fieldsById.get(event.target.value);
                    if (!nextField) {
                      return;
                    }
                    updateRule(rule.id, (current) => ({
                      ...current,
                      fieldId: nextField.id,
                      operator: getFilterOperators(nextField)[0],
                      value: [],
                    }));
                  }}
                >
                  {fields.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t('filterOperator')}
                  value={operator}
                  disabled={disabled}
                  onChange={(event) =>
                    updateRule(rule.id, (current) => ({
                      ...current,
                      operator: event.target.value as typeof current.operator,
                      value: [],
                    }))
                  }
                >
                  {supportedOperators.map((item) => (
                    <option key={item} value={item}>
                      {t(operatorKeys[item])}
                    </option>
                  ))}
                </select>
                {hasValueControl(operator) ? (
                  kind === 'choice' ? (
                    <FilterValuePicker
                      locale={locale}
                      label={t('filterValue')}
                      options={choices}
                      value={rule.value}
                      disabled={disabled}
                      onChange={(value) =>
                        updateRule(rule.id, (current) => ({ ...current, operator, value }))
                      }
                    />
                  ) : (
                    <input
                      aria-label={t('filterValue')}
                      type={kind === 'date' ? 'date' : kind === 'number' ? 'number' : 'text'}
                      value={rule.value[0] ?? ''}
                      disabled={disabled}
                      onChange={(event) =>
                        updateRule(rule.id, (current) => ({
                          ...current,
                          operator,
                          value: event.target.value ? [event.target.value] : [],
                        }))
                      }
                    />
                  )
                ) : (
                  <span className="query-rule__no-value">{t('filterNoValue')}</span>
                )}
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t('removeFilter')}
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...filters,
                      rules: filters.rules.filter((item) => item.id !== rule.id),
                    })
                  }
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="query-panel__empty">{t('noFilters')}</p>
      )}
    </section>
  );
}
