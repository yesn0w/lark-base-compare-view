import { useEffect, useMemo, useRef, useState } from 'react';
import { CompareTable } from './components/CompareTable';
import { EmptyState } from './components/EmptyState';
import { FieldSelector } from './components/FieldSelector';
import { RecordSelector } from './components/RecordSelector';
import { useCellValues } from './hooks/useCellValues';
import { useCompareContext } from './hooks/useCompareContext';
import { getInitialLocale, translate } from './i18n';
import type { CompareRecord, UiLocale } from './types/compare';
import { MAX_COMPARE_RECORDS, moveRecordId, toggleId } from './utils/compareState';

function sameItems(first: Set<string>, second: Set<string>): boolean {
  return first.size === second.size && [...first].every((item) => second.has(item));
}

export const App = () => {
  const [locale, setLocale] = useState<UiLocale>(getInitialLocale);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [hiddenFieldIds, setHiddenFieldIds] = useState<Set<string>>(new Set());
  const contextIdentity = useRef<string | null>(null);
  const { status, context, adapter, reload } = useCompareContext();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);

  const contextKey = context
    ? `${context.tableId}::${context.viewId ?? 'unknown-view'}`
    : null;

  useEffect(() => {
    if (!context || !contextKey) {
      return;
    }

    const contextChanged = contextIdentity.current !== contextKey;
    contextIdentity.current = contextKey;
    const availableRecordIds = new Set(context.records.map((record) => record.id));
    const availableFieldIds = new Set(context.fields.map((field) => field.id));

    setSelectedRecordIds((current) => {
      const next = contextChanged
        ? []
        : current.filter((recordId) => availableRecordIds.has(recordId));

      return next.length === current.length && next.every((id, index) => id === current[index])
        ? current
        : next;
    });

    setHiddenFieldIds((current) => {
      const next = contextChanged
        ? new Set(context.primaryFieldId ? [context.primaryFieldId] : [])
        : new Set([...current].filter((fieldId) => availableFieldIds.has(fieldId)));

      return sameItems(current, next) ? current : next;
    });
  }, [context, contextKey]);

  const selectedRecords = useMemo<CompareRecord[]>(() => {
    if (!context) {
      return [];
    }

    const recordsById = new Map(context.records.map((record) => [record.id, record]));
    return selectedRecordIds
      .map((recordId) => recordsById.get(recordId))
      .filter((record): record is CompareRecord => Boolean(record));
  }, [context, selectedRecordIds]);

  const visibleFields = useMemo(
    () => context?.fields.filter((field) => !hiddenFieldIds.has(field.id)) ?? [],
    [context, hiddenFieldIds]
  );
  const selectedIds = useMemo(
    () => selectedRecords.map((record) => record.id),
    [selectedRecords]
  );
  const cellValues = useCellValues(adapter, visibleFields, selectedIds);

  const toggleRecord = (recordId: string) => {
    setSelectedRecordIds((current) => {
      if (current.includes(recordId)) {
        return current.filter((id) => id !== recordId);
      }

      return current.length >= MAX_COMPARE_RECORDS ? current : [...current, recordId];
    });
  };

  const toggleField = (fieldId: string) => {
    setHiddenFieldIds((current) => toggleId(current, fieldId));
  };

  if (!context) {
    if (status === 'error') {
      return (
        <main className="compare-view">
          <EmptyState
            title={t('unavailableTitle')}
            description={t('unavailableDescription')}
            action={
              <button type="button" className="primary-button" onClick={reload}>
                {t('retry')}
              </button>
            }
          />
        </main>
      );
    }

    return (
      <main className="compare-view compare-view--loading" aria-live="polite">
        <p>{t('loading')}</p>
      </main>
    );
  }

  const comparison = !context.fields.length ? (
    <EmptyState
      title={t('emptyTableTitle')}
      description={t('emptyTableDescription')}
    />
  ) : !context.records.length ? (
    <EmptyState title={t('noRecords')} description={t('recordsHint')} />
  ) : selectedRecords.length < 2 ? (
    <EmptyState title={t('selectAtLeastTwo')} description={t('recordsHint')} />
  ) : !visibleFields.length ? (
    <EmptyState title={t('noVisibleFields')} description={t('fieldsHint')} />
  ) : (
    <CompareTable
      locale={locale}
      fields={visibleFields}
      records={selectedRecords}
      values={cellValues.values}
      loading={cellValues.loading}
    />
  );

  return (
    <main className="compare-view">
      <header className="app-header">
        <div>
          <p className="eyebrow">{context.tableName}</p>
          <h1>{t('appTitle')}</h1>
          <p>{t('appSubtitle')}</p>
        </div>
        <div className="app-header__actions">
          <label className="language-picker">
            <span className="visually-hidden">{t('language')}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as UiLocale)}
            >
              <option value="zh-CN">{t('chinese')}</option>
              <option value="en-US">{t('english')}</option>
            </select>
          </label>
          <button type="button" className="secondary-button" onClick={reload}>
            {t('refresh')}
          </button>
        </div>
      </header>

      <div className="control-grid">
        <RecordSelector
          locale={locale}
          records={context.records}
          selectedRecordIds={selectedRecordIds}
          onToggle={toggleRecord}
          onMove={(recordId, direction) =>
            setSelectedRecordIds((current) => moveRecordId(current, recordId, direction))
          }
        />
        <FieldSelector
          locale={locale}
          fields={context.fields}
          hiddenFieldIds={hiddenFieldIds}
          onToggle={toggleField}
          onShowAll={() => setHiddenFieldIds(new Set())}
          onHideAll={() => setHiddenFieldIds(new Set(context.fields.map((field) => field.id)))}
        />
      </div>

      {comparison}
    </main>
  );
};
