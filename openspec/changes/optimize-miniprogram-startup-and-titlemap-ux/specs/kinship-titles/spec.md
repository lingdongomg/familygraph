## ADDED Requirements

### Requirement: Option-Based Path Key Builder
称呼表编辑页面 MUST 提供选项式路径键构建器，用户通过中文下拉选项逐级选择关系类型来构建亲属路径，而非手动输入英文路径键。

系统 MUST 支持 10 种关系类型选项：爸爸(FATHER)、妈妈(MOTHER)、儿子(SON)、女儿(DAUGHTER)、丈夫(HUSBAND)、妻子(WIFE)、哥哥(OLDER_BROTHER)、弟弟(YOUNGER_BROTHER)、姐姐(OLDER_SISTER)、妹妹(YOUNGER_SISTER)。

用户 MUST 能够添加 1 至 5 级关系步骤，与 BFS 计算最大深度一致。

系统 MUST 根据最后一级关系类型自动推断目标性别（FATHER/SON/HUSBAND/OLDER_BROTHER/YOUNGER_BROTHER → male，MOTHER/DAUGHTER/WIFE/OLDER_SISTER/YOUNGER_SISTER → female）。

点击"添加"后系统 MUST 自动将选项拼接为内部路径键格式（如选择"妈妈"→"爸爸"拼接为 `MOTHER>FATHER|male`）。

#### Scenario: 用户通过选项构建二级路径
- **WHEN** 用户选择第一级关系为"妈妈"，添加第二级关系为"爸爸"，输入称谓"阿公"
- **THEN** 系统生成路径键 `MOTHER>FATHER|male`，称谓值为"阿公"，添加到覆盖项列表

#### Scenario: 用户构建单级路径
- **WHEN** 用户仅选择一级关系"爸爸"，输入称谓"阿爸"
- **THEN** 系统生成路径键 `FATHER|male`，称谓值为"阿爸"

#### Scenario: 用户构建五级最深路径
- **WHEN** 用户选择五级关系步骤
- **THEN** 系统正确拼接五级路径键且不允许添加更多级别

### Requirement: Path Key Display Localization
已保存的覆盖项列表 MUST 将内部路径键反向映射为中文可读格式展示。

路径键中每个关系类型 MUST 映射为对应的中文标签（如 MOTHER → 妈妈，FATHER → 爸爸），性别后缀映射为"(男)"或"(女)"，层级之间用" → "分隔。

#### Scenario: 已有路径键中文展示
- **WHEN** 覆盖项列表中存在路径键 `MOTHER>FATHER|male`
- **THEN** 展示为"妈妈 → 爸爸 (男)"

#### Scenario: 无法解析的路径键降级展示
- **WHEN** 覆盖项列表中存在无法解析的非标准路径键
- **THEN** 直接展示原始路径键字符串
