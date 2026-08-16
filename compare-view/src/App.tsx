import { useEffect, useMemo, useRef, useState } from 'react';
import { CompareTable } from './components/CompareTable';
import { EmptyState } from './components/EmptyState';
import { QueryToolbar, type QueryPanel } from './components/QueryToolbar';
import { RecordSelector } from './components/RecordSelector';
import { StatBar } from './components/StatBar';
import { TableSkeleton } from './components/TableSkeleton';
import { useCellValues } from './hooks/useCellValues';
import { useCompareConfig } from './hooks/useCompareConfig';
import { useCompareContext } from './hooks/useCompareContext';
import { useFeishuTheme } from './hooks/useFeishuTheme';
import { useFieldValues } from './hooks/useFieldValues';
import { getInitialLocale, translate } from './i18n';
import type { CompareRecord, CompareViewConfig, UiLocale } from './types/compare';
import { fieldHasDifference } from './utils/compareDiff';
import {
  MAX_COMPARE_RECORDS,
  MIN_COMPARE_RECORDS,
  moveSelectedRecordBefore,
  moveSelectedRecordToCandidatePosition,
  orderSelectedRecordIdsByRecords,
  toggleId,
} from './utils/compareState';
import {
  filterRecords,
  groupRecords,
  mergeSelectedOrderIntoCandidates,
  sortRecords,
} from './utils/queryEngine';
import { DEFAULT_ROW_HEIGHT, type RowHeight } from './utils/rowHeight';

function toggleGroupKey(
  current: Set<string>,
  groupKey: string
): Set<string> {
  return toggleId(current, groupKey);
}

function configSortKey(config: CompareViewConfig | null): string {
  return JSON.stringify(config?.sortRules ?? []);
}

