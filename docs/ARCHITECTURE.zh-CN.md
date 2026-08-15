# 架构

英文版本：[ARCHITECTURE.md](ARCHITECTURE.md)。

## 数据流

`BaseAdapter` 将飞书 SDK 与 React 隔离。它加载当前选区、按 Base 默认顺序排列的表格级字段元数据、当前视图的可见记录 ID，以及整个数据表的记录 ID 列表。已安装 SDK 未提供主字段标记，因此表格级字段列表中的第一个字段是主字段显示回退。适配器优先保留当前视图的记录顺序，再按已格式化的主字段标题排列其余候选记录。

`useCompareConfig` 维护两份类型化配置：

- **draft（草稿）**驱动选择器与本地筛选/分组/排序控制；
- **applied（已应用）**驱动矩阵，且只会在 `setData()` 成功后改变。

Bridge 载荷带有 schema 版本并限定到当前数据表与视图。它只包含插件设置：所选 ID、隐藏 ID、筛选条件、排序规则和分组字段。`DataChange` 会重新加载共享配置；未保存的本地草稿会被保留，并提示远端发生变更。

`useFieldValues` 会按需加载查询控制所需的原始字段值。`queryEngine` 是纯函数：规范化值、筛选、稳定排序、将所选记录的手动顺序插入候选列表，并让一条记录最多进入一个分组。`useCellValues` 仍负责矩阵的格式化显示文本。

宿主主题和语言属于呈现状态。语言与折叠状态不会写入 Bridge 载荷。

## SDK 边界

已安装的 `@lark-opdev/block-bitable-api` 声明提供了适配器所用的以下操作：

- `bitable.base.getSelection()`、`getTableById()` 和 `getPermission()`；
- 表格与视图元数据、`getRecordIdList()` 和可见记录 ID；
- 字段 `getFieldValueList()`，以及原始单元格值回退；
- `getCellString()`，以及 `getCellValue()` 格式化回退；
- 表格/Base 变更监听器，以及 Bridge 主题和数据变更监听器；
- `bitable.bridge.getData()` 和唯一允许的可变操作 `bitable.bridge.setData()`。

没有 SDK 调用会写入 Base 的记录、单元格、字段或视图。如果宿主切换期间当前选区的视图暂时不可用，适配器会回退到该数据表的第一个可用视图，并在下一次选区变更时刷新。

## 呈现层

`RecordSelector` 将所有可选记录放在同一个列表中。拖动把手只对已选行启用，后面的复选框负责选择。`CompareTable` 接收已保存的字段、已分组的已保存记录和格式化字符串；它负责仅矩阵使用的可折叠分组控制与固定表头。两个组件都不会重建飞书原生编辑器。
