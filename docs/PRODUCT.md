# Product: Compare View

Chinese version: [PRODUCT.zh-CN.md](PRODUCT.zh-CN.md).

## Goal

Compare records from the current Feishu Base table without modifying the table.
Conventional Base presentation maps records to rows and fields to columns;
Compare View renders fields vertically and saved records horizontally.

## Behavior

- The candidate source is the whole current table. The current view’s visible
  record order comes first; remaining records follow in primary-field order.
- Default field order follows the adapter: the SDK-identified primary field
  first, followed by table metadata order. The Fields popover can stage a
  different order for visible and hidden fields together.
- All controls live on one toolbar: records, fields, filter, group, sort, and
  row height, with save state and the save actions at its trailing end.
- Select one or more records without a plugin-defined count limit in a single
  candidate list inside the **Records**
  popover, which also offers a search box and a clear action. Checking or
  unchecking never reorders candidates. New selections append to the comparison
  order; deselecting and reselecting appends again. Only comparison headers
  support manual dragging, and changes apply after saving.
- A status bar under the toolbar reports compared records, visible fields, and
  how many fields differ, and offers a **Differences only** filter that hides
  fields whose compared values are identical.
- A field whose compared values are not all identical is marked with a colored
  bar on its row header, and its cells are emphasized.
- Row height offers four minimum heights. Each field can wrap independently,
  including labels, tags, and attachment filenames. Wrapping preserves newlines
  and breaks long strings within the existing column width; rows grow to fit.
  Attachment filename wrapping is independent of the fixed image area.
- Non-attachment text longer than 36 characters or containing a newline offers
  Expand when its row is not wrapped. It immediately expands the entire row;
  Collapse beside the field name restores the saved wrapping setting. Multiple
  rows may expand, including on read-only/mobile hosts.
- An attachment cell shows its current image, fully contained in a 240px-high
  area independent of row height. Previous/Next controls retain source order,
  disable at the ends and synchronize with the read-only preview. Missing or
  failed images keep their position and filename; other files appear below.
  Only the current image mounts, with lazy loading; no gallery preloading.
- A record column header can be reordered by dragging or dropped from the
  comparison with its close action. Both edit the draft, so the column stays
  visible, marked as pending, until the change is saved.
- All columns resize independently: field default 200px (140–420px), record
  default 220px (160–800px). Record IDs retain widths across sorting, grouping
  and deselection. The table uses the exact sum of widths and scrolls horizontally.
  Drag to preview and release to share; Escape/cancel restores the gesture.
  Arrow keys change 16px and share after 300ms idle or blur. Double-click or
  Home restores that column's default. Read-only/mobile hosts cannot resize.
- Default visibility contains all non-primary fields. The SDK-identified
  primary field becomes the record-column title and may be shown as a normal
  matrix row.
- Filter, sort, group, and field visibility are extension-local controls. They
  never alter a native Base filter, group, sort, or view setting.
- A filter on a select field picks its options from a checkbox list and accepts
  more than one of them. A record matches only when it satisfies the operator
  for every chosen option.
- A filter removes candidates from the selector but never removes an already
  saved comparison record. A sort-rule change resets the selected records to
  the new sort order; drag can then make a manual adjustment.
- Grouping puts a record in its first normalized value only, so a multi-value
  field never duplicates a comparison column. Candidate and matrix group
  sections can be collapsed locally; collapse state is not saved.
- Cells load progressively in batches of at most 12. Pending cells show
  `Loading…`, and incomplete fields do not count as differences or get hidden by
  **Differences only** until loading finishes. A failed read keeps the existing
  empty-value fallback without clearing other cells.
- Empty values render as `—`. The matrix uses SDK-formatted display text when
  possible and safely degrades for complex cells.

## Save and sharing

Record, query, and field controls are drafts. **Save** applies those settings to
the comparison matrix; **Discard** restores the last saved
configuration and **Reset** prepares default values for a later save.

Saved configuration contains selected record IDs, hidden field IDs, filter
rules, sort rules, the group field, field order, wrapped field IDs, and column widths. It is shared through Feishu’s official
bridge data store. Base edit users may save; read-only users can load the last
saved configuration. The Feishu mobile app also loads that saved configuration
but keeps every result-affecting control read-only; creation and editing happen
on the web or desktop client. Concurrent saves use last-successful-write
behavior. An empty selection can be saved and shows the selection guide.
Version-1 saved configurations remain compatible without migration. The plugin
does not impose a record count limit; if the host rejects a save, the draft and
last successful comparison are retained. Older plugin versions still truncate
selections when reading, so use the updated version in every validation tab.

Chinese/English choice, Feishu appearance, collapsed groups, row height, the
differences-only filter, temporary row expansion, and attachment image positions
remain local to the current session.

Attachment thumbnail URLs are temporary presentation data. They remain only in
memory, refresh with Base data, and never enter the saved bridge configuration.

## Non-goals

Compare View does not edit cells, write Base business data, change native Base
view settings, add a backend or database, implement authentication or
automation, download or upload attachments, or publish an extension package.
The only permitted SDK mutation is bridge configuration storage; it is not a
Base data write.

Creating a Compare View from the Feishu mobile app is also outside the
extension runtime. The host must create and bind the custom view before this
React application can load, so mobile users open a view previously created on
the web or desktop client.

Difference marking compares the formatted display text of the compared records
and reports only whether a field's values are identical. It is not a semantic
or numeric diff: it computes no deltas, no per-character ranges, and no
field-type-aware comparison.

## Field display controls

The Fields popover has a drag handle, visibility checkbox, field name, and wrap
switch per item. Hidden fields remain in the same ordered list, retain wrapping,
and return to their position when shown. Handle dragging supports insertion at
both ends and edge scrolling; Alt + Up/Down provides keyboard movement and a
position announcement. Show/Hide all changes only visibility; Reset field order
changes only order. These actions require edit permission and are disabled while
saving. Discard and failed saves preserve the last successful matrix.

Temporary expansion survives sorting, grouping, differences-only filtering, and
unrelated saves. Hiding or deleting a field clears that field's expansion;
changing source, refreshing data, or reloading clears all temporary expansion.
Turning saved wrapping off leaves a temporarily expanded row open until Collapse.

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

Image positions are temporary within the source session. Sorting,
group collapse, differences-only filtering and unrelated saves preserve them;
saved hiding/removal, changed attachments, source changes and explicit refresh
clear the affected positions. Images and URLs never enter shared configuration.
Resizing and switching images do not change cell load keys or issue extra reads.

Collapsed groups expose an Expand group action above the matrix, including when every group is collapsed. This reading action preserves widths and image positions.
