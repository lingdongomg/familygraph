## 1. 修复详情页照片预览不显示
- [x] 1.1 在 `person/detail/index.js` 的 `loadPersonDetail` 中，与 `getDetail` 并行调用 `photo/list`，取返回的照片列表前 4 张存入 `photos`
- [x] 1.2 修正 `person/detail/index.wxml` 照片缩略图字段名：`thumb_url || item.url` → `item.file_id`（与 photo/list 返回的字段对齐）
- [x] 1.3 修正 `person/detail/index.js` 的 `onPreviewPhoto`：用 `file_id` 构建预览 URL 列表

## 2. 修复相册页标题缺少人物名字
- [x] 2.1 在 `person/detail/index.js` 的 `onViewAlbum` 导航 URL 中追加 `person_name` 参数（使用 `encodeURIComponent`）

## 3. 修复照片查看器黑屏
- [x] 3.1 修改 `photo/viewer/index.wxss` 的 `.photo-fullscreen` 样式，使用绝对定位确保图片在 flex 容器中正确显示尺寸

## 4. 移除重复的"编辑资料"按钮
- [x] 4.1 从 `person/detail/index.wxml` 的 action bar 中移除"编辑资料"按钮
- [x] 4.2 当 `canDelete` 为 false 时不渲染 action bar（因为 action bar 中只剩下"删除成员"一个按钮）

## 5. 验证
- [ ] 5.1 手动验证：上传照片后进入成员详情页，底部相册预览区能看到照片缩略图
- [ ] 5.2 手动验证：点击"查看全部"进入相册页，标题显示"XX的照片"
- [ ] 5.3 手动验证：在相册页点击照片进入查看器，图片正常显示，不是黑屏
- [ ] 5.4 手动验证：详情页底部仅显示"删除成员"按钮（有权限时）或不显示 action bar
