# Lark Base Compare View

This repository starts from the official Feishu/Lark Base **Data Table View**
React + TypeScript + Webpack template. It is a sanitized baseline for the
Compare View extension.

The real application binding is intentionally local:

```sh
cp app.json.example app.json
cp compare-view/block.json.example compare-view/block.json
```

Replace the placeholders in the copied files. Do not commit App Secret values,
debug Base URLs, or deployment identifiers.

The next commit implements the read-only comparison experience.
