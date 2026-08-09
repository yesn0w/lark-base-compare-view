import { translate } from '../i18n';
import type { CompareRecord, UiLocale } from '../types/compare';
import { MAX_COMPARE_RECORDS } from '../utils/compareState';

interface RecordSelectorProps {
  locale: UiLocale;
  records: CompareRecord[];
  selectedRecordIds: string[];
  onToggle: (recordId: string) => void;
  onMove: (recordId: string, direction: -1 | 1) => void;
}

export function RecordSelector({
  locale,
  records,
  selectedRecordIds,
  onToggle,
  onMove,
}: RecordSelectorProps) {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const selectedSet = new Set(selectedRecordIds);
  const selectedRecords = selectedRecordIds
    .map((recordId) => records.find((record) => record.id === recordId))
    .filter((record): record is CompareRecord => Boolean(record));

  return (
    <section className="control-panel" aria-labelledby="record-selector-title">
      <div className="control-panel__heading">
        <h2 id="record-selector-title">{t('records')}</h2>
        <p>{t('recordsHint')}</p>
      </div>

      <div className="selected-records">
        <span className="control-panel__label">{t('selectedRecords')}</span>
        {selectedRecords.length ? (
          <ol className="selected-records__list">
            {selectedRecords.map((record, index) => (
              <li key={record.id} className="selected-records__item">
                <span className="selected-records__title" title={record.title}>
                  {record.title}
                </span>
                <div className="order-controls">
                  <button
                    type="button"
                    className="icon-button"
                    disabled={index === 0}
                    aria-label={`${t('moveUp')}: ${record.title}`}
                    onClick={() => onMove(record.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={index === selectedRecords.length - 1}
                    aria-label={`${t('moveDown')}: ${record.title}`}
                    onClick={() => onMove(record.id, 1)}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="control-panel__empty">{t('noRecordsSelected')}</p>
        )}
      </div>

      <p className="control-panel__limit">
        {t('recordLimit', { limit: MAX_COMPARE_RECORDS })}
      </p>
      <div className="selector-list" role="group" aria-label={t('records')}>
        {records.map((record) => {
          const selected = selectedSet.has(record.id);
          const disabled = !selected && selectedRecordIds.length >= MAX_COMPARE_RECORDS;

          return (
            <label className="selector-list__item" key={record.id}>
              <input
                type="checkbox"
                checked={selected}
                disabled={disabled}
                onChange={() => onToggle(record.id)}
              />
              <span title={record.title}>{record.title}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
