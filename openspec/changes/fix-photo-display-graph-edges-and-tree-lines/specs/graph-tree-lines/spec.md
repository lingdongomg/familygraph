## ADDED Requirements

### Requirement: Bracket Style Parent-Child Edges
图谱中的亲子连线 SHALL 采用 bracket/tree 形样式（类似生物亲代图谱），替代当前的直线连接。配偶边和兄弟姐妹边保持原有样式不变。

#### Scenario: 多子女的 bracket 连线
- **WHEN** 图谱中某父/母有多个子女节点
- **THEN** 绘制 bracket 形连线：父母节点向下短竖线 → 水平横线覆盖所有子女 X 范围 → 每个子女向上短竖线连接横线
- **AND** 连线颜色保持蓝色（#1565C0）

#### Scenario: 单子女退化为竖线
- **WHEN** 图谱中某父/母只有一个子女
- **THEN** 绘制简单竖线连接父母和子女（竖线→短横线→竖线，视觉等同于直线但保持统一风格）

#### Scenario: 配偶和兄弟边样式不变
- **WHEN** 图谱中存在配偶边或兄弟姐妹边
- **THEN** 配偶边仍为红色实线直连，兄弟姐妹边仍为灰色虚线直连
