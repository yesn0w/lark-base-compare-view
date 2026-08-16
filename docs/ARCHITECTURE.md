# Architecture

Chinese version: [ARCHITECTURE.zh-CN.md](ARCHITECTURE.zh-CN.md).

## Data flow

`BaseAdapter` isolates the Feishu SDK from React. It loads the active
selection, table-level field metadata, the current view's visible record IDs,
and the entire table record-ID list. It identifies the unique primary field
from `IFieldMeta.isPrimary`, places it first in Compare View, and uses its
formatted values as record titles. Metadata position is never used to infer
which field is primary. The adapter prioritizes current-view record order, then
orders the remaining candidates by their formatted primary-field title.

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

`QueryToolbar` is the single toolbar. It owns popover placement, outside-pointer
and Escape dismissal, and the row-height menu, but its open panel is controlled
by `App` so the empty state can open the records popover. `App` passes the
records panel and the save actions in as slots, keeping draft and configuration
wiring out of the toolbar.

`RecordSelector` renders that records panel: every selectable record in one
list, plus a local search box. Its draggable handle is enabled only for
selected rows, while the following checkbox controls selection.

`CompareTable` receives saved fields, grouped saved records, formatted strings,
and the set of differing field IDs. It owns matrix-only collapsible group
controls, sticky headers, the sticky field column and its resize handle, record
column reordering and removal, and `CellExpandDialog` for clipped values.
`StatBar` and `TableSkeleton` are presentational. None of these components
recreates a Feishu native editor.

`compareDiff` is pure. It compares the formatted display text already loaded by
`useCellValues`, so difference marking needs no extra SDK call. `App` derives
the differing-field set once and reuses it for the status bar count, the row
markers, and the differences-only filter.

`CompareField.kind` collapses the SDK's field types into the shapes the grid
renders differently. `BaseAdapter` computes it so that `FieldType` stays behind
the SDK boundary and the React layer stays SDK-free.
