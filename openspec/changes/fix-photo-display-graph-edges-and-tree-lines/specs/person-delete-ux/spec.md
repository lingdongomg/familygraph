## ADDED Requirements

### Requirement: Visible Delete Member Entry
成员详情页 SHALL 在操作区域显示明确的"删除成员"入口，使有权限的用户能快速发现并使用该功能。

#### Scenario: Owner 查看非本人成员详情时看到删除按钮
- **WHEN** 家庭 Owner 打开某个非本人绑定成员的详情页
- **THEN** 详情页操作区域显示红色"删除成员"按钮
- **AND** 点击按钮弹出确认对话框

#### Scenario: 无权限用户不显示删除按钮
- **WHEN** 用户没有删除权限（如 restricted 角色、查看他人创建的成员的 member 角色、查看自己绑定的成员）
- **THEN** 详情页不显示"删除成员"按钮
