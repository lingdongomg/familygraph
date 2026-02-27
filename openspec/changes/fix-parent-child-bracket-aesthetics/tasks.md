## 1. 修改 bracket 绘制逻辑
- [x] 1.1 定义 bracket 相关常量：`LABEL_AREA_HEIGHT`（标签区高度 30px）和 `BRACKET_GAP`（分发横线偏移 20px）
- [x] 1.2 修改 bracket 竖线起点：从 `group.originY` 改为 `group.originY + nodeRadius + LABEL_AREA_HEIGHT`（父母底部边缘以下）
- [x] 1.3 修改分发横线 Y 位置：从 `(group.originY + childAvgY) / 2` 改为 `startY + BRACKET_GAP`（固定偏移）
- [x] 1.4 修改子代竖线终点：从 `children[ci].y` 改为 `children[ci].y - nodeRadius`（子节点顶部边缘）
- [x] 1.5 对单子女场景同样应用上述改进（起点、终点、横线位置）

## 2. 验证
- [ ] 2.1 手动验证：夫妻 + 多子女场景，bracket 线不穿过任何节点，分发横线位置均匀
- [ ] 2.2 手动验证：单亲场景，bracket 线从该节点底部正常引出
- [ ] 2.3 手动验证：单子女场景，竖线从父母底部到子节点顶部，无横线（或极短横线）
