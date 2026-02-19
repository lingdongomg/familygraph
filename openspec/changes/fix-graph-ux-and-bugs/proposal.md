# Change: 修复数据库索引 + 图谱交互优化 + 辈分隐藏 + 头像裁剪 + 关系显示

## Why
1. 新建成员时偶发 `E11000 duplicate key error`：`edit_history` 集合被错误配置了 `openid_hash` 唯一索引
2. 图谱画布太小（375×500），人物易拖出可视区域
3. 人物详情显示"第零代"辈分信息不直观，应隐藏
4. 头像上传没有裁剪功能，需要自定义裁剪组件
5. 图谱中点击人物应显示与"我"的关系称谓，同辈（兄弟姐妹）在无明确年龄时应显示泛称

## What Changes
- **数据库**: 需手动删除 `edit_history` 集合上的 `openid_hash` 唯一索引（控制台操作）
- **图谱画布**: 增大坐标空间至 750×1000，提升视觉体验
- **辈分隐藏**: 在 `person/detail` 页面隐藏辈分行
- **头像裁剪**: 新建 `image-cropper` 组件，在编辑头像时提供拖拽/缩放裁剪功能
- **关系显示**: 点击图谱节点时以 toast 显示与"我"的关系称谓

## Impact
- Affected specs: database-fix, graph-ux, person-display, avatar-crop, graph-relationship
- Affected code:
  - `miniprogram/pages/person/detail/index.wxml` — 隐藏辈分行
  - `miniprogram/pages/family/home/index.wxml` — 增大图谱尺寸
  - `miniprogram/pages/family/home/index.js` — 节点点击显示关系
  - `miniprogram/pages/family/home/index.wxss` — 图谱区域样式
  - `miniprogram/components/family-graph/index.js` — 画布尺寸自适应
  - `miniprogram/components/image-cropper/` — 新建裁剪组件
  - `miniprogram/pages/person/edit/index.js` — 集成裁剪流程
  - `miniprogram/pages/person/edit/index.json` — 注册裁剪组件
  - `miniprogram/pages/person/edit/index.wxml` — 裁剪 UI
