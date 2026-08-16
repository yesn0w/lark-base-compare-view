import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { translate } from '../i18n';
import type {
  CompareField,
  CompareViewConfig,
  FieldValueMap,
  UiLocale,
} from '../types/compare';
import { ROW_HEIGHTS, ROW_HEIGHT_LABEL_KEYS, type RowHeight } from '../utils/rowHeight';
import { FieldSelector } from './FieldSelector';
import { FilterBuilder } from './FilterBuilder';
import { GroupSelector } from './GroupSelector';
import { SortBuilder } from './SortBuilder';

export type QueryPanel = 'records' | 'field' | 'filter' | 'group' | 'sort' | 'rowHeight' | null;

interface QueryToolbarProps {
  locale: UiLocale;
  fields: CompareField[];
  filters: CompareViewConfig['filters'];
  sortRules: CompareViewConfig['sortRules'];
  groupFieldId: string | null;
  hiddenFieldIds: Set<string>;
  fieldValues: Record<string, FieldValueMap>;
  selectedRecordCount: number;
  rowHeight: RowHeight;
  openPanel: QueryPanel;
  /** A loaded configuration can be inspected even when it cannot be edited. */
  ready: boolean;
  disabled?: boolean;
  /** Rendered inside the records popover so App keeps owning the draft wiring. */
  recordsPanel: ReactNode;
  /** Save state and the discard/reset/save controls, which live on config state. */
  actions: ReactNode;
  onOpenPanelChange: (panel: QueryPanel) => void;
  onRowHeightChange: (rowHeight: RowHeight) => void;
  onFiltersChange: (filters: CompareViewConfig['filters']) => void;
  onSortRulesChange: (sortRules: CompareViewConfig['sortRules']) => void;
  onGroupFieldChange: (groupFieldId: string | null) => void;
  onToggleField: (fieldId: string) => void;
  onShowAllFields: () => void;
  onHideAllFields: () => void;
}

const GLYPH_PATHS = {
  records:
    'M2.6 2.4h4.1c.33 0 .6.27.6.6v10c0 .33-.27.6-.6.6H2.6a.6.6 0 0 1-.6-.6V3c0-.33.27-.6.6-.6Zm.65 1.25v8.7h2.8v-8.7h-2.8Zm6.05-1.25h4.1c.33 0 .6.27.6.6v10c0 .33-.27.6-.6.6H9.3a.6.6 0 0 1-.6-.6V3c0-.33.27-.6.6-.6Zm.65 1.25v8.7h2.8v-8.7h-2.8Z',
  field: 'M2.4 3.6h11.2v1.25H2.4V3.6Zm0 3.75h11.2V8.6H2.4V7.35Zm0 3.75h7.1v1.25H2.4V11.1Z',
  filter: 'M2.25 3.25h11.5L9.3 8.14v3.38l-2.6 1.23V8.14L2.25 3.25Z',
  group: 'M2.5 3.25h3v3h-3v-3Zm4 0h7v3h-7v-3Zm-4 6.5h3v3h-3v-3Zm4 0h7v3h-7v-3Z',
  sort: 'M5.2 2.25 2.45 5l2.75 2.75.88-.88-1.25-1.25h7.92V4.38H4.83l1.25-1.25-.88-.88Zm5.6 6-.88.88 1.25 1.25H3.25v1.24h7.92L9.92 12.87l.88.88L13.55 11 10.8 8.25Z',
  rowHeight:
    'M2.1 3.5h11.8v1.2H2.1V3.5Zm0 7.8h11.8v1.2H2.1v-1.2ZM8 5.55l2 2.1H8.6v.7H10L8 10.45 6 8.35h1.4v-.7H6l2-2.1Z',
  chevron: 'M4.2 6.1 8 9.9l3.8-3.8-.9-.9L8 8.1 5.1 5.2l-.9.9Z',
} as const;

