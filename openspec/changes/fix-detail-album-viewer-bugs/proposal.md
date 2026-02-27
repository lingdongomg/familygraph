# Change: 修复成员详情页照片显示、相册页标题缺失、照片查看器黑屏，并移除重复的编辑资料按钮

## Why

用户在照片上传完成后进入成员详情页时遇到多个问题：

1. **详情页"相册"区域始终显示"暂无照片"**：`person/getDetail` 云函数不查询 `photos` 集合，前端期望的 `person.photos` 始终为 `undefined`，导致即使有照片也显示空。只有点"查看全部"进入相册页才能看到。
2. **相册页标题缺少人物名字**：详情页 `onViewAlbum()` 导航时未传递 `person_name` 参数，导致相册页标题显示为"的照片"而非"张三的照片"。
3. **照片查看器黑屏**：从相册页点击照片进入 viewer 页面后一片黑。原因是 `.photo-fullscreen` 使用 `width:100%; height:100%`，但父容器 `.photo-wrapper` 使用 `flex:1`，在 flex column 布局中 `height:100%` 无法正确解析，导致图片渲染高度为 0。背景色为黑色，所以看起来是一片黑。
4. **重复的"编辑资料"按钮**：详情页底部 action bar 的"编辑资料"按钮功能与"基本信息"卡片右上角的"编辑"链接完全重复（都调用 `onEditShared`），可以移除。

## What Changes

### 详情页照片预览（Bug #1）
- 在 `person/detail/index.js` 的 `loadPersonDetail` 中，加载完 person 后额外调用 `photo/list` 获取照片列表，取前 4 张用于预览
- 修正详情页 WXML 中照片缩略图的字段名（从 `thumb_url`/`url` 改为与 `photo/list` 返回一致的 `file_id`）
- 修正 `onPreviewPhoto` 中的 URL 字段名

### 相册页标题（Bug #2）
- 在详情页 `onViewAlbum()` 的导航 URL 中传递 `person_name` 参数

### 照片查看器黑屏（Bug #3）
- 修复 viewer 页面 `.photo-fullscreen` 的 CSS，使用 `max-width`/`max-height` 而非 `width`/`height` 100%，确保图片在 flex 容器中正确显示

### 移除重复按钮（Bug #4）
- 从详情页 action bar 中移除"编辑资料"按钮，仅保留可能出现的"删除成员"按钮
- 当 `canDelete` 为 false 时不渲染 action bar

## Impact
- Affected code:
  - `miniprogram/pages/person/detail/index.js` — 照片加载 + 导航参数
  - `miniprogram/pages/person/detail/index.wxml` — 照片字段名 + action bar
  - `miniprogram/pages/photo/viewer/index.wxss` — 图片 CSS
