## MODIFIED Requirements

### Requirement: 图谱触摸交互
系统 SHALL 在图谱画布上支持双指缩放、拖拽平移和点击选择交互。点击节点时 MUST 立即导航到详情页，不得延迟。

#### Scenario: 点击节点
- **WHEN** 用户点击图谱中的某个人物节点
- **THEN** 系统立即导航到该人物的详情页
- **AND** 如果能计算出关系称谓，同时以 toast 短暂展示（不阻塞导航）

#### Scenario: 拖拽平移
- **WHEN** 用户在画布空白区域拖拽
- **THEN** 图谱视口按拖拽偏移量平移

#### Scenario: 双指缩放
- **WHEN** 用户执行双指捏合手势
- **THEN** 图谱以捏合中心为原点等比缩放
