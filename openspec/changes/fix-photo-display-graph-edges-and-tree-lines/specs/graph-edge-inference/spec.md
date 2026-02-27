## ADDED Requirements

### Requirement: Parent Creation Infers Sibling Child Edges (Rule 3)
当创建亲代（FATHER/MOTHER）时，系统 SHALL 自动查找参照人的所有同辈（兄弟姐妹），并为新亲代与每个同辈创建双向亲子边，前提是这些边尚不存在。

#### Scenario: 创建外公自动连接妈妈的姐姐
- **WHEN** 用户以"妈妈"为参照人创建"外公"（relation_type=FATHER）
- **AND** "妈妈"存在同辈"妈妈的姐姐"（通过 OLDER_SISTER/YOUNGER_SISTER 等边关联）
- **THEN** 系统自动创建"外公" → "妈妈的姐姐"（FATHER）和"妈妈的姐姐" → "外公"（DAUGHTER）双向边
- **AND** 图谱中外公与妈妈的姐姐之间显示亲子连线
- **AND** 外公节点的称谓正确显示

### Requirement: Parent Creation Infers Spouse Edge with Other Parent (Rule 4)
当创建亲代（FATHER/MOTHER）时，系统 SHALL 自动查找参照人已有的另一位亲代，并为新亲代与已有亲代创建双向配偶边。

#### Scenario: 创建爸爸自动成为妈妈的丈夫
- **WHEN** 用户以"我"为参照人创建"爸爸"（relation_type=FATHER）
- **AND** "我"已有 MOTHER 边指向"妈妈"
- **THEN** 系统自动创建"爸爸" → "妈妈"（HUSBAND）和"妈妈" → "爸爸"（WIFE）双向边

#### Scenario: 已有配偶边则跳过
- **WHEN** 系统准备创建配偶推断边时发现该边已存在
- **THEN** 跳过创建，不产生重复记录

### Requirement: Sibling Creation Infers Mutual Sibling Edges (Rule 5)
当创建同辈成员时，系统 SHALL 自动查找参照人的其他同辈，并为新同辈与每个已有同辈创建双向兄弟姐妹边。

#### Scenario: 创建弟弟自动连接姐姐
- **WHEN** 用户以"我"为参照人创建"弟弟"（relation_type=YOUNGER_BROTHER）
- **AND** "我"已有同辈"姐姐"（通过 OLDER_SISTER 边关联）
- **THEN** 系统自动创建"弟弟" → "姐姐"（OLDER_SISTER）和"姐姐" → "弟弟"（YOUNGER_BROTHER）双向边

### Requirement: Child Creation Infers Sibling Edges with Other Children (Rule 6)
当创建子代成员时，系统 SHALL 自动查找参照人的其他子女，并为新子代与每个已有子女创建双向兄弟姐妹边。

#### Scenario: 以爸爸为参照创建弟弟自动连接我
- **WHEN** 用户以"爸爸"为参照人创建"弟弟"（relation_type=SON）
- **AND** "爸爸"已有子女"我"（通过 FATHER 边从"我"指向"爸爸"）
- **THEN** 系统自动创建"弟弟" → "我"和"我" → "弟弟"的双向兄弟姐妹边

#### Scenario: 根据性别和年龄确定兄弟姐妹类型
- **WHEN** 系统创建同辈推断边
- **THEN** 根据新成员和已有成员的性别选择正确的关系类型（OLDER_BROTHER/YOUNGER_BROTHER/OLDER_SISTER/YOUNGER_SISTER）
- **AND** 默认新创建的子女视为较年幼的一方（YOUNGER_*）

### Requirement: Spouse Creation Infers Child Edges (Rule 7)
当创建配偶时，系统 SHALL 自动查找参照人的子女，并为新配偶与每个子女创建双向亲子边。

#### Scenario: 创建妈妈自动连接我
- **WHEN** 用户以"爸爸"为参照人创建"妈妈"（relation_type=WIFE）
- **AND** "爸爸"已有子女"我"（通过 FATHER/SON 边关联）
- **THEN** 系统自动创建"妈妈" → "我"（MOTHER）和"我" → "妈妈"（MOTHER）双向边

### Requirement: Duplicate Edge Prevention
所有推断规则 SHALL 在创建边之前检查该边是否已存在，已存在则跳过。

#### Scenario: 不重复创建已存在的推断边
- **WHEN** 系统准备创建任何推断边时发现 from_id → to_id 的边已存在
- **THEN** 跳过创建，不产生重复记录
