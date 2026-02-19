## 新增需求

### 需求: 每日清理定时任务
系统应通过定时触发器每日（03:00）运行一个云函数，清理多个集合中的过期数据。

#### 场景: 清理过期邀请码
- **当** 清理任务运行
- **则** 所有 `invite_code_expire` 已过期且 `invite_code_active` = true 的家庭记录被更新为 `invite_code_active` = false

#### 场景: 清理过期加入申请
- **当** 清理任务运行
- **则** 所有状态为 "pending" 且 `expire_at` 已过期的 `join_requests` 记录被更新为状态 "expired"

#### 场景: 清理过期分享链接
- **当** 清理任务运行
- **则** 所有 `expire_at` 已过期且 `is_active` = true 的 `share_links` 记录被更新为 `is_active` = false

#### 场景: 清理过旧编辑历史
- **当** 清理任务运行
- **则** 所有 `created_at` 超过 90 天的 `edit_history` 记录被删除
