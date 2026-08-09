import { useEffect, useMemo, useRef, useState } from 'react';
import { CompareTable } from './components/CompareTable';
import { EmptyState } from './components/EmptyState';
import { QueryToolbar } from './components/QueryToolbar';
import { RecordSelector } from './components/RecordSelector';
import { useCellValues } from './hooks/useCellValues';
import { useCompareConfig } from './hooks/useCompareConfig';
import { useCompareContext } from './hooks/useCompareContext';
import { useFeishuTheme } from './hooks/useFeishuTheme';
import { useFieldValues } from './hooks/useFieldValues';
import { getInitialLocale, translate } from './i18n';
import type { CompareRecord, CompareViewConfig, UiLocale } from './types/compare';
import {
  MAX_COMPARE_RECORDS,
  MIN_COMPARE_RECORDS,
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

  const controlsDisabled = config.status !== 'ready' || !draft || !config.canSave;
  const selectedCandidateIdSet = new Set(candidateRecordIds);
  const hiddenSelectedCount = draft
    ? draft.selectedRecordIds.filter((recordId) => !selectedCandidateIdSet.has(recordId)).length
    : 0;

  if (!context) {
    if (status === 'error') {
      return (
        <main className="compare-view" data-theme={theme}>
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
      <main className="compare-view compare-view--loading" data-theme={theme} aria-live="polite">
        <p>{t('loading')}</p>
      </main>
    );
  }

  const comparison = !context.fields.length ? (
    <EmptyState title={t('emptyTableTitle')} description={t('emptyTableDescription')} />
  ) : !context.records.length ? (
    <EmptyState title={t('noRecords')} description={t('recordsHint')} />
  ) : appliedRecords.length < MIN_COMPARE_RECORDS ? (
    <EmptyState title={t('selectAtLeastOne')} description={t('recordsHint')} />
  ) : !visibleFields.length ? (
    <EmptyState title={t('noVisibleFields')} description={t('fieldsHint')} />
  ) : (
    <CompareTable
      locale={locale}
      fields={visibleFields}
      groups={appliedGroups}
      collapsedGroupKeys={comparisonCollapsedGroups}
      values={cellValues.values}
      loading={cellValues.loading}
      onToggleGroup={(groupKey) =>
        setComparisonCollapsedGroups((current) => toggleGroupKey(current, groupKey))
      }
    />
  );

  return (
    <main className="compare-view" data-theme={theme}>
      <div className="workspace-toolbar">
        <div className="workspace-toolbar__status" aria-live="polite">
          {config.status === 'loading' ? <span>{t('configLoading')}</span> : null}
          {config.status === 'error' || config.error ? (
            <span className="workspace-toolbar__warning">{t('configError')}</span>
          ) : null}
          {config.status === 'ready' && !config.canSave ? (
            <span>{t('configReadOnly')}</span>
          ) : null}
          {config.remoteChanged ? (
            <span className="workspace-toolbar__warning">{t('remoteChanged')}</span>
          ) : null}
          {config.status === 'ready' && config.canSave && !config.remoteChanged ? (
            <span className={config.isDirty ? 'workspace-toolbar__pending' : ''}>
              {config.isDirty ? t('changesPending') : t('changesSaved')}
            </span>
          ) : null}
        </div>
        <div className="workspace-toolbar__actions">
          <label className="language-picker">
            <span className="visually-hidden">{t('language')}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as UiLocale)}>
              <option value="zh-CN">{t('chinese')}</option>
              <option value="en-US">{t('english')}</option>
            </select>
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              reload();
              void config.reloadSharedConfig();
            }}
          >
            {t('refresh')}
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
        </div>
      </div>

      <QueryToolbar
          locale={locale}
          fields={context.fields}
          filters={draft?.filters ?? { conjunction: 'and', rules: [] }}
          sortRules={draft?.sortRules ?? []}
          groupFieldId={draft?.groupFieldId ?? null}
          hiddenFieldIds={new Set(draft?.hiddenFieldIds ?? [])}
          fieldValues={fieldValues.values}
          disabled={controlsDisabled}
          onFiltersChange={(filters) =>
            config.updateDraft((current) => ({ ...current, filters }))
          }
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

      <div className="control-grid">
        <RecordSelector
          locale={locale}
          groups={candidateGroups}
          selectedRecordIds={draft?.selectedRecordIds ?? []}
          hiddenSelectedCount={hiddenSelectedCount}
          collapsedGroupKeys={candidateCollapsedGroups}
          disabled={controlsDisabled}
          onToggle={toggleRecord}
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
      </div>

      {!candidateRecords.length && queryValuesReady ? (
        <p className="candidate-empty-note">{t('candidateNoRecords')}</p>
      ) : null}
      {comparison}
    </main>
  );
};
