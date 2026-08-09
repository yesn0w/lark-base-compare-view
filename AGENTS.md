# lark-base-compare-view

Chinese version: [AGENTS.zh-CN.md](AGENTS.zh-CN.md).

## Purpose

This repository implements **Compare View**, a Feishu/Lark Base Data Table View
Extension. It presents fields as rows and selected records as columns without
changing the underlying Base data.

## Platform rules

- Preserve the official React, TypeScript, and Webpack extension infrastructure.
- Treat the installed `@lark-opdev/block-bitable-api` TypeScript declarations as
  the source of truth for SDK availability.
- Keep Feishu SDK access in `compare-view/src/services/baseAdapter.ts`.
- Do not use undocumented Feishu network APIs.

## MVP boundaries

- Read only: never call SDK `set*`, `add*`, `delete*`, upload, or persistence APIs.
- Do not add a backend, database, login flow, automation, or state-management dependency.
- Keep comparison UI state in React only; do not save it to Base.
- Support 2–10 selected records, horizontal scrolling, field visibility, and record ordering.

## Security

- Never commit `app.json`, `compare-view/block.json`, `debug.json`, `.env`, tokens, or secrets.
- Commit only the corresponding `.example` files with placeholders.
- App Secret values are never needed by this frontend extension source tree.

## Documentation

- Treat unsuffixed Markdown files as English and Chinese Markdown files as
  `<name>.zh-CN.md`.
- Maintain Chinese counterparts for user-facing and maintainer-facing
  documentation, keeping commands, paths, configuration keys, and behavior in
  sync.
- Put a link to the counterpart near the top of each paired document. Internal
  links in each version must point to the same-language counterpart.

## Verification

Before completing a change, run `npm run typecheck` and `npm run build` inside
`compare-view`, inspect the diff, and verify that no write SDK calls are present.
