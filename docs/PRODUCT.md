# Product: Compare View

Chinese version: [PRODUCT.zh-CN.md](PRODUCT.zh-CN.md).

## Goal

Compare records from the current Feishu Base table without modifying the table.
Conventional Base presentation maps records to rows and fields to columns;
Compare View renders fields vertically and saved records horizontally.

## Behavior

- The candidate source is the whole current table. The current view’s visible
  record order comes first; remaining records follow in primary-field order.
- Field selection and matrix rows place the SDK-identified primary field first;
  all other fields retain their table metadata order. The current view does not
  reorder fields in Compare View.
- All controls live on one toolbar: records, fields, filter, group, sort, and
  row height, with save state and the save actions at its trailing end.
- Select 1–10 records in a single candidate list inside the **Records**
  popover, which also offers a search box and a clear action. Each selected row
  has a drag handle before its checkbox. Dragging changes saved comparison
  order; a separate selected-record list is intentionally not shown.
- A status bar under the toolbar reports compared records, visible fields, and
  how many fields differ, and offers a **Differences only** filter that hides
  fields whose compared values are identical.
- A field whose compared values are not all identical is marked with a colored
  bar on its row header, and its cells are emphasized.
- Row height offers four densities. Grid text stays on one line; a value too
  long for its cell gets an inline expand action that opens it in a read-only
  dialog.
- An attachment cell shows up to four image thumbnails and a remaining-image
  count. Clicking either opens a read-only gallery with keyboard navigation;
  non-image files and unavailable previews remain readable by filename.
- A record column header can be reordered by dragging or dropped from the
  comparison with its close action. Both edit the draft, so the column stays
  visible, marked as pending, until the change is saved.
- The field column can be resized by dragging or with the arrow keys.
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
- Empty values render as `—`. The matrix uses SDK-formatted display text when
  possible and safely degrades for complex cells.

## Save and sharing

All result-affecting controls are drafts. **Save** is the only action that
updates the comparison matrix; **Discard** restores the last saved
configuration and **Reset** prepares default values for a later save.

Saved configuration contains selected record IDs, hidden field IDs, filter
rules, sort rules, and the group field. It is shared through Feishu’s official
bridge data store. Base edit users may save; read-only users can load the last
saved configuration. Concurrent saves use last-successful-write behavior.

Chinese/English choice, Feishu appearance, collapsed groups, row height, the
differences-only filter, and the field-column width remain local to the current
session.

Attachment thumbnail URLs are temporary presentation data. They remain only in
memory, refresh with Base data, and never enter the saved bridge configuration.

## Non-goals

Compare View does not edit cells, write Base business data, change native Base
view settings, add a backend or database, implement authentication or
automation, download or upload attachments, or publish an extension package.
The only permitted SDK mutation is bridge configuration storage; it is not a
Base data write.

Difference marking compares the formatted display text of the compared records
and reports only whether a field's values are identical. It is not a semantic
or numeric diff: it computes no deltas, no per-character ranges, and no
field-type-aware comparison.
