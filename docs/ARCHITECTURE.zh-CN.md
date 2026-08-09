# 架构

英文版本：[ARCHITECTURE.md](ARCHITECTURE.md)。

## 数据流

`BaseAdapter` 将飞书 SDK 与 React 隔离。它加载当前选区、数据表、视图、有序字段元数据和可见记录 ID。记录标题在可用时使用 SDK 返回的已格式化主字段字符串。React 层只保存界面状态：选中的记录 ID、隐藏字段 ID、顺序和语言。它通过适配器读取宿主外观，应用浅色或深色呈现，但不持久化主题偏好。

比较矩阵在渲染时派生生成，绝不会写回、复制到或与多维表格记录一同持久化。

## 已验证的 SDK 范围

已安装的 `@lark-opdev/block-bitable-api` 声明提供了本项目使用的读取操作：

- `bitable.base.getSelection()` 和 `getTableById()`
- `table.getViewById()`、`getName()`，以及 `getViewMetaList()` 回退
- `view.getFieldMetaList()` 和 `getVisibleRecordIdList()`
- `table.getCellString()`，并以 `getCellValue()` 作为格式化回退
- 字段和记录变更监听器，以及 Base 选区变更监听器
- 用于读取和监听宿主外观的 `bitable.bridge.getTheme()` 和 `onThemeChange()`

未导入或调用任何 SDK 写入 API。如果宿主切换视图期间当前选区的视图暂时不可用，适配器会回退到该数据表的第一个可用视图，并在下一次选区事件发生时刷新。
在普通浏览器预览中如果飞书桥接不可用，主题 Hook 会临时回退到浏览器的配色方案偏好。

## 呈现层

`CompareTable` 接收字段元数据、选中记录元数据，以及以字段和记录 ID 为键的格式化显示字符串映射。这样可将复杂单元格类型限制在 SDK 边界处理，避免重新创建飞书原生编辑器。
