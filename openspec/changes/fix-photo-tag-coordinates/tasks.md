## 1. 修复触摸坐标获取
- [x] 1.1 在 `miniprogram/components/photo-tagger/index.js` 的 `onImageTap` 中，将 `e.detail.x`/`e.detail.y` 替换为 `e.touches[0].clientX`/`e.touches[0].clientY`

## 2. 修复 viewer 页面标记显示坐标
- [x] 2.1 在 `miniprogram/pages/photo/viewer/index.wxml` 中，将 tag overlay 的 `left:{{item.x}}%` 改为 `left:{{item.x * 100}}%`，`top:{{item.y}}%` 改为 `top:{{item.y * 100}}%`

## 3. 修复 tag 页面加载后的坐标转换
- [x] 3.1 在 `miniprogram/pages/photo/tag/index.js` 的 `loadData` 和 `reloadTags` 中，将从 API 获取的 tags 的 x/y 从 0-1 乘以 100 转为 0-100，再传给 photo-tagger 组件

## 4. 验证
- [ ] 4.1 手动验证：在照片中间点击标记，标记点出现在点击位置附近
- [ ] 4.2 手动验证：保存标记后返回查看器，标记位置与标记时一致
- [ ] 4.3 手动验证：在照片四角各标记一次，位置都准确