function ToolbarGlyph({ type }: { type: keyof typeof GLYPH_PATHS }) {
  return (
    <svg
      className={type === 'chevron' ? 'toolbar__chevron' : undefined}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d={GLYPH_PATHS[type]} />
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
  selectedRecordCount,
  rowHeight,
  openPanel,
  ready,
  disabled = false,
  recordsPanel,
  actions,
  onOpenPanelChange,
  onRowHeightChange,
  onFiltersChange,
  onSortRulesChange,
  onGroupFieldChange,
  onToggleField,
  onShowAllFields,
  onHideAllFields,
}: QueryToolbarProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const groupField = fields.find((field) => field.id === groupFieldId) ?? null;

  useEffect(() => {
    if (!openPanel || typeof document === 'undefined') {
      return () => undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !stageRef.current?.contains(event.target)) {
        onOpenPanelChange(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenPanelChange(null);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onOpenPanelChange, openPanel]);

  // Popovers anchor under their own button; nudge them back inside the panel
  // when the viewport is too narrow to show them at that offset.
  useLayoutEffect(() => {
    const popover = popoverRef.current;
    const stage = stageRef.current;
    if (!popover || !stage) {
      return;
    }

    popover.style.transform = '';
    const popoverBox = popover.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    const overflow = popoverBox.right - (stageBox.right - 8);
    if (overflow > 0) {
      const room = Math.max(popoverBox.left - (stageBox.left + 8), 0);
      popover.style.transform = `translateX(-${Math.min(overflow, room)}px)`;
    }
  }, [openPanel]);

  const togglePanel = (panel: Exclude<QueryPanel, null>) => {
    onOpenPanelChange(openPanel === panel ? null : panel);
  };

  const renderPopover = (panel: Exclude<QueryPanel, null>, content: ReactNode) =>
    openPanel === panel ? (
      <div
        id={`query-popover-${panel}`}
        className={`query-popover query-popover--${panel}`}
        role={panel === 'rowHeight' ? 'menu' : 'dialog'}
        aria-label={t(
          panel === 'records'
            ? 'records'
            : panel === 'field'
              ? 'hideFields'
              : panel === 'filter'
                ? 'filters'
                : panel === 'group'
                  ? 'group'
                  : panel === 'sort'
                    ? 'sort'
                    : 'rowHeight'
        )}
        ref={popoverRef}
      >
        {content}
      </div>
    ) : null;

  return (
    <div className="toolbar-stage" ref={stageRef}>
      <div className="toolbar" role="toolbar" aria-label={t('appTitle')}>
        <div className="toolbar__slot">
          <button
            type="button"
            className={`toolbar__button toolbar__button--primary${
              openPanel === 'records' ? ' toolbar__button--open' : ''
            }`}
            aria-expanded={openPanel === 'records'}
            aria-controls="query-popover-records"
            disabled={!ready}
            onClick={() => togglePanel('records')}
          >
            <ToolbarGlyph type="records" />
            <span className="toolbar__label">{t('recordsLabel')}</span>
            {selectedRecordCount ? (
              <small className="toolbar__badge">{selectedRecordCount}</small>
            ) : null}
            <ToolbarGlyph type="chevron" />
          </button>
          {renderPopover('records', recordsPanel)}
        </div>

        <div className="toolbar__slot">
          <button
            type="button"
            className={`toolbar__button${hiddenFieldIds.size ? ' toolbar__button--active' : ''}${
              openPanel === 'field' ? ' toolbar__button--open' : ''
            }`}
            aria-expanded={openPanel === 'field'}
            aria-controls="query-popover-field"
            disabled={!ready}
            onClick={() => togglePanel('field')}
          >
            <ToolbarGlyph type="field" />
            <span className="toolbar__label">{t('fieldsLabel')}</span>
            {hiddenFieldIds.size ? (
              <small className="toolbar__badge">{hiddenFieldIds.size}</small>
            ) : null}
          </button>
          {renderPopover(
            'field',
            <FieldSelector
              locale={locale}
              fields={fields}
              hiddenFieldIds={hiddenFieldIds}
              disabled={disabled}
              onToggle={onToggleField}
              onShowAll={onShowAllFields}
              onHideAll={onHideAllFields}
            />
          )}
        </div>

        <div className="toolbar__slot">
          <button
            type="button"
            className={`toolbar__button${filters.rules.length ? ' toolbar__button--active' : ''}${
              openPanel === 'filter' ? ' toolbar__button--open' : ''
            }`}
            aria-expanded={openPanel === 'filter'}
            aria-controls="query-popover-filter"
            disabled={!ready}
            onClick={() => togglePanel('filter')}
          >
            <ToolbarGlyph type="filter" />
            <span className="toolbar__label">{t('filters')}</span>
            {filters.rules.length ? (
              <small className="toolbar__badge">{filters.rules.length}</small>
            ) : null}
          </button>
          {renderPopover(
            'filter',
            <FilterBuilder
              locale={locale}
              fields={fields}
              filters={filters}
              fieldValues={fieldValues}
              disabled={disabled}
              onChange={onFiltersChange}
            />
          )}
        </div>

        <div className="toolbar__slot">
          <button
            type="button"
            className={`toolbar__button${groupField ? ' toolbar__button--active' : ''}${
              openPanel === 'group' ? ' toolbar__button--open' : ''
            }`}
            aria-expanded={openPanel === 'group'}
            aria-controls="query-popover-group"
            disabled={!ready}
            onClick={() => togglePanel('group')}
          >
            <ToolbarGlyph type="group" />
            <span className="toolbar__label">{t('group')}</span>
            {groupField ? (
              <span className="toolbar__value" title={groupField.name}>
                {groupField.name}
              </span>
            ) : null}
          </button>
          {renderPopover(
            'group',
            <GroupSelector
              locale={locale}
              fields={fields}
              groupFieldId={groupFieldId}
              disabled={disabled}
              onChange={onGroupFieldChange}
            />
          )}
        </div>

        <div className="toolbar__slot">
          <button
            type="button"
            className={`toolbar__button${sortRules.length ? ' toolbar__button--active' : ''}${
              openPanel === 'sort' ? ' toolbar__button--open' : ''
            }`}
            aria-expanded={openPanel === 'sort'}
            aria-controls="query-popover-sort"
            disabled={!ready}
            onClick={() => togglePanel('sort')}
          >
            <ToolbarGlyph type="sort" />
            <span className="toolbar__label">{t('sort')}</span>
            {sortRules.length ? (
              <small className="toolbar__badge">{sortRules.length}</small>
            ) : null}
          </button>
          {renderPopover(
            'sort',
            <SortBuilder
              locale={locale}
              fields={fields}
              sortRules={sortRules}
              disabled={disabled}
              onChange={onSortRulesChange}
            />
          )}
        </div>

        <div className="toolbar__slot">
          <button
            type="button"
            className={`toolbar__button${openPanel === 'rowHeight' ? ' toolbar__button--open' : ''}`}
            aria-expanded={openPanel === 'rowHeight'}
            aria-controls="query-popover-rowHeight"
            onClick={() => togglePanel('rowHeight')}
          >
            <ToolbarGlyph type="rowHeight" />
            <span className="toolbar__label">{t('rowHeight')}</span>
          </button>
          {renderPopover(
            'rowHeight',
            ROW_HEIGHTS.map((option) => (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={option === rowHeight}
                className={`menu-item${option === rowHeight ? ' menu-item--checked' : ''}`}
                key={option}
                onClick={() => {
                  onRowHeightChange(option);
                  onOpenPanelChange(null);
                }}
              >
                <span>{t(ROW_HEIGHT_LABEL_KEYS[option])}</span>
                <span className="menu-item__check" aria-hidden="true">
                  ✓
                </span>
              </button>
            ))
          )}
        </div>

        <div className="toolbar__spacer" />
        {actions}
      </div>
    </div>
  );
}
