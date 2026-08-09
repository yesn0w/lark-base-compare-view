# lark-base-compare-view

英文版本：[AGENTS.md](AGENTS.md)。

## 目的

本仓库实现 **Compare View** 飞书/Lark 多维表格数据表视图插件。它将字段显示为行、将选中的记录显示为列，且不会修改底层多维表格数据。

## 平台规则

- 保留飞书官方提供的 React、TypeScript 和 Webpack 插件基础设施。
- 以已安装的 `@lark-opdev/block-bitable-api` TypeScript 声明作为 SDK 可用能力的唯一依据。
- 将飞书 SDK 访问集中在 `compare-view/src/services/baseAdapter.ts`。
- 不使用未在文档中说明的飞书网络 API。

## MVP 边界

- 只读：绝不调用 SDK 的 `set*`、`add*`、`delete*`、上传或持久化 API。
- 不添加后端、数据库、登录流程、自动化或状态管理依赖。
- 比较界面状态仅保留在 React 中；不保存到多维表格。
- 支持选择 2–10 条记录、横向滚动、字段可见性和记录排序。

## 安全

- 绝不提交 `app.json`、`compare-view/block.json`、`debug.json`、`.env`、令牌或密钥。
- 仅提交使用占位符的对应 `.example` 文件。
- 该前端插件源码树不需要 App Secret。

## 文档

- 无语言后缀的 Markdown 文件视为英文；中文 Markdown 文件使用 `<name>.zh-CN.md` 命名。
- 为面向用户和维护者的文档维护中文对应版本，并保持命令、路径、配置键和行为同步。
- 在每对文档的开头附近添加对应版本链接。每种语言版本中的内部链接必须指向同语言的对应文件。

## 验证

完成修改前，在 `compare-view` 目录中运行 `npm run typecheck` 和 `npm run build`，检查 diff，并确认不存在 SDK 写入调用。
