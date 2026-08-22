# 开发与宿主验证

英文版本：[DEVELOPMENT.md](DEVELOPMENT.md)。

## 本地配置

仓库不会跟踪飞书应用绑定信息。将 `app.json.example` 复制为 `app.json`，将 `compare-view/block.json.example` 复制为 `compare-view/block.json`，然后仅在本地替换占位符。

将 `block.json.url` 设置为你有权打开的 Base URL。该占位符是有意保留的：未配置 URL 时，它可阻止官方开发辅助工具自动创建示例 Base。

## 运行

```sh
cd compare-view
npm ci
npm run typecheck
npm run start
```

官方 Webpack 开发服务器会使用调试端口参数打开已配置的 Base。请在宿主中添加本地数据表视图插件，再在新标签页中打开它。

开发配置会忽略 `node_modules`，并每秒轮询一次源码变更。这可避免大型依赖树中的原生监视器 `EMFILE` 错误；热重编译开始前最多可能有约一秒延迟。

## 修复本地安装

如果 `npm run start` 报错 `Cannot find module '@bdeefe/feishu-devtools-core/libs/config/env'`，说明官方 CLI 的嵌入式运行时未被保留在 `node_modules` 中。请停止开发服务器并运行：

```sh
cd compare-view
npm ci
npm run check:opdev
```

`npm ci` 会根据 `package-lock.json` 重新创建 `node_modules`。请勿使用 `--ignore-scripts`：CLI 需要执行其 `postinstall` 恢复步骤。

## 宿主检查清单

- 确认当前数据表能够加载，且当前视图中的记录优先显示，其余数据表记录紧随其后。
- 选择一条记录，确认矩阵不会立即变化；点击保存后确认该列出现。再用 2–10 条记录重复检查。
- 确认只有一个统一候选列表：已选行的复选框前有点状拖动把手，拖动后会改变所选记录顺序。
- 添加并删除文本、选项、数字、日期和复选框筛选条件。确认它们只影响候选行，而已保存但被筛掉的记录仍留在矩阵中。
- 添加多条排序规则，确认修改排序会重置所选顺序；随后拖动已选行进行手动调整。
- 使用选项字段和多值字段分组；确认每条记录只出现于一个分组，并测试候选区/矩阵分组的本地折叠。
- 隐藏并恢复字段，包括主字段。确认所有影响结果的改动都等待保存，且放弃修改会恢复已保存状态。
- 在第二个标签页打开同一插件。在一个标签页中保存，确认另一个标签页会刷新共享配置；当两个标签页都有草稿时，验证最后一次成功保存生效。
- 检查文本、单选、多选、日期、数字、关联和人员值。对于附件单元格，验证单张与多张图片、图片/PDF 混合值、空值、全部缩略图直接显示、只读图库、键盘切换，以及预览无法加载时的文件名回退。
- 在飞书中切换浅色和深色外观，确认视图无需刷新即可更新。
- 修改一条 Base 记录或字段，确认插件会刷新。
- 检查 5 列横向记录，以及含约 100 条记录的数据表，确认滚动和选择器行为可用。

## Pull Request 工作流

1. 安全更新本地 `main`，再创建聚焦分支，例如 `feat/compare-view-controls`。
2. 只暂存目标文件后使用 Conventional Commit 提交。检查 `git diff --check`、被忽略的本地配置和 SDK 写入审计。
3. 运行 `npm run typecheck`、`npm run build` 和双语文档检查。
4. 推送分支，再创建草稿 PR；PR 描述先写英文，再写对应中文。确认 PR head 与该分支一致。

绝不直接向 `main` 推送工作提交。

## 发布边界

本仓库仅为本地调试和 PR 审查做好准备。只有在飞书开发者后台验证所需权限、本地宿主行为及当前应用发布流程之后，才运行 `npm run upload` 并发布飞书应用。
