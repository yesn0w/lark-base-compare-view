# Lark Base Compare View

Chinese version: [README.zh-CN.md](README.zh-CN.md).

Compare View is a read-only Feishu/Lark Base Data Table View Extension for
side-by-side record comparison. Instead of changing Base data, it renders the
current view as a comparison matrix:

| Field | Record A | Record B |
| --- | --- | --- |
| CPU | M4 | M4 Pro |
| Memory | 16 GB | 24 GB |

The UI supports Chinese and English, field visibility, record selection and
ordering, a sticky field column, horizontal scrolling, safe display fallbacks
for complex values, and the current Feishu light/dark appearance.

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

For the MVP, request only the least Feishu Base permission needed for the
read APIs used by the extension (normally the read-only Bitable user-access
scope); verify the exact requirement in the current Feishu console before
publishing.

## Checks

```sh
cd compare-view
npm run typecheck
npm run build
```

`npm run upload` remains available from the official template but is outside
this MVP's release scope. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for
the host-environment checklist.

## License

[MIT](LICENSE) © 2026 yesn0w.
