# Change: 修复成员创建上限与相册图片显示两个严重缺陷

## Why
1. **成员创建被卡死**: 当家庭成员达到 7 人后，点击"添加成员"按钮无任何反应。根因是 `wx.showActionSheet` 的 `itemList` 最多只支持 6 项，超出后微信 API 静默失败。新建家庭可正常添加是因为首个成员走的是直接跳转（无 ActionSheet）分支。
2. **相册图片显示全黑**: 客户端上传照片后将 `file_id` 传给云函数，但云函数 `handleUpload` 的参数签名中未解构 `file_id`，导致数据库中 `file_id` 字段始终为空字符串。WXML 渲染时以空字符串作为 `<image src>`，显示为黑色。

## What Changes
- **成员创建**: 将 `onAddMember()` 中的 `wx.showActionSheet` 替换为自定义滚动选择弹窗，支持任意数量成员选择
- **照片上传**: 修复云函数 `handleUpload` 参数签名以正确接收 `file_id`，并在创建记录时写入实际的 `file_id`；同时将记录状态更新为 `active`
- **照片显示**: 确保相册页 WXML 中 `<image src>` 绑定的字段与数据库实际存储字段一致

## Impact
- Affected specs: member-creation, photo-album
- Affected code:
  - `miniprogram/pages/family/home/index.js:100-122` — onAddMember 方法
  - `miniprogram/pages/family/home/index.wxml` — 新增成员选择弹窗模板
  - `miniprogram/pages/family/home/index.wxss` — 弹窗样式
  - `cloudfunctions/photo/index.js:23` — handleUpload 参数签名
  - `cloudfunctions/photo/index.js:67-77` — photoRecord 构造
  - `miniprogram/pages/photo/album/index.wxml:25` — image src 绑定
