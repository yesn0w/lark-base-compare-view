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
npm ci
npm run typecheck
npm run start
```

The official Webpack development server opens the configured Base with a
debug-port parameter. Add the local data-table view plugin in the host, then
open it in a new tab.

The development configuration ignores `node_modules` and polls source changes
once per second. This avoids native watcher `EMFILE` failures in large
dependency trees; hot rebuilds can take up to about one second to begin.

## Repair a local installation

If `npm run start` reports
`Cannot find module '@bdeefe/feishu-devtools-core/libs/config/env'`, the
embedded runtime from the official CLI was not retained in `node_modules`.
Stop the server and run:

```sh
cd compare-view
npm ci
npm run check:opdev
```

`npm ci` recreates `node_modules` from `package-lock.json`. Do not use
`--ignore-scripts`: the CLI needs its `postinstall` recovery step.

## Host checklist

- Confirm the active table loads, with current-view records first and remaining
  table records after them.
- Select one record, confirm the matrix does not change, click Save, and then
  confirm its column appears. Repeat with 2–10 records.
- Confirm there is one unified candidate list only: a selected row has a dot
  drag handle before its checkbox, and dragging it changes the selected order.
- Add and remove text, choice, number, date, and checkbox filters. Confirm they
  affect only candidate rows, while saved filtered-out records stay in matrix.
- Add multi-rule sorting, confirm changing it resets selected order, then drag
  a selected row to make a manual adjustment.
- Group by a choice and a multi-value field; confirm each record appears in one
  group only, and test local candidate/matrix group collapse.
- Hide and restore fields, including the primary field. Confirm all result
  changes wait for Save and Discard restores the saved state.
- Open the same extension in a second tab. Save in one tab and confirm the
  other tab refreshes its shared configuration; verify last successful save
  wins when both tabs have a draft.
- Check text, select, date, number, relation, and person values. For attachment
  cells, verify one and several images, a mixed image/PDF value, empty values,
  all thumbnails remaining directly visible, the read-only gallery, keyboard
  navigation, and a filename fallback when a preview cannot load.
- Switch Feishu between light and dark appearance and confirm the view updates
  without a reload.
- Change a Base record or field and confirm the extension refreshes.
- Check five horizontal record columns and a table containing roughly 100
  records for usable scrolling and selector behavior.

## Pull request workflow

1. Safely update local `main`, then create a focused branch such as
   `feat/compare-view-controls`.
2. Make a conventional commit after staging only intended files. Inspect
   `git diff --check`, ignored local configuration, and the SDK write audit.
3. Run `npm run typecheck`, `npm run build`, and the bilingual-document check.
4. Push the branch, then create a draft PR with an English description followed
   by its Chinese equivalent. Verify the PR head matches the branch.

Never push work directly to `main`.

## Release boundary

This repository is prepared for local debugging and PR review only. Run
`npm run upload` and publish the Feishu app only after verifying requested
permissions, local host behavior, and the current app-release process in the
Feishu developer console.
