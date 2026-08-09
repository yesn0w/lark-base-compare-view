import { useState, type DragEvent } from 'react';
import { translate } from '../i18n';
import type { CompareRecord, CompareRecordGroup, UiLocale } from '../types/compare';
import { MAX_COMPARE_RECORDS } from '../utils/compareState';

interface RecordSelectorProps {
  locale: UiLocale;
  groups: CompareRecordGroup[];
  selectedRecordIds: string[];
  hiddenSelectedCount: number;
  collapsedGroupKeys: Set<string>;
  disabled?: boolean;
  onToggle: (recordId: string) => void;
  onMoveBefore: (recordId: string, targetRecordId: string) => void;
  onToggleGroup: (groupKey: string) => void;
}

function DragGrip() {
  return (
    <svg viewBox="0 0 12 18" aria-hidden="true" focusable="false">
      <circle cx="3" cy="3" r="1.25" />
      <circle cx="9" cy="3" r="1.25" />
      <circle cx="3" cy="9" r="1.25" />
      <circle cx="9" cy="9" r="1.25" />
      <circle cx="3" cy="15" r="1.25" />
      <circle cx="9" cy="15" r="1.25" />
    </svg>
  );
}

export function RecordSelector({
  locale,
  groups,
  selectedRecordIds,
  hiddenSelectedCount,
  collapsedGroupKeys,
  disabled = false,
  onToggle,
  onMoveBefore,
  onToggleGroup,
}: RecordSelectorProps) {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const selectedSet = new Set(selectedRecordIds);
  const hasGroups = groups.some((group) => Boolean(group.label));

  const startDrag = (event: DragEvent<HTMLButtonElement>, recordId: string) => {
    if (!selectedSet.has(recordId) || disabled) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', recordId);
    setDraggingId(recordId);
  };

  const finishDrag = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  const renderRecord = (record: CompareRecord) => {
    const selected = selectedSet.has(record.id);
    const limitReached = !selected && selectedRecordIds.length >= MAX_COMPARE_RECORDS;
    const isDropTarget = draggingId !== null && draggingId !== record.id && dropTargetId === record.id;

    return (
      <div
        className={`record-selector__item${selected ? ' record-selector__item--selected' : ''}${
          isDropTarget ? ' record-selector__item--drop-target' : ''
        }`}
        key={record.id}
        onDragOver={(event) => {
          if (!draggingId || draggingId === record.id) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDropTargetId(record.id);
        }}
        onDragLeave={() => {
          if (dropTargetId === record.id) {
            setDropTargetId(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (draggingId && draggingId !== record.id) {
            onMoveBefore(draggingId, record.id);
          }
          finishDrag();
        }}
      >
        <button
          type="button"
          className="drag-handle"
          draggable={selected && !disabled}
          disabled={!selected || disabled}
          aria-label={`${t('dragRecord')}: ${record.title}`}
          title={t('dragRecord')}
          onDragStart={(event) => startDrag(event, record.id)}
          onDragEnd={finishDrag}
        >
          <DragGrip />
        </button>
        <label className="record-selector__choice">
          <input
            type="checkbox"
            checked={selected}
            disabled={disabled || limitReached}
            onChange={() => onToggle(record.id)}
          />
          <span title={record.title}>{record.title}</span>
        </label>
      </div>
    );
  };

  return (
    <section className="control-panel record-selector" aria-labelledby="record-selector-title">
      <div className="control-panel__heading">
        <div>
          <h2 id="record-selector-title">{t('records')}</h2>
          <p>{t('recordsHint')}</p>
        </div>
        <span className="selection-count">
          {t('selectedCount', { count: selectedRecordIds.length, limit: MAX_COMPARE_RECORDS })}
        </span>
      </div>

      <p className="control-panel__limit">{t('recordLimit', { limit: MAX_COMPARE_RECORDS })}</p>
      {hiddenSelectedCount ? (
        <p className="control-panel__notice">
          {t('filteredSelectedRecords', { count: hiddenSelectedCount })}
        </p>
      ) : null}

      <div className="record-selector__list" role="group" aria-label={t('records')}>
        {groups.map((group) => {
          const collapsed = collapsedGroupKeys.has(group.key);
          return (
            <div className="record-selector__group" key={group.key}>
              {hasGroups ? (
                <button
                  type="button"
                  className="record-selector__group-heading"
                  aria-expanded={!collapsed}
                  disabled={disabled}
                  onClick={() => onToggleGroup(group.key)}
                >
                  <span aria-hidden="true">{collapsed ? '›' : '⌄'}</span>
                  <span>{group.label}</span>
                  <small>{group.records.length}</small>
                </button>
              ) : null}
              {!collapsed ? group.records.map(renderRecord) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
