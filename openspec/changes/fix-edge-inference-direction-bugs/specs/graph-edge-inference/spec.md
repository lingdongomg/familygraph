## MODIFIED Requirements

### Requirement: Parent Creation Infers Spouse Edge with Other Parent (Rule 4)
当创建亲代（FATHER/MOTHER）时，系统 SHALL 查找**指向参照人的** FATHER/MOTHER 边（即 `to_id=参照人`）来定位参照人的已有亲代，并为新亲代与已有亲代创建双向配偶边。

#### Scenario: 创建爸爸自动成为妈妈的丈夫
- **WHEN** 用户以"我"为参照人创建"爸爸"（relation_type=FATHER）
- **AND** 已有边 `妈妈→我:MOTHER`（即 `to_id=我, relation_type=MOTHER`）
- **THEN** 系统通过查询 `to_id=我, relation_type∈[FATHER,MOTHER]` 找到妈妈
- **AND** 创建"爸爸"↔"妈妈"双向配偶边

#### Scenario: 不把参照人的子女误认为父母
- **WHEN** 用户以"母亲"为参照人创建"外婆"（relation_type=MOTHER）
- **AND** 已有边 `母亲→我:MOTHER`（from_id=母亲, type=MOTHER，表示母亲是我的母亲）
- **THEN** 系统查询 `to_id=母亲, relation_type∈[FATHER,MOTHER]` 不会返回"我"
- **AND** 外婆与我之间不产生任何推断边

### Requirement: Sibling Inherits Parent Edges Correctly (Rule 1)
当创建同辈时，系统 SHALL 查找**指向参照人的** FATHER/MOTHER 边来定位参照人的父母，而非查找参照人发出的 FATHER/MOTHER 边。

#### Scenario: 创建姨妈正确继承外婆外公
- **WHEN** 用户以"母亲"为参照人创建"姨妈"（OLDER_SISTER）
- **AND** 已有边 `外婆→母亲:MOTHER`, `外公→母亲:FATHER`
- **THEN** 系统通过查询 `to_id=母亲, relation_type∈[FATHER,MOTHER]` 找到外婆和外公
- **AND** 创建 姨妈↔外婆、姨妈↔外公 双向亲子边
- **AND** 不会把母亲的子女误认为母亲的父母

### Requirement: Child Inherits Sibling Edges from Other Children Correctly (Rule 6)
当创建子代时，系统 SHALL 查找**指向参照人的** SON/DAUGHTER 边来定位参照人的其他子女。

#### Scenario: 以爸爸为参照创建弟弟自动连接我
- **WHEN** 用户以"爸爸"为参照人创建"弟弟"（SON）
- **AND** 已有边 `我→爸爸:SON`（即 `to_id=爸爸, relation_type=SON`）
- **THEN** 系统通过查询 `to_id=爸爸, relation_type∈[SON,DAUGHTER]` 找到"我"
- **AND** 创建 弟弟↔我 双向兄弟边

### Requirement: Spouse Inherits Child Edges Correctly (Rule 7)
当创建配偶时，系统 SHALL 查找**指向参照人的** SON/DAUGHTER 边来定位参照人的子女。

#### Scenario: 创建妈妈自动连接我
- **WHEN** 用户以"爸爸"为参照人创建"妈妈"（WIFE）
- **AND** 已有边 `我→爸爸:SON`（即 `to_id=爸爸, relation_type=SON`）
- **THEN** 系统通过查询 `to_id=爸爸, relation_type∈[SON,DAUGHTER]` 找到"我"
- **AND** 创建 妈妈↔我 双向亲子边

### Requirement: Duplicate Edge Prevention
所有推断规则 SHALL 在创建边之前检查该边是否已存在，已存在则跳过。

#### Scenario: 不重复创建已存在的推断边
- **WHEN** 系统准备创建任何推断边时发现 from_id → to_id 的边已存在
- **THEN** 跳过创建，不产生重复记录
