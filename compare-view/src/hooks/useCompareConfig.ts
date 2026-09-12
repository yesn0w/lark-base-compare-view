import { useEffect, useRef, useState } from 'react';
import type { BaseAdapter } from '../services/baseAdapter';
import type { CompareContext, CompareViewConfig } from '../types/compare';
import { createDefaultCompareConfig, readCompareConfig } from '../utils/compareConfig';
import { loadCompareConfigAccess } from '../utils/configAccess';
import { ConfigController, ConfigWriteQueue } from '../utils/configController';
import type { ColumnId } from '../utils/columnWidths';

export function useCompareConfig(adapter: BaseAdapter | null, context: CompareContext | null) {
  const sourceKey = context ? `${context.tableId}::${context.viewId ?? 'no-view'}` : null;
  const controller = useRef<ConfigController | null>(null);
  const queue = useRef(new ConfigWriteQueue());
  const [, render] = useState(0);
  const [access, setAccess] = useState({ status: 'loading' as 'loading' | 'ready' | 'error', canSave: false,
    readOnlyReason: null as 'mobile' | 'permission' | null });
  const io = () => ({
    read: async () => (await adapter!.getPersistentData(context!)).data,
    write: (data: Record<string, unknown>) => adapter!.setPersistentData(context!, data),
  });

  useEffect(() => {
    if (!adapter || !context) return;
    let active = true;
    let unsubscribe = () => {};
    controller.current = null;
    setAccess({ status: 'loading', canSave: false, readOnlyReason: null });
    void queue.current.run(() => loadCompareConfigAccess(adapter, context)).then(({ data, canSave, readOnlyReason }) => {
      if (!active) return;
      const config = readCompareConfig(data, context) ?? createDefaultCompareConfig(context);
      controller.current = new ConfigController(context, io(), config, queue.current);
      unsubscribe = controller.current.subscribe(() => render(n => n + 1));
      setAccess({ status: 'ready', canSave, readOnlyReason });
    }).catch(() => { if (active) setAccess({ status: 'error', canSave: false, readOnlyReason: null }); });
    return () => { active = false; unsubscribe(); controller.current?.dispose(); controller.current = null; };
  }, [sourceKey]);

  useEffect(() => {
    if (adapter && context) controller.current?.updateContext(context, io());
  }, [adapter, context]);

  useEffect(() => {
    if (!adapter || !sourceKey) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = adapter.subscribeToPersistentData(() => {
      clearTimeout(timer);
      timer = setTimeout(() => { void controller.current?.reload(); }, 100);
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [adapter, sourceKey]);

  const model = controller.current;
  return {
    ...access,
    applied: model?.state.applied ?? null, draft: model?.state.draft ?? null,
    saving: model?.state.saving ?? false, remoteChanged: model?.state.remoteChanged ?? false,
    error: model?.state.error ?? null, isDirty: model?.isDirty ?? false,
    widths: model?.widths ?? { fieldColumnWidth: null, recordColumnWidths: {} },
    widthSaving: model?.state.widthSaving ?? false, widthError: model?.state.widthError ?? false,
    hasPendingWidths: Boolean(model?.state.pendingWidths.size),
    updateDraft: (updater: (config: CompareViewConfig) => CompareViewConfig) => { if (access.canSave) model?.updateDraft(updater); },
    setWidth: (id: ColumnId, width: number | null) => { if (access.canSave) model?.setWidth(id, width); },
    retryWidths: () => access.canSave && model ? model.flushWidths() : Promise.resolve(false),
    restoreWidths: () => model?.restoreWidths(),
    save: () => access.canSave && model ? model.save() : Promise.resolve(false),
    discard: () => model?.discard(), reset: () => model?.reset(),
    reloadSharedConfig: () => model?.reload(),
  };
}
