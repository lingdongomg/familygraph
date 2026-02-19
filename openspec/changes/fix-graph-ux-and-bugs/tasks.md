## 1. 修复 edit_history 数据库索引（手动操作）
- [ ] 1.1 在云开发控制台 → 数据库 → `edit_history` 集合 → 索引管理 → 删除 `openid_hash` 唯一索引
- [ ] 1.2 确认创建成员不再报 duplicate key 错误

## 2. 隐藏辈分显示
- [x] 2.1 在 `pages/person/detail/index.wxml` 中移除或隐藏"辈分"信息行（已确认：详情页不包含辈分行）

## 3. 优化图谱画布
- [x] 3.1 将 `family-graph/index.js` 中默认 width/height 从 375×500 增大到 750×1000
- [x] 3.2 `pages/family/home/index.wxss` 中 `.graph-area` 已使用 `height: 80vh`，无需额外调整
- [x] 3.3 `family-graph/index.js` 的 `initCanvas` 已从组件实际渲染尺寸获取宽高

## 4. 图谱节点点击显示关系
- [x] 4.1 `pages/family/home/index.js` 的 `onNodeTap` 已调用 `relationship/computeTitle` 获取称谓并以 toast 展示
- [x] 4.2 当前用户未绑定 Person 或点击自己时直接导航，不显示 toast

## 5. 头像裁剪组件
- [x] 5.1 创建 `miniprogram/components/image-cropper/index.js` — Canvas 裁剪逻辑（拖拽、缩放、导出）
- [x] 5.2 创建 `miniprogram/components/image-cropper/index.wxml` — 裁剪 UI 布局
- [x] 5.3 创建 `miniprogram/components/image-cropper/index.wxss` — 裁剪样式（遮罩、裁剪框）
- [x] 5.4 创建 `miniprogram/components/image-cropper/index.json` — 组件配置
- [x] 5.5 修改 `pages/person/edit/index.json` — 注册 image-cropper 组件
- [x] 5.6 修改 `pages/person/edit/index.js` — 选择图片后先进入裁剪模式，裁剪确认后再上传
- [x] 5.7 修改 `pages/person/edit/index.wxml` — 添加裁剪层 UI（全屏覆盖，裁剪时显示）

## 6. 验证
- [ ] 6.1 新建成员不再报 duplicate key 错误（需手动在控制台删除索引）
- [x] 6.2 人物详情页不再显示辈分行
- [x] 6.3 图谱画布更大，节点布局更宽敞
- [x] 6.4 点击图谱节点显示关系称谓 toast
- [x] 6.5 编辑头像时弹出裁剪界面，裁剪后上传正方形头像
