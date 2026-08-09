# Lark Base Compare View

Chinese version: [README.zh-CN.md](README.zh-CN.md).

Compare View is a Feishu/Lark Base Data Table View Extension for side-by-side
record comparison. It never changes Base business records, fields, or native
view settings. Instead, it renders selected records as columns and fields as
rows:

| Field | Record A | Record B |
| --- | --- | --- |
| CPU | M4 | M4 Pro |
| Memory | 16 GB | 24 GB |

The UI supports Chinese and English, Feishu light/dark appearance, a sticky
field column, horizontal scrolling, safe display fallbacks for complex values,
and these staged comparison controls:

- Select 1–10 records from one candidate list. A selected row has a native-like
  drag handle before its checkbox; drag it to change its display order.
- Filter, sort, group, and choose visible fields locally in the extension. They
  never alter the native table view.
- Save to apply a draft. Until saving succeeds, the matrix continues to show
  the last saved configuration.
- Share saved extension configuration through the official bridge data store.
  This is the only write operation and never writes Base business data.

## Security

This public repository intentionally contains no Feishu deployment binding or
secret. Copy the example files locally and keep the real files untracked:

```sh
cp app.json.example app.json
cp compare-view/block.json.example compare-view/block.json
```

Fill in App ID, BlockTypeID, and a debug Base URL in those local files. Do not
put an App Secret in this project; rotate any value that has been exposed.

## Development

1. Create a Feishu enterprise custom app with the **Bitable Extension → Data
   Table View** capability.
2. Use the official CLI to log in: `opdev login` and choose `Feishu`.
3. Create the two local configuration files above.
4. Install and run the extension:

   ```sh
   cd compare-view
   npm ci
   npm run start
   ```

`npm ci` recreates the dependency tree from the lockfile. The official CLI
restores an embedded runtime during its lifecycle scripts, so do not pass
`--ignore-scripts`. `compare-view/.npmrc` serializes those scripts, and
`npm run start` verifies the required runtime before starting Webpack.

The development server ignores `node_modules` and polls for source changes once
per second. This avoids native watcher `EMFILE` failures in large dependency
trees; hot rebuilds can take up to about one second to begin.

For the MVP, request only the least Feishu Base permission needed for the read
APIs used by the extension, plus Base edit permission for users who should save
the shared extension configuration. Verify exact current permissions in the
Feishu console before publishing.

## Checks

```sh
cd compare-view
npm run typecheck
npm run build
```

## Contribution workflow

Start from current `main`, create a focused `<type>/<short-description>`
branch, stage explicit files, and inspect the diff and ignored configuration.
Push that branch and open a draft pull request; direct pushes to `main` are not
part of this project’s workflow. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
for host checks and the full PR handoff.

`npm run upload` remains available from the official template but is outside
this MVP's release scope.

## License

[MIT](LICENSE) © 2026 yesn0w.
