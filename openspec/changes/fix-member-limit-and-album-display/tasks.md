## 1. 修复成员创建 7 人上限问题
- [x] 1.1 在 `miniprogram/pages/family/home/index.wxml` 中新增自定义成员选择弹窗（半屏滚动列表替代 `wx.showActionSheet`）
- [x] 1.2 在 `miniprogram/pages/family/home/index.wxss` 中添加弹窗样式
- [x] 1.3 修改 `miniprogram/pages/family/home/index.js` 中 `onAddMember()` 方法，使用自定义弹窗代替 `wx.showActionSheet`，新增 `onSelectRef` / `onClosePicker` 等事件处理
- [ ] 1.4 手动验证：在家庭中添加 7+ 成员后点击加号仍可正常选择参考人并跳转创建页面

## 2. 修复相册图片显示全黑问题
- [x] 2.1 修改 `cloudfunctions/photo/index.js` 中 `handleUpload` 函数签名，新增 `file_id`（及可选 `width`、`height`）参数解构
- [x] 2.2 修改 `handleUpload` 中 photoRecord 构造，将传入的 `file_id` 写入数据库记录，将 `status` 设为 `active`
- [x] 2.3 确认 `miniprogram/pages/photo/album/index.wxml` 中 image src 绑定的 `item.file_id` 与数据库字段名一致（当前已一致，仅需验证）
- [ ] 2.4 部署更新后的 photo 云函数并手动验证：上传照片后图片正常显示
