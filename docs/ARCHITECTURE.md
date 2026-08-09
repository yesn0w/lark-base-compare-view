# Architecture

Chinese version: [ARCHITECTURE.zh-CN.md](ARCHITECTURE.zh-CN.md).

## Data flow

`BaseAdapter` isolates the Feishu SDK from React. It loads the active
selection, table, current view, ordered field metadata, visible record IDs, and
the entire table record-ID list. The adapter prioritizes current-view order,
then orders the remaining candidates by their formatted primary-field title.

`useCompareConfig` keeps two typed configurations:

- **draft** drives the selector and local filter/group/sort controls;
- **applied** drives the matrix and changes only after `setData()` succeeds.

The bridge payload is schema-versioned and scoped to the current table and
view. It contains only extension settings: selected IDs, hidden IDs, filters,
sort rules, and a group field. `DataChange` reloads shared configuration;
unsaved local drafts are retained and report a remote change.

`useFieldValues` loads raw field values lazily for query controls.
`queryEngine` is pure: it normalizes values, filters, stably sorts, inserts the
manual selected-record order into the candidate list, and places a record in at
most one group. `useCellValues` remains responsible for formatted matrix text.

The host theme and language are presentational state. Language and collapse
state never enter the bridge payload.

## SDK boundary

The installed `@lark-opdev/block-bitable-api` declarations provide these
operations used by the adapter:

- `bitable.base.getSelection()`, `getTableById()`, and `getPermission()`;
- table and view metadata, `getRecordIdList()`, and visible record IDs;
- field `getFieldValueList()` with a raw-cell fallback;
- `getCellString()` with `getCellValue()` formatting fallback;
- table/base change listeners plus bridge theme and data-change listeners;
- `bitable.bridge.getData()` and the single allowed mutation,
  `bitable.bridge.setData()`.

No SDK call writes a Base record, cell, field, or view. If the active selection
view is temporarily unavailable during a host switch, the adapter falls back to
the table’s first available view and refreshes on the next selection event.

## Presentation

`RecordSelector` contains every selectable record in one list. Its draggable
handle is enabled only for selected rows, while the following checkbox controls
selection. `CompareTable` receives saved fields, grouped saved records, and
formatted strings; it owns matrix-only collapsible group controls and sticky
headers. Neither component recreates Feishu native editors.
