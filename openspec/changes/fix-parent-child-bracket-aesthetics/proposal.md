# Change: 修复亲子 bracket 连线美观性 — 边缘衔接与间距优化

## Why

上一次 `improve-graph-edge-rendering` 变更实现了夫妻合并 bracket 连线的基本结构（从夫妻中点向下画竖线 → 分发横线 → 子代竖线），但实际效果仍不美观。具体问题：

1. **连线起点穿过节点**：竖线从 `group.originY`（父母节点中心 Y 坐标）开始画，穿过节点圆和下方文字标签区域，视觉上线条与节点重叠。
2. **连线终点穿过子节点**：竖线画到 `children[ci].y`（子节点中心），同样穿过子节点圆形，不美观。
3. **分发横线位置不稳定**：`midY = (originY + childAvgY) / 2` 使横线位置随子代数量和位置变化，间距不均匀。当父子距离很近时横线紧贴节点。
4. **bracket 起点悬空**：夫妻中点是两个配偶节点之间的空白处，竖线从这里开始没有可见的衔接，看起来线条凭空出现。

## 用户期望

```
  父亲 ──── 母亲          ← 配偶红线（已有）
        |                  ← 从配偶红线中点向下的竖线（起点在节点底部 + 标签区域下方）
        |
   ┌────┼────┐             ← 子代分发横线（固定在父母底部以下的偏移处）
   │    │    │
  子A  子B  子C            ← 竖线终点在子节点顶部边缘
```

关键改进：
- 竖线从父母节点**底部边缘**（包含标签区域）开始，不穿过节点
- 竖线到子节点**顶部边缘**结束，不穿过节点
- 分发横线位置使用固定偏移（父母底部以下一定距离），而非动态中点
- 分发横线需覆盖从最左子节点到最右子节点的范围，中间与竖线连接

## What Changes

仅修改 `miniprogram/components/family-graph/index.js` 中 bracket 绘制逻辑（约第 294-348 行）：

- **起点**：从 `group.originY` 改为 `group.originY + nodeRadius + labelAreaHeight`（节点底部 + 标签高度）
- **终点**：从 `children[ci].y` 改为 `children[ci].y - nodeRadius`（子节点顶部）
- **分发横线位置**：改为 `startY + BRACKET_GAP`（起点下方固定偏移），不再用动态 midY
- **连接到中心竖线**：从分发横线的 `group.originX` 位置向上连到起点

## Impact
- Affected code: `miniprogram/components/family-graph/index.js` — bracket 绘制部分
- 不影响力导向布局、配偶红线、节点渲染
