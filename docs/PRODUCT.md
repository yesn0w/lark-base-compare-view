# Product: Compare View

Chinese version: [PRODUCT.zh-CN.md](PRODUCT.zh-CN.md).

## Goal

Compare multiple records from the current Feishu Base view without modifying
the table. Conventional Base presentation maps records to rows and fields to
columns; Compare View renders fields vertically and selected records
horizontally.

## MVP behavior

- Read the current table and current view where the SDK makes them available.
- List records visible to that view and let the user select up to 10.
- Use the first ordered field as the primary-field display fallback because the
  installed SDK does not expose an explicit primary-field flag.
- Display all non-primary fields by default; users can show the primary field
  or hide any other field.
- Reorder selected records with accessible arrow controls.
- Render empty cells as `—`, retain a fixed field-name column, and support
  horizontal scrolling.
- Provide a Chinese/English session-only language selector.

## Non-goals

The MVP does not edit cells, write Base data, persist comparison settings, add
a backend or database, implement authentication or automation, or calculate
field differences.
