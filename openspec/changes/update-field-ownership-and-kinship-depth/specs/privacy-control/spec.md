## 移除的需求

### 需求: 字段级隐私设置
**原因**: 采用"私人覆盖层"模式后，所有可变的私人信息（手机号、城市、职业等）均存储在 `person_notes` 中，天然只有记录者自己可见。不再需要 public/family_only/private 三级可见性控制。
**迁移**: `privacy_settings` 集合移除；原有隐私控制的功能由 `person_notes` 的"每用户独立存储"天然替代。

### 需求: 隐私感知数据过滤
**原因**: 不再有共享的私人字段需要过滤。共享字段（姓名、性别等）始终对家庭成员可见；私人覆盖字段仅返回当前用户自己的记录。
**迁移**: `person/getDetail` 云函数改为读取共享层 + 当前用户的 person_notes 合并返回。

### 需求: 始终公开的字段
**原因**: 在新模型中，"始终公开"的概念被"共享字段"替代。共享字段（name, gender, birth_year, is_deceased, avatar）对所有家庭成员和访客均可见，无需单独定义"始终公开"。
**迁移**: 由 person-management 中修改后的"获取成员详情"需求覆盖。

## 新增需求

### 需求: 共享字段与私人覆盖字段分离
系统应将 Person 的数据分为两层：共享层和私人覆盖层。共享层存储在 `persons` 集合中，对所有家庭成员可见；私人覆盖层存储在 `person_notes` 集合中，仅记录者自己可见。

#### 场景: 共享字段定义
- **当** 系统定义 Person 的共享字段
- **则** 共享字段包括且仅包括: name（姓名）、gender（性别）、birth_year（出生年份）、is_deceased（是否已故）、avatar（头像）、generation（辈分）
- **且** 这些字段对所有家庭成员可见，对访客公开 name、gender、birth_year、is_deceased、avatar

#### 场景: 私人覆盖字段定义
- **当** 系统定义 Person 的私人覆盖字段
- **则** 私人覆盖字段包括: phone（手机号）、wechat_id（微信号）、birth_date（完整出生日期）、city（城市/地址）、occupation（职业）、custom_title（自定义称呼）、remark（备注）
- **且** 每个字段由各用户独立记录在自己的 `person_notes` 中
- **且** 用户 A 记录的内容对用户 B 不可见

### 需求: 私人覆盖字段的加密存储
系统应对 `person_notes` 中的 phone 和 wechat_id 字段使用 AES-256-CBC 加密存储。

#### 场景: 保存手机号到私人备注
- **当** 用户为某 Person 记录手机号 "13812345678"
- **则** 系统将手机号以 AES-256-CBC 加密后存储到 `person_notes` 中
- **且** 读取时解密返回明文

#### 场景: 保存微信号到私人备注
- **当** 用户为某 Person 记录微信号
- **则** 系统将微信号以 AES-256-CBC 加密后存储到 `person_notes` 中
