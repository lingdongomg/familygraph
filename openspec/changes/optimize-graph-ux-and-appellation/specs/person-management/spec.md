## MODIFIED Requirements

### Requirement: 创建成员
系统 SHALL 允许 Owner 和 Member 用户在家庭中创建 Person 记录。创建者使用 "他/她是 [X] 的 [Y]" 模式指定新 Person 与现有 Person 的关系。Person 记录 MUST 仅包含共享字段（姓名、性别、出生年份、头像）。联系方式、地址等信息由各用户通过私人备注自行记录。创建表单中 MUST NOT 包含"已故"选项。

#### Scenario: 创建成员并建立关系
- **WHEN** Owner 或 Member 指定新成员是 [现有成员] 的 [关系类型]
- **THEN** 系统创建一条 `persons` 记录，仅包含共享字段（name, gender, birth_year, avatar）
- **AND** 创建一条 `relationships` 记录（正向边）及其反向边
- **AND** 根据参照成员自动设置 `generation`（辈分）
- **AND** 递增家庭的 `member_count`
- **AND** 创建表单不包含 `is_deceased` 输入控件

#### Scenario: Restricted 用户尝试创建成员
- **WHEN** Restricted 用户尝试创建新成员
- **THEN** 系统拒绝请求并返回权限错误

### Requirement: 更新成员共享信息
系统 SHALL 允许 Owner 和 Member 用户更新任何 Person 的共享字段（姓名、性别、出生年份、头像）。Restricted 用户仅可更新自己绑定的 Person 的共享字段。编辑页面 MUST NOT 包含"已故"开关。私人覆盖字段通过 `person_notes` 各用户独立管理。所有共享字段的更新操作 MUST 创建编辑历史记录。

#### Scenario: Member 更新他人的共享字段
- **WHEN** Member 更新他人的姓名或出生年份
- **THEN** 系统在 `edit_history` 中记录字段变更和修改前快照
- **AND** 将更新应用到 `persons` 记录

#### Scenario: 编辑页面不包含已故字段
- **WHEN** 用户打开成员编辑页面
- **THEN** 页面不显示"已故"开关控件

#### Scenario: Restricted 用户尝试更新他人信息
- **WHEN** Restricted 用户尝试更新非自己绑定的 Person
- **THEN** 系统拒绝请求并返回权限错误

### Requirement: 获取成员详情（共享层 + 私人覆盖层合并）
系统 SHALL 返回成员的共享字段，并合并当前请求用户在 `person_notes` 中记录的私人覆盖字段。每个用户看到的私人覆盖部分 MUST 仅为自己记录的数据。详情页 MUST NOT 显示"已故"状态标签。

#### Scenario: 家庭成员查看某人详情
- **WHEN** 家庭成员请求某 Person 的详情
- **THEN** 系统返回共享层字段（name, gender, birth_year, avatar, generation）
- **AND** 从 `person_notes` 中查询该用户对该 Person 的私人覆盖数据
- **AND** 将私人覆盖字段（phone, wechat_id, city, occupation, birth_date, custom_title, remarks）合并到响应中
- **AND** 详情页面不显示"已故"相关的标签或信息行

#### Scenario: 用户未对某人记录任何私人备注
- **WHEN** 用户查看某 Person 的详情，但从未为其创建过 person_notes
- **THEN** 系统返回共享层字段，私人覆盖字段部分全部为空

### Requirement: 条目式备注
系统 SHALL 允许用户为每个 Person 以条目形式记录备注，每条备注为独立的字符串，存储为 `person_notes.remarks` 数组。用户 MUST 可逐条添加和删除备注。

#### Scenario: 添加一条备注
- **WHEN** 用户在备注区域输入内容并确认添加
- **THEN** 系统将新备注追加到 `remarks` 数组末尾
- **AND** 每条备注最长 200 字，最多 20 条

#### Scenario: 删除一条备注
- **WHEN** 用户点击某条备注的删除按钮
- **THEN** 系统从 `remarks` 数组中移除该条目

#### Scenario: 兼容旧备注数据
- **WHEN** 系统加载 person_notes 记录，发现 `remark` 为字符串（旧格式）
- **THEN** 系统将其转换为 `[remark]` 单元素数组返回给前端
- **AND** 下次保存时以 `remarks` 数组格式写入
