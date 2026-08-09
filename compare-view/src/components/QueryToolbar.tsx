import { useEffect, useRef, useState } from 'react';
import { translate } from '../i18n';
import type {
  CompareField,
  CompareViewConfig,
  FieldValueMap,
  UiLocale,
} from '../types/compare';
import { FieldSelector } from './FieldSelector';
import { FilterBuilder } from './FilterBuilder';
import { GroupSelector } from './GroupSelector';
import { SortBuilder } from './SortBuilder';

type QueryPanel = 'field' | 'filter' | 'group' | 'sort' | null;

interface QueryToolbarProps {
  locale: UiLocale;
  fields: CompareField[];
  filters: CompareViewConfig['filters'];
  sortRules: CompareViewConfig['sortRules'];
  groupFieldId: string | null;
  hiddenFieldIds: Set<string>;
  fieldValues: Record<string, FieldValueMap>;
  disabled?: boolean;
  onFiltersChange: (filters: CompareViewConfig['filters']) => void;
  onSortRulesChange: (sortRules: CompareViewConfig['sortRules']) => void;
  onGroupFieldChange: (groupFieldId: string | null) => void;
  onToggleField: (fieldId: string) => void;
  onShowAllFields: () => void;
  onHideAllFields: () => void;
}

function QueryGlyph({ type }: { type: Exclude<QueryPanel, null> }) {
  if (type === 'field') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M8 3.1c3.12 0 5.42 2.18 6.45 4.9C13.42 10.72 11.12 12.9 8 12.9S2.58 10.72 1.55 8C2.58 5.28 4.88 3.1 8 3.1Zm0 1.25A3.65 3.65 0 1 0 8 11.65 3.65 3.65 0 0 0 8 4.35Zm0 1.55A2.1 2.1 0 1 1 8 10.1 2.1 2.1 0 0 1 8 5.9Z" />
      </svg>
    );
  }

  if (type === 'filter') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M2.25 3.25h11.5L9.3 8.14v3.38l-2.6 1.23V8.14L2.25 3.25Z" />
      </svg>
    );
  }

  if (type === 'group') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M2.5 3.25h3v3h-3v-3Zm4 0h7v3h-7v-3Zm-4 6.5h3v3h-3v-3Zm4 0h7v3h-7v-3Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M5.2 2.25 2.45 5l2.75 2.75.88-.88-1.25-1.25h7.92V4.38H4.83l1.25-1.25-.88-.88Zm5.6 6-.88.88 1.25 1.25H3.25v1.24h7.92L9.92 12.87l.88.88L13.55 11 10.8 8.25Z" />
    </svg>
  );
}

export function QueryToolbar({
  locale,
  fields,
  filters,
  sortRules,
  groupFieldId,
  hiddenFieldIds,
  fieldValues,
  disabled = false,
  onFiltersChange,
  onSortRulesChange,
  onGroupFieldChange,
  onToggleField,
  onShowAllFields,
  onHideAllFields,
}: QueryToolbarProps) {
  const [openPanel, setOpenPanel] = useState<QueryPanel>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const groupField = fields.find((field) => field.id === groupFieldId) ?? null;

  useEffect(() => {
    if (!openPanel || typeof document === 'undefined') {
      return () => undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !toolbarRef.current?.contains(event.target)) {
        setOpenPanel(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPanel(null);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openPanel]);

  const togglePanel = (panel: Exclude<QueryPanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  return (
    <div className="query-toolbar-stage" ref={toolbarRef}>
      <div className="query-toolbar" role="toolbar" aria-label={t('filters')}>
        <button
          type="button"
          className={`query-toolbar__button${filters.rules.length ? ' query-toolbar__button--active' : ''}${
            openPanel === 'filter' ? ' query-toolbar__button--open' : ''
          }`}
          aria-expanded={openPanel === 'filter'}
          aria-controls="query-popover-filter"
          disabled={disabled}
          onClick={() => togglePanel('filter')}
        >
          <QueryGlyph type="filter" />
          <span>{t('filters')}</span>
          {filters.rules.length ? <small>{filters.rules.length}</small> : null}
        </button>
        <button
          type="button"
          className={`query-toolbar__button${groupField ? ' query-toolbar__button--active' : ''}${
            openPanel === 'group' ? ' query-toolbar__button--open' : ''
          }`}
          aria-expanded={openPanel === 'group'}
          aria-controls="query-popover-group"
          disabled={disabled}
          onClick={() => togglePanel('group')}
        >
          <QueryGlyph type="group" />
          <span>{t('group')}</span>
          {groupField ? <small title={groupField.name}>{groupField.name}</small> : null}
        </button>
        <button
          type="button"
          className={`query-toolbar__button${sortRules.length ? ' query-toolbar__button--active' : ''}${
            openPanel === 'sort' ? ' query-toolbar__button--open' : ''
          }`}
          aria-expanded={openPanel === 'sort'}
          aria-controls="query-popover-sort"
          disabled={disabled}
          onClick={() => togglePanel('sort')}
        >
          <QueryGlyph type="sort" />
          <span>{t('sort')}</span>
          {sortRules.length ? <small>{sortRules.length}</small> : null}
        </button>
        <button
          type="button"
          className={`query-toolbar__button${
            hiddenFieldIds.size ? ' query-toolbar__button--active' : ''
          }${openPanel === 'field' ? ' query-toolbar__button--open' : ''}`}
          aria-expanded={openPanel === 'field'}
          aria-controls="query-popover-field"
          disabled={disabled}
          onClick={() => togglePanel('field')}
        >
          <QueryGlyph type="field" />
          <span>{t('hideFields')}</span>
          {hiddenFieldIds.size ? <small>{hiddenFieldIds.size}</small> : null}
        </button>
      </div>

      {openPanel ? (
        <div
          id={`query-popover-${openPanel}`}
          className="query-popover"
          role="dialog"
          aria-label={
            openPanel === 'field'
              ? t('hideFields')
              : openPanel === 'filter'
                ? t('filters')
                : openPanel === 'group'
                  ? t('group')
                  : t('sort')
          }
        >
          {openPanel === 'field' ? (
            <FieldSelector
              locale={locale}
              fields={fields}
              hiddenFieldIds={hiddenFieldIds}
              disabled={disabled}
              onToggle={onToggleField}
              onShowAll={onShowAllFields}
              onHideAll={onHideAllFields}
            />
          ) : null}
          {openPanel === 'filter' ? (
            <FilterBuilder
              locale={locale}
              fields={fields}
              filters={filters}
              fieldValues={fieldValues}
              disabled={disabled}
              onChange={onFiltersChange}
            />
          ) : null}
          {openPanel === 'group' ? (
            <GroupSelector
              locale={locale}
              fields={fields}
              groupFieldId={groupFieldId}
              disabled={disabled}
              onChange={onGroupFieldChange}
            />
          ) : null}
          {openPanel === 'sort' ? (
            <SortBuilder
              locale={locale}
              fields={fields}
              sortRules={sortRules}
              disabled={disabled}
              onChange={onSortRulesChange}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
