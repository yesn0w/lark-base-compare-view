import { useState, type DragEvent } from 'react';
import { translate } from '../i18n';
import type {
  CellValueMap,
  CompareField,
  CompareRecordGroup,
  UiLocale,
} from '../types/compare';
import { EMPTY_CELL_VALUE, makeCellKey } from '../utils/cellFormatting';
import { isLongCellValue, readCellValue } from '../utils/compareDiff';
import type { RowHeight } from '../utils/rowHeight';
import { AttachmentPreviewDialog } from './AttachmentPreviewDialog';
import { AttachmentCarousel } from './AttachmentCarousel';
import { imageAttachments } from '../utils/attachmentGallery';
import { FieldKindIcon } from './FieldKindIcon';

import { ColumnResizer } from './ColumnResizer';
import { columnWidth, type WidthSettings, type ColumnId } from '../utils/columnWidths';

interface CompareTableProps {
  getImageIndex?: (fieldId: string, recordId: string) => number;
  onImageIndexChange?: (fieldId: string, recordId: string, index: number) => void;
  widths?: WidthSettings;
  onColumnWidthChange?: (id: ColumnId, width: number | null) => void;
  locale: UiLocale;
  fields: CompareField[];
  groups: CompareRecordGroup[];
  collapsedGroupKeys: Set<string>;
  differingFieldIds: Set<string>;
  /** Records dropped from the draft that still show until the change is saved. */
  pendingRecordIds: Set<string>;
  values: CellValueMap;
  rowHeight: RowHeight;
  wrappedFieldIds: Set<string>;
  expandedFieldIds: Set<string>;
  onToggleFieldExpansion: (fieldId: string) => void;
  loading: boolean;
  disabled?: boolean;
  onToggleGroup: (groupKey: string) => void;
  onRemoveRecord: (recordId: string) => void;
  onMoveRecordBefore: (recordId: string, targetRecordId: string) => void;
}

interface AttachmentPreview {
  title: string;
  fieldId: string;
  recordId: string;
}

