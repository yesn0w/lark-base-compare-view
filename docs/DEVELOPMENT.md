# Development and host verification

Chinese version: [DEVELOPMENT.zh-CN.md](DEVELOPMENT.zh-CN.md).

## Local configuration

The repository does not track its Feishu application binding. Copy
`app.json.example` to `app.json` and `compare-view/block.json.example` to
`compare-view/block.json`, then replace the placeholders locally.

Set `block.json.url` to a Base URL you are authorized to open. The placeholder
is deliberate: it prevents the official development helper from automatically
creating a sample Base when no URL is configured.

## Run

```sh
cd compare-view
npm install
npm run typecheck
npm run start
```

The official Webpack development server opens the configured Base with a
debug-port parameter. Add the local data-table view plugin in the host, then
open it in a new tab.

## Host checklist

- Confirm the active table and current view load.
- Confirm visible records, fields, and primary-field column titles load.
- Select, deselect, and reorder 2–10 records.
- Hide and restore fields, including the primary field.
- Check text, select, date, number, relation, person, and attachment values.
- Change a Base record or field and confirm the extension refreshes.
- Check five horizontal record columns and a view containing roughly 100
  records for usable scrolling and selector behavior.

## Release boundary

This repository is prepared for local debugging only. Run `npm run upload` and
publish the Feishu app only after verifying requested permissions, local host
behavior, and the current app-release process in the Feishu developer console.
