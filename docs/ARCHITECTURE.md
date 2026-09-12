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

`useCompareConfig` exposes two typed configurations plus pending width patches:

- **draft** drives the selector and local filter/group/sort controls;
- **applied** drives the matrix and changes only after `setData()` succeeds;
- pending widths overlay the matrix immediately and share without submitting the draft.

The bridge payload is schema-versioned and scoped to the current table and
view. It contains only extension settings: selected IDs, hidden IDs, filters,
sort rules, a group field, field order, wrapped field IDs, and column widths. `configAccess` reads an explicit per-table/view
bridge key, falls back to the legacy default key, and migrates readable legacy
data only when an editable web host is available. Shared-data reads, edit
capability checks, and event subscriptions fail independently: an unsupported
permission or subscription API makes the host read-only but never hides a
successfully loaded configuration. `DataChange` reloads shared configuration;
unsaved local drafts are retained and report a remote change.

`useFieldValues` loads raw field values lazily for query controls.
`queryEngine` is pure: it normalizes values, filters, stably sorts, and places a
record in at most one group. `deriveCandidateRecords` derives candidate order
from query rules without depending on selected-record or comparison-column order.
`useCellValues` loads structured matrix values containing stable
display text plus in-memory attachment presentation metadata. `cellLoading`
generates at most 12 cell-read tasks per batch and publishes each completed
batch. A failed cell falls back to an empty display value without discarding
other cells. Cancellation stops subsequent batches and ignores old results;
already-issued SDK calls may briefly overlap a new load. Field/record membership,
not order, identifies a request, so column reordering does not refetch cells.
Loaded values for retained cells are reused within the same adapter; a new
adapter clears old-source values, and removed cells leave the cache.

The version-1 schema and scoped bridge key remain unchanged. Selected IDs are
validated and deduplicated without a count limit or truncation.

The host theme and language are presentational state. Language and collapse
state never enter the bridge payload.

## SDK boundary

The installed `@lark-opdev/block-bitable-api` declarations provide these
operations used by the adapter:

- `bitable.base.getSelection()`, `getTableById()`, `getPermission()`, and the
  compatibility fallback `isEditable()`;
- table and view metadata, `getRecordIdList()`, and visible record IDs;
- field `getFieldValueList()` with a raw-cell fallback;
- `getCellString()` with `getCellValue()` formatting fallback, plus
  `getCellThumbnailUrls()` for image attachments;
- table/base change listeners plus bridge theme and data-change listeners;
- `bitable.bridge.getData()` and the single allowed mutation,
  `bitable.bridge.setData()`.

Mobile detection stays in `BaseAdapter`. A mobile host reads the same explicit
bridge key as the web host, skips edit-capability calls, and reports a
view-only access reason to React. Unsupported host event registrations degrade
to no-op subscriptions so initial rendering and manual refresh remain usable.

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
list, plus a local search box. Checkboxes change selection without changing
candidate positions. Dragging is available only on comparison column headers.

`CompareTable` receives saved fields, grouped saved records, structured display
values, and the set of differing field IDs. It owns matrix-only collapsible
group controls, sticky headers, the sticky field column and independent column resize handles,
record column reordering and removal, inline field-row expansion, and
the read-only attachment gallery. `StatBar` and `TableSkeleton` are
presentational. None of these components recreates a Feishu native editor.

`compareDiff` is pure. It compares only the stable formatted display text
already loaded by `useCellValues`, never temporary thumbnail URLs, so difference
marking needs no extra SDK call. Incomplete fields do not count as differences
and remain visible with loading placeholders even when differences-only is active;
they are filtered only when all requested cell values have arrived. `App` derives
the differing-field set once and reuses it for the status bar count, the row
markers, and the differences-only filter.

`CompareField.kind` collapses the SDK's field types into the shapes the grid
renders differently. `BaseAdapter` computes it so that `FieldType` stays behind
the SDK boundary and the React layer stays SDK-free.

## Field presentation state

Version 1 adds `fieldOrderIds` and `wrappedFieldIds`, both defaulting to `[]`.
Missing or malformed arrays default empty; valid arrays are deduplicated and
filtered to existing field IDs. Empty field order uses source order. `orderFields`
places configured IDs first and appends remaining fields in source order; the
same pure function drives draft controls and applied rows. New fields are visible
and unwrapped; default primary-field hiding is unchanged. Cloning separates both
arrays between draft and applied configuration. Old builds ignore these settings
and may discard them on save; use the updated build in all test tabs.

`App` owns temporary expanded IDs independently of shared config and prunes them
against saved visible fields. `CompareTable` combines saved wrapping and temporary
expansion; `FieldSelector` edits only draft settings. Sorting and wrapping leave
cell membership unchanged and therefore do not refetch loaded cells.

## Column widths and image browsing

Column widths are an immediate, automatically shared exception to other drafts.
Sharing displays a separate status. Failure retains the local layout with Retry
and Restore shared widths; Discard affects other drafts only. Ordinary Save waits
for width sharing and stops if it fails. Refresh/source changes prompt when widths
are pending; a full-page departure uses the browser's unsaved-change warning.

Version 1 adds `fieldColumnWidth: number | null` (default `null`) and
`recordColumnWidths: Record<string, number>` (default `{}`). Finite values are
rounded and clamped; malformed values and deleted record IDs are removed. Widths
for unselected existing records remain. Object key ordering is not a setting.
Old builds may discard new settings on save; test all tabs with the current build.

`ConfigController` separates applied settings, ordinary drafts and pending width
patches. A single `ConfigWriteQueue` serializes reads/writes across sources. Width
writes read the current shared configuration and patch only widths; ordinary saves
merge the latest shared widths. A failed read never triggers a stale write. Pending
local widths overlay remote changes; other columns update immediately. There is
no cross-page atomic merge guarantee: simultaneous saves can still overwrite.

`App` owns image positions by field/record within the source session. Sorting,
group collapse, differences-only filtering and unrelated saves preserve them;
saved hiding/removal, changed attachments, source changes and explicit refresh
clear the affected positions. Images and URLs never enter shared configuration.
Resizing and switching images do not change cell load keys or issue extra reads.
