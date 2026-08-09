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

- 确认当前数据表和当前视图能够加载。
- 确认可见记录、字段和主字段列标题能够加载。
- 选择、取消选择并重新排序 1–10 条记录。
- 隐藏并恢复字段，包括主字段。
- 检查文本、单选、多选、日期、数字、关联、人员和附件值。
- 在飞书中切换浅色和深色外观，确认视图无需刷新即可更新。
- 修改一条 Base 记录或字段，确认插件会刷新。
- 检查 5 列横向记录，以及含约 100 条记录的视图，确认滚动和选择器行为可用。

## 发布边界

本仓库仅为本地调试做好准备。只有在飞书开发者后台验证所需权限、本地宿主行为及当前应用发布流程之后，才运行 `npm run upload` 并发布飞书应用。
