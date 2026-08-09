import type { UiLocale } from './types/compare';

const messages = {
  'zh-CN': {
    appTitle: 'Compare View',
    appSubtitle: '横向比较当前视图中的多条记录',
    language: '语言',
    chinese: '中文',
    english: 'EN',
    refresh: '刷新',
    loading: '正在读取多维表格数据…',
    retry: '重试',
    records: '比较记录',
    recordsHint: '选择 1–10 条记录，并用箭头调整显示顺序。',
    selectedRecords: '已选记录',
    noRecordsSelected: '尚未选择记录。',
    selectAtLeastOne: '请选择至少一条记录以查看字段。',
    recordLimit: '最多可比较 {{limit}} 条记录。',
    fields: '比较字段',
    fieldsHint: '显示或隐藏要比较的字段。',
    showAll: '全部显示',
    hideAll: '全部隐藏',
    primaryField: '主字段',
    moveUp: '上移',
    moveDown: '下移',
    fieldName: '字段',
    noVisibleFields: '没有可显示的字段。',
    noRecords: '当前视图中没有可比较的记录。',
    unavailableTitle: '无法读取当前数据表',
    unavailableDescription:
      '请在飞书多维表格的数据表视图中打开 Compare View，并确认应用已获得只读权限。',
    tableLoading: '正在更新比较内容…',
    emptyTableTitle: '当前数据表没有字段',
    emptyTableDescription: '请先在当前数据表中创建至少一个字段。',
  },
  'en-US': {
    appTitle: 'Compare View',
    appSubtitle: 'Compare records from the current view side by side',
    language: 'Language',
    chinese: '中文',
    english: 'EN',
    refresh: 'Refresh',
    loading: 'Reading Bitable data…',
    retry: 'Retry',
    records: 'Records to compare',
    recordsHint: 'Select 1–10 records and use the arrows to set their order.',
    selectedRecords: 'Selected records',
    noRecordsSelected: 'No records selected yet.',
    selectAtLeastOne: 'Select at least one record to view its fields.',
    recordLimit: 'Compare up to {{limit}} records.',
    fields: 'Fields to compare',
    fieldsHint: 'Show or hide fields in the comparison.',
    showAll: 'Show all',
    hideAll: 'Hide all',
    primaryField: 'Primary field',
    moveUp: 'Move up',
    moveDown: 'Move down',
    fieldName: 'Field',
    noVisibleFields: 'There are no visible fields to compare.',
    noRecords: 'There are no records to compare in this view.',
    unavailableTitle: 'Unable to read this table',
    unavailableDescription:
      'Open Compare View inside a Feishu Bitable data-table view and confirm the app has read-only access.',
    tableLoading: 'Updating comparison…',
    emptyTableTitle: 'This table has no fields',
    emptyTableDescription: 'Create at least one field in the current table first.',
  },
} as const;

export type MessageKey = keyof (typeof messages)['zh-CN'];

export function getInitialLocale(): UiLocale {
  if (typeof navigator !== 'undefined' && navigator.language.startsWith('zh')) {
    return 'zh-CN';
  }

  return 'en-US';
}

export function translate(
  locale: UiLocale,
  key: MessageKey,
  values: Record<string, string | number> = {}
): string {
  const message: string = messages[locale][key];

  return Object.entries(values).reduce<string>(
    (message, [name, value]) => message.replace(`{{${name}}}`, String(value)),
    message
  );
}
