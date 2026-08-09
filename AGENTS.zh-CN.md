# lark-base-compare-view

英文版本：[AGENTS.md](AGENTS.md)。

## 目的

本仓库实现 **Compare View** 飞书/Lark 多维表格数据表视图插件。它将字段显示为行、将选中的记录显示为列，且不会修改底层多维表格业务数据。

## 平台规则

- 保留飞书官方提供的 React、TypeScript 和 Webpack 插件基础设施。
- 以已安装的 `@lark-opdev/block-bitable-api` TypeScript 声明作为 SDK 可用能力的唯一依据。
- 将飞书 SDK 访问集中在 `compare-view/src/services/baseAdapter.ts`。
- 不使用未在文档中说明的飞书网络 API。

## 产品边界

- 绝不创建、编辑、删除、上传或以其他方式修改多维表格的业务记录、单元格、字段、视图或自动化；尤其不得调用表格/字段/记录的 `set*`、`add*` 或 `delete*` API。
- 唯一允许的可变 SDK 操作是 `BaseAdapter` 中的 `bitable.bridge.setData()`。它只保存带版本号的插件比较配置，绝不得用于保存多维表格业务数据。
- Bridge 数据只可保存所选记录 ID、隐藏字段、本地查询条件、排序规则和分组字段；不得持久化语言、主题或分组折叠状态。
- 所有改动先保留为草稿。比较矩阵只能使用最后一次成功保存的配置。
- 支持选择 1–10 条记录、本地筛选/分组/排序、横向滚动、字段可见性和已选记录的手动排序。
- 跟随当前飞书浅色/深色外观，且不保存单独的主题偏好。
- 不添加后端、数据库、登录流程、自动化或状态管理依赖。

## 安全

- 绝不提交 `app.json`、`compare-view/block.json`、`debug.json`、`.env`、令牌或密钥。
- 仅提交使用占位符的对应 `.example` 文件。
- 该前端插件源码树不需要 App Secret。

## Git 与 Pull Request

- 每次修改从最新 `main` 开始，并使用 `<type>/<short-description>` 命名的聚焦分支。
- 只暂存明确文件，检查 diff 和忽略规则，并使用 Conventional Commit 提交信息。
- 推送该分支并创建**草稿 Pull Request**；不得直接向 `main` 推送提交。

## 文档

- 无语言后缀的 Markdown 文件视为英文；中文 Markdown 文件使用 `<name>.zh-CN.md` 命名。
- 为面向用户和维护者的文档维护中文对应版本，并保持命令、路径、配置键和行为同步。
- 在每对文档的开头附近添加对应版本链接。每种语言版本中的内部链接必须指向同语言的对应文件。

## 验证

完成修改前，在 `compare-view` 目录中运行 `npm run typecheck` 和 `npm run build`，检查 diff，并确认源码中唯一可写的 SDK 调用是 `bitable.bridge.setData()`。
