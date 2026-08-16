import { useMemo, useState, type DragEvent } from 'react';
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
  onClearSelection: () => void;
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
  onClearSelection,
}: RecordSelectorProps) {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const [query, setQuery] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const selectedSet = new Set(selectedRecordIds);
  const hasGroups = groups.some((group) => Boolean(group.label));
  const search = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    if (!search) {
      return groups;
    }

    return groups
      .map((group) => ({
        ...group,
        records: group.records.filter((record) => record.title.toLowerCase().includes(search)),
      }))
      .filter((group) => group.records.length);
  }, [groups, search]);
  const hasResults = visibleGroups.some((group) => group.records.length);

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
    const isDropTarget =
      draggingId !== null && draggingId !== record.id && dropTargetId === record.id;

    return (
      <div
        className={`record-option${selected ? ' record-option--selected' : ''}${
          isDropTarget ? ' record-option--drop-target' : ''
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
        <label className="record-option__choice">
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
    <div className="record-picker">
      <div className="record-picker__search">
        <div className="record-picker__search-box">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M7.1 2.2a4.9 4.9 0 0 1 3.86 7.92l3.09 3.08-.88.88-3.08-3.09A4.9 4.9 0 1 1 7.1 2.2Zm0 1.25a3.65 3.65 0 1 0 0 7.3 3.65 3.65 0 0 0 0-7.3Z" />
          </svg>
          <input
            type="search"
            value={query}
            placeholder={t('searchRecords')}
            aria-label={t('searchRecords')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="record-picker__summary">
        <span>
          {t('selectedCount', {
            count: selectedRecordIds.length,
            limit: MAX_COMPARE_RECORDS,
          })}
        </span>
        <button
          type="button"
          className="link-button"
          disabled={disabled || !selectedRecordIds.length}
          onClick={onClearSelection}
        >
          {t('clearSelection')}
        </button>
      </div>

      {hiddenSelectedCount ? (
        <p className="record-picker__notice">
          {t('filteredSelectedRecords', { count: hiddenSelectedCount })}
        </p>
      ) : null}

      <div className="record-picker__list" role="group" aria-label={t('records')}>
        {hasResults ? (
          visibleGroups.map((group) => {
            const collapsed = !search && collapsedGroupKeys.has(group.key);
            return (
              <div className="record-picker__group" key={group.key}>
                {hasGroups ? (
                  <button
                    type="button"
                    className={`record-picker__group-heading${
                      collapsed ? ' record-picker__group-heading--collapsed' : ''
                    }`}
                    aria-expanded={!collapsed}
                    disabled={disabled || Boolean(search)}
                    onClick={() => onToggleGroup(group.key)}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                      <path d="M4.2 6.1 8 9.9l3.8-3.8-.9-.9L8 8.1 5.1 5.2l-.9.9Z" />
                    </svg>
                    <span>{group.label}</span>
                    <small>{group.records.length}</small>
                  </button>
                ) : null}
                {!collapsed ? group.records.map(renderRecord) : null}
              </div>
            );
          })
        ) : (
          <p className="record-picker__empty">
            {search ? t('noMatchingRecords') : t('candidateNoRecords')}
          </p>
        )}
      </div>

      <p className="record-picker__hint">
        {t('recordsPopoverHint', { limit: MAX_COMPARE_RECORDS })}
      </p>
    </div>
  );
}
