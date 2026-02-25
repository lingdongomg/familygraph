## MODIFIED Requirements

### Requirement: BFS 亲属路径计算
系统 SHALL 使用 BFS 在关系图上计算任意两个 Person 之间的最短关系路径，最大深度为 5 条边（五代）。BFS 遍历时 MUST 正确反转边类型，确保路径键语义为"目标相对于起点的关系"。系统 SHALL 在查表时优先使用用户选用的自定义称呼表覆盖，未命中再查系统默认 FORMAL_TITLE_MAP。

#### Scenario: 计算有关联的两人之间的称谓
- **WHEN** 用户请求从 Person A 到 Person B 的正式称谓
- **THEN** 系统通过 BFS 找到最短路径（最大深度 5）
- **AND** 构建路径键并先查用户选用的自定义称呼表
- **AND** 未命中则查询系统默认 FORMAL_TITLE_MAP
- **AND** 返回匹配的中文亲属称谓

#### Scenario: 五代内无路径
- **WHEN** 两人之间不存在长度 <= 5 的路径
- **THEN** 系统返回通用称谓 "亲属"

#### Scenario: 直系亲属称谓正确性
- **WHEN** 用户创建"我的父亲"（以"我"为参照，关系类型 FATHER）
- **THEN** 图谱中父亲节点下方应显示"父亲"（而非"儿子"）
- **AND** 系统正确区分正向边和反向边的语义

### Requirement: 自定义昵称和备注
系统 SHALL 允许家庭成员为任何 Person 设置自定义昵称（custom_title）和个人备注，连同手机号、微信号、城市、职业、出生日期等私人覆盖字段，按用户存储在 `person_notes` 集合中。自定义昵称 MUST 在展示时优先于计算的正式称谓。

#### Scenario: 设置自定义昵称
- **WHEN** 用户为某 Person 设置自定义称呼 "二舅妈"
- **THEN** 系统创建或更新一条 `person_notes` 记录
- **AND** 后续图谱和详情视图显示 "二舅妈" 而非计算的正式称谓

#### Scenario: 未设置自定义昵称
- **WHEN** 用户未为某 Person 设置自定义昵称
- **THEN** 系统显示计算的正式亲属称谓

## ADDED Requirements

### Requirement: 自定义称呼表管理
系统 SHALL 允许用户创建和编辑自定义称呼表，覆盖系统默认的亲属称谓映射。称呼表 MUST 存储在 `custom_title_maps` 集合中，包含关系路径键到自定义称谓的映射。

#### Scenario: 创建自定义称呼表
- **WHEN** 用户在设置中新建一张称呼表并添加覆盖条目（如 "MOTHER>FATHER|male" → "阿公"）
- **THEN** 系统创建一条 `custom_title_maps` 记录
- **AND** 记录包含 creator_id、family_id、name、overrides 映射

#### Scenario: 编辑称呼表条目
- **WHEN** 用户修改称呼表中某条路径的称谓（如将"外祖父"改为"阿公"）
- **THEN** 系统更新 `custom_title_maps` 中对应的 overrides 条目

#### Scenario: 删除称呼表
- **WHEN** 用户删除自己创建的称呼表
- **THEN** 系统删除该 `custom_title_maps` 记录
- **AND** 所有选用该称呼表的家庭成员回退为使用系统默认称谓

### Requirement: 称呼表分享与选用
系统 SHALL 允许用户将自己创建的称呼表设为"可分享"，家庭内其他成员可选择使用该称呼表。选用 MUST 为非强制性，每个成员可独立决定是否使用以及使用哪张称呼表。

#### Scenario: 分享称呼表给家庭成员
- **WHEN** 用户将自己的称呼表设为"可分享"（is_shared=true）
- **THEN** 家庭内其他成员在设置页可以看到该称呼表

#### Scenario: 选用他人的称呼表
- **WHEN** 家庭成员选择使用某人分享的称呼表
- **THEN** 系统在该成员的 `family_members` 记录中存储 `adopted_title_map_id`
- **AND** 后续图谱和称谓计算优先使用该称呼表的覆盖

#### Scenario: 取消选用称呼表
- **WHEN** 用户取消选用当前使用的称呼表
- **THEN** 系统清除 `adopted_title_map_id`
- **AND** 回退为使用系统默认称谓

#### Scenario: 未选用任何称呼表
- **WHEN** 用户从未选用任何称呼表
- **THEN** 系统使用默认的 FORMAL_TITLE_MAP 展示称谓
