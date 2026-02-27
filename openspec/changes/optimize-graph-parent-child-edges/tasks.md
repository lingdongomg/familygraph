## 1. Implementation

- [x] 1.1 在 `cloudfunctions/person/utils/constants.js` 中新增 `SIBLING_TYPES`、`CHILD_TYPES` 和 `SPOUSE_TYPES` 常量分组
- [x] 1.2 在 `cloudfunctions/person/index.js` create 函数中实现同辈推断逻辑：当关系类型为兄弟姐妹时，查找参照人的父母并创建双向亲子边
- [x] 1.3 在 `cloudfunctions/person/index.js` create 函数中实现子代推断逻辑：当关系类型为儿子/女儿时，查找参照人的配偶并创建双向亲子边
- [x] 1.4 添加重复边检测，在创建推断边前检查是否已存在

## 2. Validation

- [ ] 2.1 手动测试：创建"我" → 创建父母 → 创建姐姐 → 验证姐姐与父母之间自动产生亲子连线
- [ ] 2.2 手动测试：创建夫妻 → 以丈夫为参照创建儿子 → 验证儿子与妻子之间自动产生亲子连线
- [ ] 2.3 验证 BFS 称谓计算在新增推断边后仍然正确
- [ ] 2.4 验证图谱渲染中新增的亲子边正确显示为蓝色实线
