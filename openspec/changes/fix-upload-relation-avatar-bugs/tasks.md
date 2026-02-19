## 1. 修复照片上传参数名
- [x] 1.1 将 `pages/photo/album/index.js` 中 `size: compressed.size` 改为 `file_size: compressed.size`

## 2. 修复关系选择器事件
- [x] 2.1 将 `pages/person/create/index.js` 的 `onRelationSelect` 中 `e.detail.value` 改为 `e.detail.type`

## 3. 头像可点击跳转编辑
- [x] 3.1 给 `pages/person/detail/index.wxml` 的头像 `<image>` 添加 `bindtap="onEditShared"`
