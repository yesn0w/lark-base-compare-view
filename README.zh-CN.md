# Lark Base Compare View

英文版本：[README.md](README.md)。

Compare View 是一个只读的飞书/Lark 多维表格数据表视图插件，用于并排比较记录。它不会修改多维表格数据，而是将当前视图渲染为比较矩阵：

| 字段 | 记录 A | 记录 B |
| --- | --- | --- |
| CPU | M4 | M4 Pro |
| 内存 | 16 GB | 24 GB |

界面支持中英文、字段显示控制、记录选择与排序、固定字段列、横向滚动，以及复杂值的安全显示降级。

## 安全

此公开仓库不会包含飞书部署绑定信息或密钥。请在本地复制示例文件，并保持真实文件不被 Git 跟踪：

```sh
cp app.json.example app.json
cp compare-view/block.json.example compare-view/block.json
```

在这些本地文件中填写 App ID、BlockTypeID 和调试 Base URL。请不要将 App Secret 写入本项目；如任何值曾被暴露，请先在飞书开发者后台轮换。

## 开发

1. 创建具有 **Bitable Extension → Data Table View** 能力的飞书企业自建应用。
2. 使用官方 CLI 登录：`opdev login`，并选择 `Feishu`。
3. 创建上述两个本地配置文件。
4. 安装并运行插件：

   ```sh
   cd compare-view
   npm install
   npm run start
   ```

`compare-view/.npmrc` 会串行执行生命周期脚本，因为官方 Webpack 工具依赖较旧的 opdev 包，在较新的 npm 版本中并行执行时可能发生竞争。

对于 MVP，仅申请插件所用读取 API 所需的最小飞书多维表格权限（通常为只读的 Bitable 用户访问权限）；发布前请在最新的飞书控制台中核对确切要求。

## 检查

```sh
cd compare-view
npm run typecheck
npm run build
```

官方模板保留了 `npm run upload`，但该命令不属于本 MVP 的发布范围。请参阅 [docs/DEVELOPMENT.zh-CN.md](docs/DEVELOPMENT.zh-CN.md) 了解宿主环境检查清单。

## 许可证

[MIT](LICENSE) © 2026 yesn0w。
