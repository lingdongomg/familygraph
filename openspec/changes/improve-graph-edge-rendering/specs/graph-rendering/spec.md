## ADDED Requirements

### Requirement: Hide Sibling Edges
图谱 SHALL 不再绘制同辈之间的灰色虚线。兄弟姐妹关系通过共同父母的亲子 bracket 线隐含表达。

#### Scenario: 兄弟姐妹之间无虚线
- **WHEN** 图谱中存在兄弟姐妹关系边
- **THEN** 不绘制该边的灰色虚线
- **AND** 配偶红线仍正常绘制

### Requirement: Unified Couple Bracket Lines
当夫妻双方都在图谱中且共享子女时，图谱 SHALL 从夫妻中点（而非每人分别）向下引出一套统一的 bracket 线连接共同子女。

#### Scenario: 夫妻共同子女的 bracket 连线
- **WHEN** 图谱中父亲和母亲是配偶关系且共享多个子女
- **THEN** 从父亲和母亲 X 坐标中点向下画竖线
- **AND** 竖线连接到子代分发横线
- **AND** 横线分出竖线连接到每个子代
- **AND** 不再从父亲和母亲分别画两套独立的 bracket 线

#### Scenario: 单亲（无配偶在图谱中）的 bracket 连线
- **WHEN** 图谱中某父/母没有配偶在图谱中
- **THEN** 从该父/母节点直接向下画 bracket 线连接子女
