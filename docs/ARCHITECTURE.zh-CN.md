# 架构

英文版本：[ARCHITECTURE.md](ARCHITECTURE.md)。

## 数据流

`BaseAdapter` 将飞书 SDK 与 React 隔离。它加载当前选区、表格级字段元数据、当前视图的可见记录 ID，以及整个数据表的记录 ID 列表。它通过 `IFieldMeta.isPrimary` 识别唯一主字段，将其置于 Compare View 的首位，并使用其格式化值作为记录标题。字段元数据的位置绝不会用于推断主字段。适配器优先保留当前视图的记录顺序，再按已格式化的主字段标题排列其余候选记录。

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

`QueryToolbar` 是唯一的工具条。它负责浮层定位、点击外部与 Escape 关闭，以及行高菜单；但其展开的面板由 `App` 控制，以便空状态能够打开记录浮层。`App` 以插槽方式传入记录面板和保存操作，使草稿与配置逻辑不进入工具条。

`RecordSelector` 渲染该记录面板：所有可选记录放在同一个列表中，并附带本地搜索框。拖动把手只对已选行启用，后面的复选框负责选择。

`CompareTable` 接收已保存的字段、已分组的已保存记录、格式化字符串以及存在差异的字段 ID 集合。它负责仅矩阵使用的可折叠分组控制、固定表头、固定字段列及其宽度拖拽手柄、记录列的排序与移除，以及用于展示被截断内容的 `CellExpandDialog`。`StatBar` 与 `TableSkeleton` 是纯展示组件。这些组件都不会重建飞书原生编辑器。

`compareDiff` 是纯函数。它比较 `useCellValues` 已加载的格式化显示文本，因此差异标记不需要额外的 SDK 调用。`App` 只计算一次差异字段集合，并复用于统计条计数、行首标记和「仅看差异」筛选。

`CompareField.kind` 将 SDK 的字段类型归并为网格需要区分渲染的几种形态。它由 `BaseAdapter` 计算，从而使 `FieldType` 保持在 SDK 边界之内，React 层不直接依赖 SDK。
