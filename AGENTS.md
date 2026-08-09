# lark-base-compare-view

Chinese version: [AGENTS.zh-CN.md](AGENTS.zh-CN.md).

## Purpose

This repository implements **Compare View**, a Feishu/Lark Base Data Table View
Extension. It presents fields as rows and selected records as columns without
changing underlying Base business data.

## Platform rules

- Preserve the official React, TypeScript, and Webpack extension infrastructure.
- Treat the installed `@lark-opdev/block-bitable-api` TypeScript declarations as
  the source of truth for SDK availability.
- Keep Feishu SDK access in `compare-view/src/services/baseAdapter.ts`.
- Do not use undocumented Feishu network APIs.

## Product boundaries

- Never create, edit, delete, upload, or otherwise mutate Base business
  records, cells, fields, views, or automations. In particular, do not call
  table/field/record `set*`, `add*`, or `delete*` APIs.
- The sole permitted mutating SDK operation is
  `bitable.bridge.setData()` in `BaseAdapter`. It stores the versioned,
  extension-only compare configuration and must never be repurposed for Base
  business data.
- Use bridge data only for selected record IDs, hidden fields, local query
  rules, sort rules, and the group field. Do not persist language, theme, or
  collapsed groups.
- Keep staged changes as a draft. The comparison matrix must use only the last
  successfully saved configuration.
- Support 1–10 selected records, local filter/group/sort controls, horizontal
  scrolling, field visibility, and manual selected-record ordering.
- Follow the current Feishu light/dark appearance without storing a separate
  theme preference.
- Do not add a backend, database, login flow, automation, or state-management
  dependency.

## Security

- Never commit `app.json`, `compare-view/block.json`, `debug.json`, `.env`,
  tokens, or secrets.
- Commit only the corresponding `.example` files with placeholders.
- App Secret values are never needed by this frontend extension source tree.

## Git and pull requests

- Start each change from an up-to-date `main` and use a focused branch named
  `<type>/<short-description>`.
- Stage explicit files only, inspect the diff and ignored files, and use a
  conventional commit message.
- Push the branch and open a **draft pull request**. Do not push commits
  directly to `main`.

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
`compare-view`, inspect the diff, and confirm that `bitable.bridge.setData()`
is the only write-capable SDK call in the source.
