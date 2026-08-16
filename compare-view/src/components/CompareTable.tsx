import { useRef, useState, type DragEvent, type PointerEvent } from 'react';
import { translate } from '../i18n';
import type {
  CellValueMap,
  CompareField,
  CompareRecordGroup,
  UiLocale,
} from '../types/compare';
import { EMPTY_CELL_VALUE } from '../utils/cellFormatting';
import { isLongCellValue, readCellValue } from '../utils/compareDiff';
import type { RowHeight } from '../utils/rowHeight';
import { CellExpandDialog } from './CellExpandDialog';
import { FieldKindIcon } from './FieldKindIcon';

const MIN_FIELD_COLUMN_WIDTH = 140;
const MAX_FIELD_COLUMN_WIDTH = 420;
const DEFAULT_FIELD_COLUMN_WIDTH = 200;
const MIN_RECORD_COLUMN_WIDTH = 220;
const RESIZE_KEYBOARD_STEP = 16;

interface CompareTableProps {
  locale: UiLocale;
  fields: CompareField[];
  groups: CompareRecordGroup[];
  collapsedGroupKeys: Set<string>;
  differingFieldIds: Set<string>;
  /** Records dropped from the draft that still show until the change is saved. */
  pendingRecordIds: Set<string>;
  values: CellValueMap;
  rowHeight: RowHeight;
  loading: boolean;
  disabled?: boolean;
  onToggleGroup: (groupKey: string) => void;
  onRemoveRecord: (recordId: string) => void;
  onMoveRecordBefore: (recordId: string, targetRecordId: string) => void;
}

interface ExpandedCell {
  title: string;
  value: string;
}

