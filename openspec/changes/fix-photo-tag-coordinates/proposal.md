# Change: 修复照片标记点坐标偏移 — 标记总是出现在左上角

## Why

用户在照片中间点击标记人物后，标记点总是出现在照片左上角而非点击位置。原因有两个：

### Bug 1: 触摸坐标取值错误（主要原因）

`photo-tagger` 组件在 `onImageTap` 中使用 `e.detail.x` 和 `e.detail.y` 获取点击坐标。但微信小程序的 `tap` 事件的 `detail` 对象**不包含** `x`/`y` 属性。正确的取法是 `e.touches[0].clientX` / `e.touches[0].clientY`（或 `e.changedTouches`）。

由于 `e.detail.x` 为 `undefined`，JavaScript 将其当作 `0` 参与运算：
```
x = ((undefined - rect.left) / rect.width) * 100  →  负数  →  被 Math.max(0, ...) 钳制为 0
y = ((undefined - rect.top)  / rect.height) * 100  →  负数  →  被 Math.max(0, ...) 钳制为 0
```
所以无论点击哪里，坐标始终为 `(0, 0)` — 即左上角。

### Bug 2: 坐标单位不一致（次要问题）

- **保存时**：tag 页面将 0-100 范围的坐标除以 100，以 0-1 范围存入数据库（`position.x / 100`）
- **显示时**：viewer 页面和 tagger 组件都用 `style="left:{{item.x}}%;top:{{item.y}}%;"` ，期望 0-100 范围的百分比
- **结果**：即使坐标正确，存入 DB 的 `0.5` 在显示时变成 `left:0.5%` 而非 `left:50%`

## What Changes

### 文件 1: `miniprogram/components/photo-tagger/index.js`
- 将 `e.detail.x` / `e.detail.y` 改为 `e.touches[0].clientX` / `e.touches[0].clientY`

### 文件 2: `miniprogram/pages/photo/tag/index.js`
- `addTag` 方法中不再除以 100：直接传 `position.x / 100` → 仍以 0-1 范围存入 DB（保持 API 契约不变）
- 已有的 `/100` 实际上是正确的（DB 存 0-1），问题在于显示侧

### 文件 3: `miniprogram/pages/photo/viewer/index.wxml`
- tag overlay 的 `left`/`top` 改为 `item.x * 100` / `item.y * 100`，将 0-1 范围还原为 0-100 百分比

### 文件 4: `miniprogram/pages/photo/tag/index.js` (reloadTags)
- 重新加载 tags 后，将 0-1 范围的 x/y 转换为 0-100 供 photo-tagger 组件使用

## Impact
- Affected code:
  - `miniprogram/components/photo-tagger/index.js` — 触摸坐标获取
  - `miniprogram/pages/photo/tag/index.js` — tag 数据加载后的坐标转换
  - `miniprogram/pages/photo/viewer/index.wxml` — tag 显示坐标
- 不影响云函数、DB schema、其他页面
