## ADDED Requirements

### Requirement: Member Selection Picker for Add Member
当家庭已有成员时，添加新成员流程 SHALL 使用自定义滚动选择弹窗（而非 `wx.showActionSheet`）来让用户选择参考人，以支持任意数量的成员列表。

#### Scenario: 家庭成员不超过 6 人时添加成员
- **WHEN** 用户在家庭主页点击"添加成员"按钮且家庭成员数 <= 6
- **THEN** 弹出自定义成员选择弹窗，列出所有成员供选择
- **AND** 用户点击某成员后跳转到创建页面，携带该成员 ID 作为 reference_person_id

#### Scenario: 家庭成员超过 6 人时添加成员
- **WHEN** 用户在家庭主页点击"添加成员"按钮且家庭成员数 > 6
- **THEN** 弹出自定义成员选择弹窗，显示可滚动的成员列表
- **AND** 用户可正常滚动、选择任意成员并跳转到创建页面

#### Scenario: 家庭没有成员时添加第一个成员
- **WHEN** 用户在家庭主页点击"添加成员"按钮且家庭无任何成员
- **THEN** 直接跳转到成员创建页面，不显示选择弹窗
