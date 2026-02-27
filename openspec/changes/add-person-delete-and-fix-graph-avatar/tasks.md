# Tasks

- [x] 1. Add `created_by` field to person creation
  - **File**: `cloudfunctions/person/index.js` — `create` function
  - **Change**: 在 `personData` 中增加 `created_by: openid` 字段
  - **Note**: 已有成员不含此字段，`del` 函数需容忍 `created_by` 缺失的情况（视为无创建者，仅 Owner 可删）

- [x] 2. Relax `del` permission in person cloud function
  - **File**: `cloudfunctions/person/index.js` — `del` function
  - **Change**:
    - Owner: 可删除任何人（排除自己 `bound_user_id === openid`）
    - Member: 可删除 `created_by === openid` 的成员（排除自己）
    - Restricted: 无权删除（`hasPermission(role, 'member')` 检查）
    - 旧数据无 `created_by` 字段时，仅 Owner 可删

- [x] 3. Return delete permission in `getDetail` response
  - **File**: `cloudfunctions/person/index.js` — `getDetail` function
  - **Change**: 服务端计算 `_can_delete` 布尔值并返回（避免客户端比较 openid 与 openid_hash 的问题）
  - **Rationale**: 改为返回 `_can_delete` 而非 `created_by`，因为客户端持有的是 `openid_hash`，无法与服务端的原始 `openid` 直接比较

- [x] 4. Add delete button and handler in person detail page
  - **Files**:
    - `miniprogram/pages/person/detail/index.js` — 增加 `onDelete` 方法，使用 `person._can_delete` 控制 `canDelete` 状态
    - `miniprogram/pages/person/detail/index.wxml` — 底部增加红色"删除成员"按钮（`wx:if="{{canDelete}}"`）
    - `miniprogram/pages/person/detail/index.wxss` — 删除按钮样式
  - **Behavior**: 点击弹出 `wx.showModal` 确认，确认后调用 `person/delete`，成功后 `wx.navigateBack()`

- [x] 5. Fix graph avatar: convert cloud fileID to HTTP URL
  - **File**: `miniprogram/components/family-graph/index.js` — `loadAvatars` method
  - **Change**: 先收集所有 cloud fileID，调用 `wx.cloud.getTempFileURL` 批量获取 HTTP 临时 URL，再用 HTTP URL 创建 canvas Image。失败时静默回退为首字母显示。
