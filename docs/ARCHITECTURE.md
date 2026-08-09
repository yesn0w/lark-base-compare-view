# Architecture

Chinese version: [ARCHITECTURE.zh-CN.md](ARCHITECTURE.zh-CN.md).

## Data flow

`BaseAdapter` isolates the Feishu SDK from React. It loads the active
selection, table, view, ordered field metadata, and visible record IDs. Record
headers use the SDK's formatted primary-field string when available. The React
layer stores only UI state: selected record IDs, hidden field IDs, order, and
language.

The comparison matrix is derived at render time. It is never written back to,
copied into, or persisted alongside Base records.

## Verified SDK surface

The installed `@lark-opdev/block-bitable-api` declarations provide the read
operations used by this project:

- `bitable.base.getSelection()` and `getTableById()`
- `table.getViewById()`, `getName()`, and `getViewMetaList()` fallback
- `view.getFieldMetaList()` and `getVisibleRecordIdList()`
- `table.getCellString()` with `getCellValue()` as a formatting fallback
- field and record change listeners plus Base selection change listening

No SDK write API is imported or called. If the active selection's view is
temporarily unavailable during a host view switch, the adapter falls back to
the table's first available view and refreshes on the next selection event.

## Presentation

`CompareTable` receives field metadata, selected record metadata, and a map of
formatted display strings keyed by field and record IDs. This keeps complex
cell types at the SDK boundary and avoids recreating Feishu native editors.
