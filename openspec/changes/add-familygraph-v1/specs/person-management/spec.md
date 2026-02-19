## 新增需求

### 需求: 创建成员
系统应允许 Owner 和 Member 用户在家庭中创建 Person 记录。创建者使用 "他/她是 [X] 的 [Y]" 模式指定新 Person 与现有 Person 的关系。Person 记录仅包含共享字段（姓名、性别、出生年份、是否已故、头像）。联系方式、地址等信息由各用户通过私人备注自行记录。

#### 场景: 创建成员并建立关系
- **当** Owner 或 Member 指定新成员是 [现有成员] 的 [关系类型]
- **则** 系统创建一条 `persons` 记录，仅包含共享字段（name, gender, birth_year, is_deceased, avatar）
- **且** 创建一条 `relationships` 记录（正向边）及其反向边
- **且** 根据参照成员自动设置 `generation`（辈分）
- **且** 递增家庭的 `member_count`
- **且** 不在 `persons` 记录中存储 phone, city, occupation, birth_date 等私人覆盖字段

#### 场景: Restricted 用户尝试创建成员
- **当** Restricted 用户尝试创建新成员
- **则** 系统拒绝请求并返回权限错误

### 需求: 更新成员共享信息
系统应允许 Owner 和 Member 用户更新任何 Person 的共享字段（姓名、性别、出生年份、是否已故、头像）。Restricted 用户仅可更新自己绑定的 Person 的共享字段。私人覆盖字段（手机号、微信号、城市、职业、出生日期等）通过 `person_notes` 各用户独立管理，不在此接口处理。所有共享字段的更新操作应创建编辑历史记录。

#### 场景: Member 更新他人的共享字段
- **当** Member 更新他人的姓名或出生年份
- **则** 系统在 `edit_history` 中记录字段变更和修改前快照
- **且** 将更新应用到 `persons` 记录

#### 场景: Restricted 用户更新自己的共享字段
- **当** Restricted 用户更新自己绑定的 Person 的姓名
- **则** 系统创建编辑历史记录并应用更新

#### 场景: 尝试通过 person/update 修改私人覆盖字段
- **当** 用户尝试通过 person/update 接口修改 phone、city 等字段
- **则** 系统忽略这些字段（它们应通过 note/upsert 接口修改）

#### 场景: Restricted 用户尝试更新他人信息
- **当** Restricted 用户尝试更新非自己绑定的 Person
- **则** 系统拒绝请求并返回权限错误

### 需求: 删除成员
系统应仅允许 Owner 删除 Person 及其所有关联的关系、照片、标记，以及所有用户对该 Person 的 person_notes 记录。

#### 场景: Owner 删除成员
- **当** Owner 删除一个成员
- **则** 系统删除该成员记录及其所有关系、照片关联、标记
- **且** 删除所有用户对该 Person 的 `person_notes` 记录
- **且** 在编辑历史中记录删除操作及修改前快照（仅共享字段）
- **且** 递减家庭的 `member_count`

### 需求: 获取成员详情（共享层 + 私人覆盖层合并）
系统应返回成员的共享字段，并合并当前请求用户在 `person_notes` 中记录的私人覆盖字段。每个用户看到的私人覆盖部分仅为自己记录的数据。

#### 场景: 家庭成员查看某人详情
- **当** 家庭成员请求某 Person 的详情
- **则** 系统返回共享层字段（name, gender, birth_year, is_deceased, avatar, generation）
- **且** 从 `person_notes` 中查询该用户对该 Person 的私人覆盖数据
- **且** 将私人覆盖字段（phone, wechat_id, city, occupation, birth_date, custom_title, remark）合并到响应中
- **且** 私人覆盖字段标记为 `_source: "my_note"` 以便前端区分

#### 场景: 访客通过分享链接查看
- **当** 访客通过分享链接访问成员详情
- **则** 系统仅返回共享层中的始终公开字段（name, gender, birth_year, is_deceased, avatar）
- **且** 不返回任何私人覆盖字段（访客无 person_notes）

#### 场景: 用户未对某人记录任何私人备注
- **当** 用户查看某 Person 的详情，但从未为其创建过 person_notes
- **则** 系统返回共享层字段，私人覆盖字段部分全部为空

### 需求: 列出家庭成员
系统应返回家庭中所有 Person 记录的基本共享信息，并批量合并当前用户的私人覆盖数据（自定义称呼）。

#### 场景: 列出家庭全部成员
- **当** 家庭成员请求成员列表
- **则** 系统返回所有成员的 id、姓名、性别、辈分、头像和绑定状态
- **且** 批量查询当前用户对这些成员的 `person_notes`，附带 custom_title 字段
