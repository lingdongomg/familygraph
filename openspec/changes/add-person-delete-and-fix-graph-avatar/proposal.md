# add-person-delete-and-fix-graph-avatar

## Summary

两项改进：(1) 允许普通成员删除自己创建的家庭成员（但不能删除自己）；(2) 修复图谱页节点不显示头像的问题。

---

## Problem 1: 无法删除错误创建的家庭成员

当前 `person/delete` 仅允许 Owner 角色执行。普通 Member 创建了错误的成员后无法删除，只能请求 Owner 帮忙。

### Current Behavior
- `cloudfunctions/person/index.js` 的 `del` 函数检查 `hasPermission(role, 'owner')`
- Person 记录没有 `created_by` 字段，无法追溯创建者
- 前端没有删除按钮

### Proposed Change
1. **Person 记录增加 `created_by` 字段**: 在 `create` 函数中记录创建者的 openid
2. **放宽 `del` 权限**: Owner 仍可删除任何人；Member 可删除自己创建的人（`created_by === openid`），但不能删除绑定了自己的 Person（`bound_user_id === openid`）
3. **前端增加删除按钮**: 在成员详情页底部显示"删除成员"按钮（仅对有权限的用户可见）
4. **确认对话框**: 删除前弹出二次确认

### Permission Rules
| 角色 | 可删除范围 | 限制 |
|------|-----------|------|
| Owner | 任何成员 | 不能删除自己 |
| Member | 自己创建的成员 | 不能删除自己；不能删除 Owner |
| Restricted | 无 | 无删除权限 |

---

## Problem 2: 图谱页不显示头像

列表页 `person-card` 组件使用 `<image>` 标签直接展示 cloud fileID，微信小程序 `<image>` 组件原生支持 cloud fileID。但图谱页 `family-graph` 使用 Canvas 2D API 的 `canvas.createImage()`，该 API **不支持** cloud fileID 格式，需要先通过 `wx.cloud.getTempFileURL()` 将 cloud fileID 转换为 HTTP 临时 URL。

### Current Behavior
- `family-graph/index.js` 的 `loadAvatars` 直接将 `n.avatar`（cloud fileID）赋给 `imgObj.src`
- Canvas Image 无法加载 cloud fileID，静默失败，回退到显示首字母

### Proposed Fix
在 `loadAvatars` 中，先收集所有有效的 cloud fileID，调用 `wx.cloud.getTempFileURL` 批量获取 HTTP URL，再用 HTTP URL 创建 canvas Image 对象。

---

## Scope

### 后端改动
- `cloudfunctions/person/index.js`:
  - `create` — 增加 `created_by` 字段
  - `del` — 放宽权限规则
  - `getDetail` — 返回 `created_by` 字段（用于前端判断是否显示删除按钮）

### 前端改动
- `miniprogram/pages/person/detail/index.js` — 增加删除处理逻辑
- `miniprogram/pages/person/detail/index.wxml` — 增加删除按钮 UI
- `miniprogram/pages/person/detail/index.wxss` — 删除按钮样式
- `miniprogram/components/family-graph/index.js` — `loadAvatars` 方法增加 cloud fileID → HTTP URL 转换

## Spec Deltas
- `specs/person-delete/spec.md` — 成员删除权限规则
- `specs/graph-avatar/spec.md` — 图谱头像渲染修复
