# Spec: photo-album

相册页标题显示

## MODIFIED Requirements

### Requirement: 相册页标题正确显示人物名字

相册页的标题和导航栏 MUST 显示 "XX的照片"，其中 XX 为人物名字。

#### Scenario: 从详情页进入相册页

- Given 用户从成员详情页点击"查看全部"进入相册页
- When 相册页加载
- Then 页面标题显示 "XX的照片"（XX 为成员姓名）
- And 导航栏标题同样显示 "XX的照片"

#### Scenario: person_name 参数缺失时的降级

- Given 通过其他途径进入相册页且未传递 person_name
- When 相册页加载
- Then 页面标题显示 "照片的照片"（降级行为，与现有代码 fallback 一致）