export const App = () => {
  const [locale, setLocale] = useState<UiLocale>(getInitialLocale);
  const [candidateCollapsedGroups, setCandidateCollapsedGroups] = useState<Set<string>>(new Set());
  const [comparisonCollapsedGroups, setComparisonCollapsedGroups] = useState<Set<string>>(new Set());
  // Row height and the differences-only filter are per-session view preferences.
  // They are deliberately not part of the persisted compare configuration.
  const [rowHeight, setRowHeight] = useState<RowHeight>(DEFAULT_ROW_HEIGHT);
  const [diffOnly, setDiffOnly] = useState(false);
  const [openPanel, setOpenPanel] = useState<QueryPanel>(null);
  const sortResetKeyRef = useRef<string | null>(null);
  const theme = useFeishuTheme();
  const { status, context, adapter, reload } = useCompareContext();
  const config = useCompareConfig(adapter, context);
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const draft = config.draft;
  const applied = config.applied;

  const queryFieldIds = useMemo(() => {
    if (!draft && !applied) {
      return [];
    }

    return [
      ...(draft?.filters.rules.map((rule) => rule.fieldId) ?? []),
      ...(draft?.sortRules.map((rule) => rule.fieldId) ?? []),
      ...(draft?.groupFieldId ? [draft.groupFieldId] : []),
      ...(applied?.groupFieldId ? [applied.groupFieldId] : []),
    ];
  }, [applied, draft]);
  const fieldValues = useFieldValues(adapter, queryFieldIds);
  const queryValuesReady = queryFieldIds.every((fieldId) => fieldValues.values[fieldId]);

  useEffect(() => {
    setCandidateCollapsedGroups(new Set());
  }, [draft?.groupFieldId]);

  useEffect(() => {
    setComparisonCollapsedGroups(new Set());
  }, [applied?.groupFieldId]);

  const candidateRecords = useMemo(() => {
    if (!context || !draft) {
      return [];
    }

    const filtered = queryValuesReady
      ? filterRecords(
          context.records,
          context,
          draft.filters.rules,
          draft.filters.conjunction,
          fieldValues.values
        )
      : context.records;
    const sorted = queryValuesReady
      ? sortRecords(filtered, context.fields, draft.sortRules, fieldValues.values, locale)
      : filtered;
    return mergeSelectedOrderIntoCandidates(sorted, draft.selectedRecordIds);
  }, [context, draft, fieldValues.values, locale, queryValuesReady]);
  const candidateGroups = useMemo(
    () =>
      context && draft
        ? groupRecords(candidateRecords, context.fields, draft.groupFieldId, fieldValues.values)
        : [],
    [candidateRecords, context, draft, fieldValues.values]
  );
  const candidateRecordIds = useMemo(
    () => candidateRecords.map((record) => record.id),
    [candidateRecords]
  );

  const appliedRecords = useMemo<CompareRecord[]>(() => {
    if (!context || !applied) {
      return [];
    }

    const recordsById = new Map(context.records.map((record) => [record.id, record]));
    return applied.selectedRecordIds
      .map((recordId) => recordsById.get(recordId))
      .filter((record): record is CompareRecord => Boolean(record));
  }, [applied, context]);
  const appliedGroups = useMemo(
    () =>
      context && applied
        ? groupRecords(appliedRecords, context.fields, applied.groupFieldId, fieldValues.values)
        : [],
    [applied, appliedRecords, context, fieldValues.values]
  );
  const visibleFields = useMemo(
    () =>
      context && applied
        ? context.fields.filter((field) => !applied.hiddenFieldIds.includes(field.id))
        : [],
    [applied, context]
  );
  const selectedIds = useMemo(() => appliedRecords.map((record) => record.id), [appliedRecords]);
  const cellValues = useCellValues(adapter, visibleFields, selectedIds);
  const currentSortKey = configSortKey(draft);

  const differingFieldIds = useMemo(
    () =>
      new Set(
        visibleFields
          .filter((field) => fieldHasDifference(cellValues.values, field.id, selectedIds))
          .map((field) => field.id)
      ),
    [cellValues.values, selectedIds, visibleFields]
  );
  const displayFields = useMemo(
    () => (diffOnly ? visibleFields.filter((field) => differingFieldIds.has(field.id)) : visibleFields),
    [diffOnly, differingFieldIds, visibleFields]
  );
  const pendingRecordIds = useMemo(() => {
    if (!draft) {
      return new Set<string>();
    }

    const draftSelected = new Set(draft.selectedRecordIds);
    return new Set(selectedIds.filter((recordId) => !draftSelected.has(recordId)));
  }, [draft, selectedIds]);

  useEffect(() => {
    if (!context || !draft || sortResetKeyRef.current !== currentSortKey) {
      return;
    }

    const sortValuesReady = draft.sortRules.every((rule) => fieldValues.values[rule.fieldId]);
    if (!sortValuesReady || fieldValues.loading) {
      return;
    }

    const nextOrder = orderSelectedRecordIdsByRecords(
      draft.selectedRecordIds,
      sortRecords(context.records, context.fields, draft.sortRules, fieldValues.values, locale).map(
        (record) => record.id
      )
    );
    sortResetKeyRef.current = null;
    config.updateDraft((current) =>
      configSortKey(current) === currentSortKey
        ? { ...current, selectedRecordIds: nextOrder }
        : current
    );
  }, [config, context, currentSortKey, draft, fieldValues.loading, fieldValues.values, locale]);

  const toggleRecord = (recordId: string) => {
    config.updateDraft((current) => {
      if (current.selectedRecordIds.includes(recordId)) {
        return {
          ...current,
          selectedRecordIds: current.selectedRecordIds.filter((id) => id !== recordId),
        };
      }

      if (current.selectedRecordIds.length >= MAX_COMPARE_RECORDS) {
        return current;
      }

      return { ...current, selectedRecordIds: [...current.selectedRecordIds, recordId] };
    });
  };

  const removeRecord = (recordId: string) => {
    config.updateDraft((current) => ({
      ...current,
      selectedRecordIds: current.selectedRecordIds.filter((id) => id !== recordId),
    }));
  };

  const updateSortRules = (sortRules: CompareViewConfig['sortRules']) => {
    sortResetKeyRef.current = JSON.stringify(sortRules);
    config.updateDraft((current) => ({ ...current, sortRules }));
  };

  const updateHiddenFields = (updater: (hiddenFieldIds: string[]) => string[]) => {
    config.updateDraft((current) => ({
      ...current,
      hiddenFieldIds: updater(current.hiddenFieldIds),
    }));
  };

  // A loaded configuration can always be inspected; only editing needs permission.
  const configReady = config.status === 'ready' && Boolean(draft);
  const controlsDisabled = !configReady || !config.canSave;
  const selectedCandidateIdSet = new Set(candidateRecordIds);
  const hiddenSelectedCount = draft
    ? draft.selectedRecordIds.filter((recordId) => !selectedCandidateIdSet.has(recordId)).length
    : 0;

  if (!context) {
    if (status === 'error') {
      return (
        <main className="compare-view compare-view--message" data-theme={theme}>
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
      <main className="compare-view compare-view--message" data-theme={theme} aria-live="polite">
        <p className="compare-view__loading">{t('loading')}</p>
      </main>
    );
  }

  const hasComparison = Boolean(
    context.fields.length &&
      context.records.length &&
      appliedRecords.length >= MIN_COMPARE_RECORDS &&
      visibleFields.length
  );
  const showSkeleton = hasComparison && cellValues.loading && !Object.keys(cellValues.values).length;

  const comparison = !context.fields.length ? (
    <EmptyState title={t('emptyTableTitle')} description={t('emptyTableDescription')} />
  ) : !context.records.length ? (
    <EmptyState title={t('noRecords')} description={t('recordsHint')} />
  ) : appliedRecords.length < MIN_COMPARE_RECORDS ? (
    <EmptyState
      title={t('emptySelectionTitle')}
      description={t('emptySelectionDescription', { limit: MAX_COMPARE_RECORDS })}
      action={
        <button
          type="button"
          className="primary-button"
          disabled={!configReady}
          onClick={() => setOpenPanel('records')}
        >
          {t('chooseRecords')}
        </button>
      }
    />
  ) : !visibleFields.length ? (
    <EmptyState title={t('noVisibleFields')} description={t('fieldsHint')} />
  ) : showSkeleton ? (
    <TableSkeleton locale={locale} columnCount={selectedIds.length} />
  ) : (
    <CompareTable
      locale={locale}
      fields={displayFields}
      groups={appliedGroups}
      collapsedGroupKeys={comparisonCollapsedGroups}
      differingFieldIds={differingFieldIds}
      pendingRecordIds={pendingRecordIds}
      values={cellValues.values}
      rowHeight={rowHeight}
      loading={cellValues.loading}
      disabled={controlsDisabled}
      onToggleGroup={(groupKey) =>
        setComparisonCollapsedGroups((current) => toggleGroupKey(current, groupKey))
      }
      onRemoveRecord={removeRecord}
      onMoveRecordBefore={(recordId, targetRecordId) =>
        config.updateDraft((current) => ({
          ...current,
          selectedRecordIds: moveSelectedRecordBefore(
            current.selectedRecordIds,
            recordId,
            targetRecordId
          ),
        }))
      }
    />
  );

  const saveStatus =
    config.status === 'loading' ? (
      <span>{t('configLoading')}</span>
    ) : config.status === 'error' || config.error ? (
      <span className="toolbar__status--warning">{t('configError')}</span>
    ) : config.remoteChanged ? (
      <span className="toolbar__status--warning">{t('remoteChanged')}</span>
    ) : !config.canSave ? (
      <span>{t('configReadOnly')}</span>
    ) : config.isDirty ? (
      <>
        <span className="toolbar__status-dot" aria-hidden="true" />
        <span>{t('unsaved')}</span>
      </>
    ) : (
      <span>{t('changesSaved')}</span>
    );

  const actions = (
    <>
      <div className="toolbar__status" aria-live="polite">
        {saveStatus}
      </div>
      <label className="language-picker">
        <span className="visually-hidden">{t('language')}</span>
        <select value={locale} onChange={(event) => setLocale(event.target.value as UiLocale)}>
          <option value="zh-CN">{t('chinese')}</option>
          <option value="en-US">{t('english')}</option>
        </select>
      </label>
      <button
        type="button"
        className="icon-button"
        title={t('refresh')}
        aria-label={t('refresh')}
        onClick={() => {
          reload();
          void config.reloadSharedConfig();
        }}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M8 3.35c1.72 0 3.2 1 3.9 2.45h-1.6l2.35 2.9 2.35-2.9h-1.72A5.65 5.65 0 0 0 8 2.1 5.65 5.65 0 0 0 2.5 6.4l1.2.5A4.4 4.4 0 0 1 8 3.35Zm0 9.3a4.4 4.4 0 0 1-3.9-2.45h1.6L3.35 7.3 1 10.2h1.72A5.65 5.65 0 0 0 8 13.9c2.4 0 4.5-1.5 5.32-3.65l-1.2-.5A4.4 4.4 0 0 1 8 12.65Z" />
        </svg>
      </button>
      <button
        type="button"
        className="text-button"
        disabled={controlsDisabled || !config.isDirty || config.saving}
        onClick={config.discard}
      >
        {t('discard')}
      </button>
      <button
        type="button"
        className="text-button"
        disabled={controlsDisabled || config.saving}
        onClick={config.reset}
      >
        {t('reset')}
      </button>
      <button
        type="button"
        className="primary-button"
        disabled={
          controlsDisabled ||
          !config.isDirty ||
          config.saving ||
          fieldValues.loading ||
          !queryValuesReady
        }
        onClick={() => void config.save()}
      >
        {config.saving ? t('saving') : t('save')}
      </button>
    </>
  );

  return (
    <main className="compare-view" data-theme={theme}>
      <QueryToolbar
        locale={locale}
        fields={context.fields}
        filters={draft?.filters ?? { conjunction: 'and', rules: [] }}
        sortRules={draft?.sortRules ?? []}
        groupFieldId={draft?.groupFieldId ?? null}
        hiddenFieldIds={new Set(draft?.hiddenFieldIds ?? [])}
        fieldValues={fieldValues.values}
        selectedRecordCount={draft?.selectedRecordIds.length ?? 0}
        rowHeight={rowHeight}
        openPanel={openPanel}
        ready={configReady}
        disabled={controlsDisabled}
        actions={actions}
        recordsPanel={
          <RecordSelector
            locale={locale}
            groups={candidateGroups}
            selectedRecordIds={draft?.selectedRecordIds ?? []}
            hiddenSelectedCount={hiddenSelectedCount}
            collapsedGroupKeys={candidateCollapsedGroups}
            disabled={controlsDisabled}
            onToggle={toggleRecord}
            onClearSelection={() =>
              config.updateDraft((current) => ({ ...current, selectedRecordIds: [] }))
            }
            onMoveBefore={(recordId, targetRecordId) =>
              config.updateDraft((current) => ({
                ...current,
                selectedRecordIds: moveSelectedRecordToCandidatePosition(
                  current.selectedRecordIds,
                  candidateRecordIds,
                  recordId,
                  targetRecordId
                ),
              }))
            }
            onToggleGroup={(groupKey) =>
              setCandidateCollapsedGroups((current) => toggleGroupKey(current, groupKey))
            }
          />
        }
        onOpenPanelChange={setOpenPanel}
        onRowHeightChange={setRowHeight}
        onFiltersChange={(filters) => config.updateDraft((current) => ({ ...current, filters }))}
        onSortRulesChange={updateSortRules}
        onGroupFieldChange={(groupFieldId) =>
          config.updateDraft((current) => ({ ...current, groupFieldId }))
        }
        onToggleField={(fieldId) =>
          updateHiddenFields((current) => [...toggleId(new Set(current), fieldId)])
        }
        onShowAllFields={() => updateHiddenFields(() => [])}
        onHideAllFields={() => updateHiddenFields(() => context.fields.map((field) => field.id))}
      />

      {hasComparison ? (
        <StatBar
          locale={locale}
          recordCount={selectedIds.length}
          fieldCount={visibleFields.length}
          differenceCount={differingFieldIds.size}
          diffOnly={diffOnly}
          onToggleDiffOnly={() => setDiffOnly((current) => !current)}
        />
      ) : null}

      <div className="panel-body">{comparison}</div>
    </main>
  );
};
