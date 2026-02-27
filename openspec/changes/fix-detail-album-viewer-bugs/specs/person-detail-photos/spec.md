# Spec: person-detail-photos

成员详情页照片预览区功能

## ADDED Requirements

### Requirement: 详情页加载时获取照片预览

详情页加载成员信息时，MUST 同时获取该成员的照片列表，并在底部"相册"区域展示前 4 张照片缩略图。

#### Scenario: 成员有照片时显示预览

- Given 当前成员有 N 张已上传的照片（N > 0）
- When 用户进入该成员的详情页
- Then 底部"相册"区域显示 min(N, 4) 张照片缩略图
- And 缩略图使用 `file_id` 字段作为图片源

#### Scenario: 成员无照片时显示空状态

- Given 当前成员没有任何照片
- When 用户进入该成员的详情页
- Then 底部"相册"区域显示"暂无照片"

#### Scenario: 导航到相册页时传递人物名字

- Given 用户在成员详情页
- When 点击"查看全部"
- Then 导航到相册页并传递 `person_name` 参数
- And 相册页标题显示 "XX的照片"

## REMOVED Requirements

### Requirement: 移除底部"编辑资料"按钮

底部 action bar 的"编辑资料"按钮与"基本信息"卡片内的"编辑"链接功能重复，MUST 予以移除。

#### Scenario: 有删除权限时只显示删除按钮

- Given 用户有权删除该成员
- When 进入成员详情页
- Then action bar 只显示"删除成员"按钮

#### Scenario: 无删除权限时不显示 action bar

- Given 用户无权删除该成员
- When 进入成员详情页
- Then action bar 不渲染