export function CompareTable({
  getImageIndex = () => 0, onImageIndexChange = () => {},
  widths = { fieldColumnWidth: null, recordColumnWidths: {} }, onColumnWidthChange,
  locale,
  fields,
  groups,
  collapsedGroupKeys,
  differingFieldIds,
  pendingRecordIds,
  values,
  rowHeight,
  wrappedFieldIds, expandedFieldIds, onToggleFieldExpansion,
  loading,
  disabled = false,
  onToggleGroup,
  onRemoveRecord,
  onMoveRecordBefore,
}: CompareTableProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const [widthPreviews, setWidthPreviews] = useState<Map<ColumnId, number>>(new Map());
  const widthFor = (id: ColumnId) => widthPreviews.get(id) ?? columnWidth(widths, id);
  const fieldColumnWidth = widthFor(null);
  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreview | null>(null);
  const previewImages = attachmentPreview ? imageAttachments(readCellValue(values, attachmentPreview.fieldId, attachmentPreview.recordId).attachments) : [];
  const previewVisible = attachmentPreview && fields.some(field => field.id === attachmentPreview.fieldId) && groups.some(group => group.records.some(record => record.id === attachmentPreview.recordId));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const grouped = groups.some((group) => Boolean(group.label));
  const visibleGroups = groups.filter((group) => !collapsedGroupKeys.has(group.key));
  const collapsedGroups = groups.filter(group => collapsedGroupKeys.has(group.key));
  const restoreGroups = collapsedGroups.length ? <div className="collapsed-group-actions">
    {collapsedGroups.map(group => <button type="button" className="text-button" key={group.key}
      onClick={() => onToggleGroup(group.key)} aria-label={`${t('expandGroup')}: ${group.label}`}>{t('expandGroup')}: {group.label}</button>)}
  </div> : null;
  const records = visibleGroups.flatMap((group) => group.records);
  const recordColumnWidths = new Map(records.map(record => [record.id, widthFor(record.id)]));
  const resizer = (id: ColumnId, title: string) => <ColumnResizer
    label={`${t(id === null ? 'resizeFieldColumn' : 'resizeRecordColumn')}: ${title}`}
    value={widthFor(id)} record={id !== null} disabled={disabled || !onColumnWidthChange}
    onPreview={value => setWidthPreviews(current => {
      const next = new Map(current); if (value === undefined) next.delete(id); else next.set(id, value); return next;
    })} onCommit={value => onColumnWidthChange?.(id, value)} />;

  const finishDrag = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  if (!records.length) {
    return (
      <section className="compare-table-section" aria-label={t('appTitle')}>
        <p className="table-status">{t('allGroupsCollapsed')}</p>
        {restoreGroups}
      </section>
    );
  }

  if (!fields.length) {
    return (
      <section className="compare-table-section" aria-label={t('appTitle')}>
        <p className="table-status">{t(loading ? 'tableLoading' : 'noDifferences')}</p>
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
        {resizer(recordId, title)}
      </th>
    );
  };

  const fieldHeaderCell = (rowSpan?: number) => (
    <th scope="col" rowSpan={rowSpan} className="compare-table__field-header">
      <div className="compare-table__field-header-inner">
        <span>{t('fieldName')}</span>
        {resizer(null, t('fieldName'))}
      </div>
    </th>
  );

  return (
    <section
      className="compare-table-section"
      aria-label={t('appTitle')}
      style={{ ['--field-column-width' as string]: `${fieldColumnWidth}px` }}
    >
      {restoreGroups}
      {loading ? <p className="table-status">{t('tableLoading')}</p> : null}
      <div className="compare-table-scroll">
        <table
          className="compare-table"
          data-grouped={grouped ? 'true' : 'false'}
          style={{
            width:
              fieldColumnWidth +
              records.reduce(
                (width, record) =>
                  width + (recordColumnWidths.get(record.id) ?? 220),
                0
              ),
          }}
        >
          <colgroup>
            <col style={{ width: fieldColumnWidth }} />
            {records.map((record) => (
              <col
                key={record.id}
                style={{ width: recordColumnWidths.get(record.id) ?? 220 }}
              />
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
              const expanded = expandedFieldIds.has(field.id);
              const wrapped = wrappedFieldIds.has(field.id) || expanded;

              return (
                <tr
                  className={[differs ? 'compare-table__row--diff' : '', wrapped ? 'compare-table__row--wrapped' : ''].filter(Boolean).join(' ')}
                  data-field-id={field.id}
                  key={field.id}
                  style={{
                    height: rowHeight,
                    ['--compare-row-height' as string]: `${rowHeight}px`,
                  }}
                >
                  <th scope="row" className="compare-table__field-header" title={field.name}>
                    <div className="compare-table__field-name">
                      <FieldKindIcon kind={field.kind} />
                      <span>{field.name}</span>
                      {expanded ? (
                        <button type="button" className="link-button row-collapse" aria-label={`${t('collapseRow')}: ${field.name}`}
                          onClick={() => onToggleFieldExpansion(field.id)}>{t('collapseRow')}</button>
                      ) : null}
                      {field.isPrimary ? (
                        <small className="field-tag" title={t('primaryField')}>
                          {t('primaryFieldShort')}
                        </small>
                      ) : null}
                    </div>
                  </th>
                  {records.map((record) => {
                    const value = readCellValue(values, field.id, record.id);
                    const pendingValue = loading && !values[makeCellKey(field.id, record.id)];
                    const isTag = field.kind === 'select' && value.text !== EMPTY_CELL_VALUE;
                    const hasAttachments =
                      field.kind === 'attachment' && value.attachments.length > 0;

                    return (
                      <td
                        className={
                          pendingRecordIds.has(record.id) ? 'compare-table__cell--pending' : undefined
                        }
                        key={record.id}
                        title={pendingValue ? t('cellLoading') : value.text}
                      >
                        <div className="compare-table__cell">
                          {pendingValue ? (
                            <span className="cell-text cell-text--loading">{t('cellLoading')}</span>
                          ) : hasAttachments ? (
                            <AttachmentCarousel locale={locale} value={value} label={`${field.name}: ${record.title}`}
                              index={getImageIndex(field.id, record.id)}
                              onIndexChange={index => onImageIndexChange(field.id, record.id, index)}
                              onPreview={() => setAttachmentPreview({ title: `${field.name}: ${record.title}`, fieldId: field.id, recordId: record.id })}
                            />
                          ) : isTag ? (
                            <span className="cell-tag">{value.text}</span>
                          ) : (
                            <span className={`cell-text${differs ? ' cell-text--diff' : ''}`}>
                              {value.text}
                            </span>
                          )}
                          {!pendingValue && field.kind !== 'attachment' && !wrapped && isLongCellValue(value.text) ? (
                            <button
                              type="button"
                              className="link-button cell-expand"
                              onClick={() => {
                                onToggleFieldExpansion(field.id);
                              }}
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

      {attachmentPreview && previewVisible && previewImages.length ? (
        <AttachmentPreviewDialog
          locale={locale}
          title={attachmentPreview.title}
          images={previewImages}
          currentIndex={getImageIndex(attachmentPreview.fieldId, attachmentPreview.recordId)}
          onIndexChange={index => onImageIndexChange(attachmentPreview.fieldId, attachmentPreview.recordId, index)}
          onClose={() => setAttachmentPreview(null)}
        />
      ) : null}
    </section>
  );
}
