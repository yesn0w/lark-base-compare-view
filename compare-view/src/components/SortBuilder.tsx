import { translate } from '../i18n';
import type { CompareField, CompareSortRule, UiLocale } from '../types/compare';
import { createSortRule } from '../utils/compareConfig';

interface SortBuilderProps {
  locale: UiLocale;
  fields: CompareField[];
  sortRules: CompareSortRule[];
  disabled?: boolean;
  onChange: (sortRules: CompareSortRule[]) => void;
}

function moveSortRule(
  sortRules: CompareSortRule[],
  index: number,
  direction: -1 | 1
): CompareSortRule[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= sortRules.length) {
    return sortRules;
  }

  const next = [...sortRules];
  const [rule] = next.splice(index, 1);
  next.splice(nextIndex, 0, rule);
  return next;
}

export function SortBuilder({
  locale,
  fields,
  sortRules,
  disabled = false,
  onChange,
}: SortBuilderProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const usedFieldIds = new Set(sortRules.map((rule) => rule.fieldId));
  const addableField = fields.find((field) => !usedFieldIds.has(field.id));

  const updateRule = (ruleId: string, updater: (rule: CompareSortRule) => CompareSortRule) => {
    onChange(sortRules.map((rule) => (rule.id === ruleId ? updater(rule) : rule)));
  };

  return (
    <section className="query-panel" aria-labelledby="sort-builder-title">
      <div className="query-panel__heading">
        <div>
          <h2 id="sort-builder-title">{t('sort')}</h2>
          <p>{t('sortHint')}</p>
        </div>
        <button
          type="button"
          className="text-button"
          disabled={disabled || !addableField}
          onClick={() => addableField && onChange([...sortRules, createSortRule(addableField.id)])}
        >
          {t('addSort')}
        </button>
      </div>

      {sortRules.length ? (
        <ol className="sort-rule-list">
          {sortRules.map((rule, index) => (
            <li className="sort-rule" key={rule.id}>
              <select
                aria-label={t('sortField')}
                value={rule.fieldId}
                disabled={disabled}
                onChange={(event) =>
                  updateRule(rule.id, (current) => ({ ...current, fieldId: event.target.value }))
                }
              >
                {fields
                  .filter((field) => field.id === rule.fieldId || !usedFieldIds.has(field.id))
                  .map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
              </select>
              <select
                aria-label={t('sortDirection')}
                value={rule.direction}
                disabled={disabled}
                onChange={(event) =>
                  updateRule(rule.id, (current) => ({
                    ...current,
                    direction: event.target.value as CompareSortRule['direction'],
                  }))
                }
              >
                <option value="asc">{t('ascending')}</option>
                <option value="desc">{t('descending')}</option>
              </select>
              <div className="sort-rule__actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t('moveUp')}
                  disabled={disabled || index === 0}
                  onClick={() => onChange(moveSortRule(sortRules, index, -1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t('moveDown')}
                  disabled={disabled || index === sortRules.length - 1}
                  onClick={() => onChange(moveSortRule(sortRules, index, 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t('removeSort')}
                  disabled={disabled}
                  onClick={() => onChange(sortRules.filter((item) => item.id !== rule.id))}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="query-panel__empty">{t('noSort')}</p>
      )}
    </section>
  );
}
