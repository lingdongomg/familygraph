# Change: 修复照片上传参数、关系选择器事件、头像可点击

## Why
三个 bug：
1. **照片上传失败**: `album/index.js` 传参 `size`，但云函数 `photo/upload` 期望 `file_size`，参数名不匹配导致校验失败
2. **关系选择器无效**: `relation-picker` 组件触发事件携带 `{ type: xxx }`，但 `person/create` 页面读取 `e.detail.value`，导致 `selectedRelation` 被设为 `undefined`
3. **头像不可点击**: `person/detail` 页面的头像图片没有绑定点击事件，用户无法直接点击头像进入编辑

## What Changes
- **Bug 1**: 将 `album/index.js` 中的 `size` 改为 `file_size`
- **Bug 2**: 将 `person/create/index.js` 中的 `e.detail.value` 改为 `e.detail.type`（与组件事件匹配）
- **Bug 3**: 给 `person/detail/index.wxml` 的头像图片添加 `bindtap="onEditShared"`

## Impact
- Affected code:
  - `miniprogram/pages/photo/album/index.js` — 修正参数名
  - `miniprogram/pages/person/create/index.js` — 修正事件字段
  - `miniprogram/pages/person/detail/index.wxml` — 添加头像点击