export function CompareTable({
  locale,
  fields,
  groups,
  collapsedGroupKeys,
  differingFieldIds,
  pendingRecordIds,
  values,
  rowHeight,
  loading,
  disabled = false,
  onToggleGroup,
  onRemoveRecord,
  onMoveRecordBefore,
}: CompareTableProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const [fieldColumnWidth, setFieldColumnWidth] = useState(DEFAULT_FIELD_COLUMN_WIDTH);
  const [expandedCell, setExpandedCell] = useState<ExpandedCell | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const grouped = groups.some((group) => Boolean(group.label));
  const visibleGroups = groups.filter((group) => !collapsedGroupKeys.has(group.key));
  const records = visibleGroups.flatMap((group) => group.records);

  const clampFieldColumnWidth = (width: number) =>
    Math.min(MAX_FIELD_COLUMN_WIDTH, Math.max(MIN_FIELD_COLUMN_WIDTH, width));

  const startResize = (event: PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = { startX: event.clientX, startWidth: fieldColumnWidth };
  };

  const continueResize = (event: PointerEvent<HTMLSpanElement>) => {
    const state = resizeRef.current;
    if (!state) {
      return;
    }

    setFieldColumnWidth(clampFieldColumnWidth(state.startWidth + event.clientX - state.startX));
  };

  const endResize = (event: PointerEvent<HTMLSpanElement>) => {
    resizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const finishDrag = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  if (!records.length) {
    return (
      <section className="compare-table-section" aria-label={t('appTitle')}>
        <p className="table-status">{t('allGroupsCollapsed')}</p>
      </section>
    );
  }

  if (!fields.length) {
    return (
      <section className="compare-table-section" aria-label={t('appTitle')}>
        <p className="table-status">{t('noDifferences')}</p>
      </section>
    );
  }

  const renderRecordHeader = (recordId: string, title: string) => {
    const pending = pendingRecordIds.has(recordId);

    return (
      <th
        scope="col"
        className={`compare-table__record${pending ? ' compare-table__record--pending' : ''}${
          dropTargetId === recordId && draggingId && draggingId !== recordId
            ? ' compare-table__record--drop-target'
            : ''
        }`}
        key={recordId}
        onDragOver={(event) => {
          if (!draggingId || draggingId === recordId) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDropTargetId(recordId);
        }}
        onDragLeave={() => {
          if (dropTargetId === recordId) {
            setDropTargetId(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (draggingId && draggingId !== recordId) {
            onMoveRecordBefore(draggingId, recordId);
          }
          finishDrag();
        }}
      >
        <div className="compare-table__record-inner">
          <button
            type="button"
            className="drag-handle"
            draggable={!disabled}
            disabled={disabled}
            aria-label={`${t('dragRecord')}: ${title}`}
            title={t('dragRecord')}
            onDragStart={(event: DragEvent<HTMLButtonElement>) => {
              if (disabled) {
                event.preventDefault();
                return;
              }
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', recordId);
              setDraggingId(recordId);
            }}
            onDragEnd={finishDrag}
          >
            <svg viewBox="0 0 12 18" aria-hidden="true" focusable="false">
              <circle cx="3" cy="3" r="1.25" />
              <circle cx="9" cy="3" r="1.25" />
              <circle cx="3" cy="9" r="1.25" />
              <circle cx="9" cy="9" r="1.25" />
              <circle cx="3" cy="15" r="1.25" />
              <circle cx="9" cy="15" r="1.25" />
            </svg>
          </button>
          <span
            className="compare-table__record-title"
            title={pending ? `${title} · ${t('pendingRemoval')}` : title}
          >
            {title}
          </span>
          <button
            type="button"
            className="icon-button icon-button--ghost"
            disabled={disabled}
            aria-label={`${t('removeFromComparison')}: ${title}`}
            title={t('removeFromComparison')}
            onClick={() => onRemoveRecord(recordId)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="m8 7.1 3.1-3.1.9.9L8.9 8l3.1 3.1-.9.9L8 8.9 4.9 12l-.9-.9L7.1 8 4 4.9l.9-.9L8 7.1Z" />
            </svg>
          </button>
        </div>
      </th>
    );
  };

  const fieldHeaderCell = (rowSpan?: number) => (
    <th scope="col" rowSpan={rowSpan} className="compare-table__field-header">
      <div className="compare-table__field-header-inner">
        <span>{t('fieldName')}</span>
        <span
          className="compare-table__resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label={t('resizeFieldColumn')}
          title={t('resizeFieldColumn')}
          tabIndex={0}
          onPointerDown={startResize}
          onPointerMove={continueResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              const delta = event.key === 'ArrowLeft' ? -RESIZE_KEYBOARD_STEP : RESIZE_KEYBOARD_STEP;
              setFieldColumnWidth((current) => clampFieldColumnWidth(current + delta));
            }
          }}
        />
      </div>
    </th>
  );

  return (
    <section
      className="compare-table-section"
      aria-label={t('appTitle')}
      style={{ ['--field-column-width' as string]: `${fieldColumnWidth}px` }}
    >
      {loading ? <p className="table-status">{t('tableLoading')}</p> : null}
      <div className="compare-table-scroll">
        <table
          className="compare-table"
          data-grouped={grouped ? 'true' : 'false'}
          style={{
            minWidth: fieldColumnWidth + records.length * MIN_RECORD_COLUMN_WIDTH,
          }}
        >
          <colgroup>
            <col style={{ width: fieldColumnWidth }} />
            {records.map((record) => (
              <col key={record.id} />
            ))}
          </colgroup>
          <thead>
            {grouped ? (
              <tr>
                {fieldHeaderCell(2)}
                {visibleGroups.map((group) => (
                  <th
                    scope="colgroup"
                    colSpan={group.records.length}
                    className="compare-table__group-header"
                    key={group.key}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleGroup(group.key)}
                      aria-label={t('collapseGroup')}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                        <path d="M4.2 6.1 8 9.9l3.8-3.8-.9-.9L8 8.1 5.1 5.2l-.9.9Z" />
                      </svg>
                      <span>{group.label}</span>
                      <small>{group.records.length}</small>
                    </button>
                  </th>
                ))}
              </tr>
            ) : null}
            <tr>
              {!grouped ? fieldHeaderCell() : null}
              {records.map((record) => renderRecordHeader(record.id, record.title))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const differs = differingFieldIds.has(field.id);

              return (
                <tr
                  className={differs ? 'compare-table__row--diff' : undefined}
                  key={field.id}
                  style={{ height: rowHeight }}
                >
                  <th scope="row" className="compare-table__field-header" title={field.name}>
                    <div className="compare-table__field-name">
                      <FieldKindIcon kind={field.kind} />
                      <span>{field.name}</span>
                      {field.isPrimary ? (
                        <small className="field-tag" title={t('primaryField')}>
                          {t('primaryFieldShort')}
                        </small>
                      ) : null}
                    </div>
                  </th>
                  {records.map((record) => {
                    const value = readCellValue(values, field.id, record.id);
                    const isTag = field.kind === 'select' && value !== EMPTY_CELL_VALUE;

                    return (
                      <td
                        className={
                          pendingRecordIds.has(record.id) ? 'compare-table__cell--pending' : undefined
                        }
                        key={record.id}
                        title={value}
                      >
                        <div className="compare-table__cell">
                          {isTag ? (
                            <span className="cell-tag">{value}</span>
                          ) : (
                            <span className={`cell-text${differs ? ' cell-text--diff' : ''}`}>
                              {value}
                            </span>
                          )}
                          {isLongCellValue(value) ? (
                            <button
                              type="button"
                              className="link-button cell-expand"
                              onClick={() => setExpandedCell({ title: field.name, value })}
                            >
                              {t('expandCell')}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {expandedCell ? (
        <CellExpandDialog
          locale={locale}
          title={expandedCell.title}
          value={expandedCell.value}
          onClose={() => setExpandedCell(null)}
        />
      ) : null}
    </section>
  );
}
