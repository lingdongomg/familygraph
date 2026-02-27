# Spec: graph-bracket-rendering

图谱亲子 bracket 连线渲染

## MODIFIED Requirements

### Requirement: Bracket 连线 MUST 不穿过节点

亲子 bracket 连线的起点和终点 MUST 在节点边缘之外，不得穿过节点圆形或标签文字区域。

#### Scenario: 夫妻对 + 多子女

- Given 一对夫妻节点和 N 个子女节点（N >= 2）
- When 渲染亲子 bracket 连线
- Then 竖线从夫妻中点的底部边缘（圆形 + 标签区域下方）开始向下
- And 分发横线在父母底部以下固定偏移处
- And 横线覆盖从最左子节点到最右子节点的 X 范围
- And 每个子代的竖线从横线向下到该子节点的顶部边缘
- And 没有任何连线穿过节点圆形或标签区域

#### Scenario: 单亲 + 多子女

- Given 一个父/母节点（无配偶在图谱中）和 N 个子女节点
- When 渲染亲子 bracket 连线
- Then 竖线从该父/母节点的底部边缘开始
- And 分发横线和子代竖线行为与夫妻对场景相同

#### Scenario: 单子女

- Given 父母节点和 1 个子女节点
- When 渲染亲子 bracket 连线
- Then 竖线从父母底部边缘向下到分发横线
- And 从分发横线水平连接到子节点 X 位置
- And 竖线从该处向下到子节点顶部边缘

### Requirement: 分发横线位置 MUST 使用固定偏移

分发横线的 Y 坐标 MUST 基于父母底部边缘加固定偏移计算，不随子代位置动态变化。

#### Scenario: 不同子代布局下横线位置一致

- Given 多组父子关系，子代 Y 坐标因力导向布局略有差异
- When 渲染各组 bracket
- Then 各组的分发横线与其父母底部的间距相同
