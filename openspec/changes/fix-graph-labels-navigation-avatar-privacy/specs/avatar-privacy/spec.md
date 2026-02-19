## ADDED Requirements

### Requirement: 头像隐私控制
系统 SHALL 将头像视为隐私信息，默认不对访客和其他成员公开。用户 MUST 可以选择公开自己绑定的 Person 的头像。

#### Scenario: 访客不可见头像
- **WHEN** 访客通过分享链接查看家庭成员
- **THEN** 所有成员的头像字段返回为空
- **AND** 显示默认头像占位符

#### Scenario: 头像默认不公开
- **WHEN** 新创建一个 Person 记录
- **THEN** `avatar_public` 字段默认为 `false`
- **AND** 其他家庭成员在列表和图谱中看不到该 Person 的头像

#### Scenario: 绑定用户始终可见自己头像
- **WHEN** 用户查看自己绑定的 Person 的详情或图谱节点
- **THEN** 头像始终可见，不受 `avatar_public` 限制

#### Scenario: Owner 始终可见所有头像
- **WHEN** 家庭 Owner 查看任何成员的详情或图谱节点
- **THEN** 头像始终可见，不受 `avatar_public` 限制

#### Scenario: 用户公开头像
- **WHEN** 用户将自己绑定的 Person 的 `avatar_public` 设为 `true`
- **THEN** 所有家庭成员（member 及以上）在列表、详情和图谱中可以看到该头像

#### Scenario: avatar_public 仅允许绑定用户或 Owner 修改
- **WHEN** 非绑定用户且非 Owner 尝试修改某 Person 的 `avatar_public`
- **THEN** 系统忽略该字段的修改

## MODIFIED Requirements

### Requirement: 共享字段与私人覆盖字段分离
系统 SHALL 将 Person 的数据分为两层：共享层和私人覆盖层。共享层存储在 `persons` 集合中，对所有家庭成员可见；私人覆盖层存储在 `person_notes` 集合中，仅记录者自己可见。头像（avatar）虽存储在共享层，但 MUST 通过 `avatar_public` 控制可见性。

#### Scenario: 共享字段定义
- **WHEN** 系统定义 Person 的共享字段
- **THEN** 共享字段包括且仅包括: name（姓名）、gender（性别）、birth_year（出生年份）、is_deceased（是否已故）、avatar（头像）、generation（辈分）、avatar_public（头像是否公开）
- **AND** 这些字段对所有家庭成员可见，但 avatar 的读取受 avatar_public 控制
- **AND** 对访客公开 name、gender、birth_year、is_deceased（不包含 avatar）

#### Scenario: 私人覆盖字段定义
- **WHEN** 系统定义 Person 的私人覆盖字段
- **THEN** 私人覆盖字段包括: phone（手机号）、wechat_id（微信号）、birth_date（完整出生日期）、city（城市/地址）、occupation（职业）、custom_title（自定义称呼）、remark（备注）
- **AND** 每个字段由各用户独立记录在自己的 `person_notes` 中
- **AND** 用户 A 记录的内容对用户 B 不可见
