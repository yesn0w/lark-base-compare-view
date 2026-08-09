import {
  bitable,
  type IFieldMeta,
  type IWidgetTable,
  type ThemeModeType,
} from '@lark-opdev/block-bitable-api';
import type {
  CompareContext,
  CompareField,
  CompareRecord,
} from '../types/compare';
import { EMPTY_CELL_VALUE, normalizeDisplayValue } from '../utils/cellFormatting';

/** The SDK's generated declaration does not export IWidgetView directly. */
interface ReadableView {
  getFieldMetaList(): Promise<IFieldMeta[]>;
  getVisibleRecordIdList(): Promise<(string | undefined)[]>;
}

export type HostTheme = ThemeModeType;

export const getHostTheme = (): Promise<HostTheme> => bitable.bridge.getTheme();

export const subscribeToHostTheme = (
  listener: (theme: HostTheme) => void
): (() => void) => bitable.bridge.onThemeChange(({ data }) => listener(data.theme));

/**
 * Keeps the React layer independent of the Feishu SDK. This adapter only uses
 * read APIs; no set/add/delete SDK methods are referenced in this project.
 */
export class BaseAdapter {
  private table: IWidgetTable | null = null;

  private async getCurrentView(
    table: IWidgetTable,
    viewId: string | null
  ): Promise<ReadableView> {
    if (viewId) {
      try {
        return await table.getViewById(viewId);
      } catch {
        // The host can briefly report an old view while switching views.
      }
    }

    const fallbackView = (await table.getViewMetaList())[0];
    if (!fallbackView) {
      throw new Error('The current table has no available view.');
    }

    return table.getViewById(fallbackView.id);
  }

  async load(): Promise<CompareContext> {
    const selection = await bitable.base.getSelection();
    if (!selection.tableId) {
      throw new Error('No active Bitable table is available.');
    }

    const table = await bitable.base.getTableById(selection.tableId);
    const view = await this.getCurrentView(table, selection.viewId);
    this.table = table;

    const [tableName, fieldMetas, visibleRecordIds] = await Promise.all([
      table.getName(),
      view.getFieldMetaList(),
      view.getVisibleRecordIdList(),
    ]);

    // The installed SDK exposes ordered field metadata but no primary-field
    // marker. Bitable's first field is therefore the safe display fallback.
    const fields: CompareField[] = fieldMetas.map((meta, index) => ({
      id: meta.id,
      name: meta.name,
      meta,
      isPrimary: index === 0,
    }));
    const primaryFieldId = fields[0]?.id ?? null;
    const recordIds = visibleRecordIds.filter(
      (recordId): recordId is string => Boolean(recordId)
    );
    const records = await Promise.all(
      recordIds.map((id) => this.getRecord(id, primaryFieldId))
    );

    return {
      tableId: selection.tableId,
      viewId: selection.viewId,
      tableName,
      primaryFieldId,
      fields,
      records,
    };
  }

  private async getRecord(
    id: string,
    primaryFieldId: string | null
  ): Promise<CompareRecord> {
    if (!primaryFieldId) {
      return { id, title: id };
    }

    const title = await this.getCellDisplayValue(primaryFieldId, id);
    return { id, title: title === EMPTY_CELL_VALUE ? id : title };
  }

  async getCellDisplayValue(fieldId: string, recordId: string): Promise<string> {
    const table = this.table;
    if (!table) {
      throw new Error('Load the current Bitable context before reading cells.');
    }

    try {
      return normalizeDisplayValue(await table.getCellString(fieldId, recordId));
    } catch {
      try {
        return normalizeDisplayValue(await table.getCellValue(fieldId, recordId));
      } catch {
        return EMPTY_CELL_VALUE;
      }
    }
  }

  subscribe(listener: () => void): () => void {
    const table = this.table;
    if (!table) {
      return () => undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }

      timer = setTimeout(listener, 150);
    };

    const unsubscribe = [
      bitable.base.onSelectionChange(scheduleRefresh),
      table.onFieldAdd(scheduleRefresh),
      table.onFieldDelete(scheduleRefresh),
      table.onFieldModify(scheduleRefresh),
      table.onRecordAdd(scheduleRefresh),
      table.onRecordDelete(scheduleRefresh),
      table.onRecordModify(scheduleRefresh),
    ];

    return () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      unsubscribe.forEach((dispose) => dispose());
    };
  }
}
