## MODIFIED Requirements

### Requirement: BFS 亲属路径计算
系统 SHALL 使用 BFS 在关系图上计算任意两个 Person 之间的最短关系路径，最大深度为 5 条边（五代）。BFS 遍历有向边时，MUST 将边的 `relation_type`（表示 from_id 对 to_id 的角色）反转为"to_id 对 from_id 的角色"后压入路径，以确保路径键匹配 FORMAL_TITLE_MAP 的"目标人物对我来说是什么"语义。

#### Scenario: 反转边类型计算称谓
- **WHEN** 从我（from）到儿子（to）的边 relation_type 为 FATHER（我是他的父亲）
- **THEN** BFS 将 FATHER 反转为 SON（根据 to 节点性别 male，REVERSE_RELATION['FATHER']['male'] = 'SON'）
- **AND** 路径键为 `SON|male`，查表得到"儿子"

#### Scenario: 计算有关联的两人之间的称谓
- **WHEN** 用户请求从 Person A 到 Person B 的正式称谓
- **THEN** 系统通过 BFS 找到最短路径（最大深度 5）
- **AND** 每步遍历时根据边的 to 节点性别将 relation_type 反转
- **AND** 构建路径键并查询 FORMAL_TITLE_MAP
- **AND** 返回正式中文亲属称谓

#### Scenario: 五代内无路径
- **WHEN** 两人之间不存在长度 <= 5 的路径
- **THEN** 系统返回通用称谓 "亲属"

#### Scenario: 多跳反转路径
- **WHEN** 从我到目标需经过多跳（如我→父→父 = 祖父）
- **THEN** 每跳的 relation_type 均被反转后压入路径
- **AND** 路径键正确组合为 `FATHER>FATHER|male`（我→父亲 边类型 SON 反转为 FATHER，父亲→祖父 边类型 SON 反转为 FATHER）
- **AND** 查表得到"祖父"
