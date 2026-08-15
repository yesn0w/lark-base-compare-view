# Product: Compare View

Chinese version: [PRODUCT.zh-CN.md](PRODUCT.zh-CN.md).

## Goal

Compare records from the current Feishu Base table without modifying the table.
Conventional Base presentation maps records to rows and fields to columns;
Compare View renders fields vertically and saved records horizontally.

## Behavior

- The candidate source is the whole current table. The current view’s visible
  record order comes first; remaining records follow in primary-field order.
- Field selection and matrix rows use the table-level default field order; the
  current view does not reorder fields in Compare View.
- Select 1–10 records in a single candidate list. Each selected row has a
  drag handle before its checkbox. Dragging changes saved comparison order; a
  separate selected-record list is intentionally not shown.
- Default visibility contains all non-primary fields. The first table-level
  field is the primary-field fallback, becomes the record-column title, and
  may be shown as a normal matrix row.
- Filter, sort, group, and field visibility are extension-local controls. They
  never alter a native Base filter, group, sort, or view setting.
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

Chinese/English choice, Feishu appearance, and collapsed groups remain local to
the current session.

## Non-goals

Compare View does not edit cells, write Base business data, change native Base
view settings, add a backend or database, implement authentication or
automation, calculate field differences, or publish an extension package. The
only permitted SDK mutation is bridge configuration storage; it is not a Base
data write.
