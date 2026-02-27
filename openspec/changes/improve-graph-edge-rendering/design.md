## Context
图谱使用 Canvas 2D 绘制，节点经力导向布局定位。配偶节点已通过 SPOUSE_X_SPACING=70 对齐在同一水平线。当前亲子连线是每个父母节点分别画一套 bracket 线到子女，同辈之间有灰色虚线。

## Goals / Non-Goals
- Goals:
  - 移除同辈虚线，减少视觉噪声
  - 将夫妻合并为一个连线源头，统一画一套 bracket 到共同子女
  - 单亲（无配偶在图谱中）的情况退化为从该节点直接 bracket
- Non-Goals:
  - 不改变力导向布局算法
  - 不改变配偶红线渲染
  - 不改变节点样式

## Decisions
- **夫妻合并策略**：在分组亲子边时，先识别哪些父母共享相同的子女集合（通过 spouseMap），将同一对夫妻的子女合并为一组。连线起点为夫妻 X 坐标的中点、Y 坐标的平均值。
- **同辈虚线移除方式**：在绘制非亲子边的循环中，除了跳过 PARENT_CHILD_TYPES，还跳过 SIBLING_TYPES（OLDER_BROTHER/YOUNGER_BROTHER/OLDER_SISTER/YOUNGER_SISTER），只保留 SPOUSE 红线。

## Risks / Trade-offs
- 移除同辈虚线后，兄弟姐妹关系仅通过共同父母的 bracket 线隐含表达。如果两个同辈没有共同的父母在图谱中，他们之间将没有任何可见连线。这是可接受的权衡，因为实际家谱中同辈总有共同父母。
