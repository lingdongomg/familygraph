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
