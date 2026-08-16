import {
  bitable,
  BridgeEvent,
  BridgeModule,
  FieldType,
  OperationType,
  PermissionEntity,
  type IFieldMeta,
  type IWidgetTable,
  type ThemeModeType,
} from '@lark-opdev/block-bitable-api';
import type {
  CompareContext,
  CompareField,
  CompareFieldKind,
  CompareRecord,
  FieldValueMap,
} from '../types/compare';
import { EMPTY_CELL_VALUE, normalizeDisplayValue } from '../utils/cellFormatting';

/**
 * Collapses the SDK's field types into the handful of shapes Compare View
 * renders differently. Unknown and reference types read as text, which is how
 * `normalizeDisplayValue` already presents them.
 */
function toCompareFieldKind(type: IFieldMeta['type']): CompareFieldKind {
  switch (type) {
    case FieldType.Number:
    case FieldType.Currency:
    case FieldType.Progress:
    case FieldType.Rating:
    case FieldType.AutoNumber:
      return 'number';
    case FieldType.SingleSelect:
    case FieldType.MultiSelect:
      return 'select';
    case FieldType.DateTime:
    case FieldType.CreatedTime:
    case FieldType.ModifiedTime:
      return 'date';
    case FieldType.Checkbox:
      return 'checkbox';
    default:
      return 'text';
  }
}

/** The SDK's generated declaration does not export IWidgetView directly. */
interface ReadableView {
  id?: string;
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
  private recordIds: string[] = [];
  private fieldValueCache = new Map<string, Promise<FieldValueMap>>();

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
    this.fieldValueCache.clear();

    const [tableName, tableFieldMetas, visibleRecordIds, allRecordIds] = await Promise.all([
      table.getName(),
      table.getFieldMetaList(),
      view.getVisibleRecordIdList(),
      table.getRecordIdList(),
    ]);

    // The installed SDK exposes no primary-field marker. Table-level metadata
    // preserves Base's default field order, so its first field is the safe
    // primary-field display fallback instead of the current view's first field.
    const fields: CompareField[] = tableFieldMetas.map((meta, index) => ({
      id: meta.id,
      name: meta.name,
      meta,
      isPrimary: index === 0,
      kind: toCompareFieldKind(meta.type),
    }));
    const primaryFieldId = fields[0]?.id ?? null;
    const availableRecordIds = [
      ...new Set(allRecordIds.filter((recordId): recordId is string => Boolean(recordId))),
    ];
    this.recordIds = availableRecordIds;
    const loadedRecords = await mapWithConcurrency(availableRecordIds, 12, (id) =>
      this.getRecord(id, primaryFieldId)
    );
    const recordsById = new Map(loadedRecords.map((record) => [record.id, record]));
    const availableRecordIdSet = new Set(availableRecordIds);
    const visibleIds = [
      ...new Set(
        visibleRecordIds.filter(
          (recordId): recordId is string =>
            typeof recordId === 'string' && availableRecordIdSet.has(recordId)
        )
      ),
    ];
    const visibleIdSet = new Set(visibleIds);
    const remainingRecords = availableRecordIds
      .filter((recordId) => !visibleIdSet.has(recordId))
      .map((recordId) => recordsById.get(recordId))
      .filter((record): record is CompareRecord => Boolean(record));
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    remainingRecords.sort((first, second) => collator.compare(first.title, second.title));
    const records = [
      ...visibleIds
        .map((recordId) => recordsById.get(recordId))
        .filter((record): record is CompareRecord => Boolean(record)),
      ...remainingRecords,
    ];

    return {
      tableId: selection.tableId,
      viewId: view.id ?? selection.viewId,
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

  async getFieldValueMap(fieldId: string): Promise<FieldValueMap> {
    const table = this.table;
    if (!table) {
      throw new Error('Load the current Bitable context before reading field values.');
    }

    const cached = this.fieldValueCache.get(fieldId);
    if (cached) {
      return cached;
    }

    const valuesPromise = table
      .getFieldById(fieldId)
      .then((field) => field.getFieldValueList())
      .then((entries) =>
        entries.reduce<FieldValueMap>((values, entry) => {
          if (entry.record_id) {
            values[entry.record_id] = entry.value;
          }
          return values;
        }, {})
      )
      .catch(async () => {
        const entries = await mapWithConcurrency(this.recordIds, 12, async (recordId) => [
          recordId,
          await table.getCellValue(fieldId, recordId),
        ] as const);
        return entries.reduce<FieldValueMap>((values, [recordId, value]) => {
          values[recordId] = value;
          return values;
        }, {});
      });
    this.fieldValueCache.set(fieldId, valuesPromise);

    try {
      return await valuesPromise;
    } catch (error) {
      this.fieldValueCache.delete(fieldId);
      throw error;
    }
  }

  async getPersistentData(): Promise<unknown> {
    return bitable.bridge.getData();
  }

  /**
   * The sole write operation in this project. It stores extension UI settings
   * through the official bridge and never changes Base records, fields, or views.
   */
  async setPersistentData(data: Record<string, unknown>): Promise<void> {
    await bitable.bridge.setData(data);
  }

  async canEditBase(): Promise<boolean> {
    return bitable.base.getPermission({
      entity: PermissionEntity.Base,
      type: OperationType.Editable,
    });
  }

  subscribeToPersistentData(listener: () => void): () => void {
    const bridge = bitable.bridge as unknown as BridgeModule;
    return bridge.bind(BridgeEvent.DataChange, listener);
  }

  subscribe(listener: () => void): () => void {
    const table = this.table;
    if (!table) {
      return () => undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      this.fieldValueCache.clear();
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

async function mapWithConcurrency<T, Result>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<Result>
): Promise<Result[]> {
  const results = new Array<Result>(values.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  );
  return results;
}
