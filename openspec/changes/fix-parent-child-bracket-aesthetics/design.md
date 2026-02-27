## Context

力导向布局产出节点坐标后，bracket 渲染在 Canvas 上绘制亲子连线。节点圆半径 `NODE_RADIUS = 30`，下方有两行标签（name 11px + title 10px + 间距）。节点中心坐标为 `(node.x, node.y)`。

配偶节点通过 `SPOUSE_X_SPACING = 70` 对齐在同一 Y 行，配偶红线已水平连接两者。辈分间距 `GENERATION_Y_SPACING = 140`。

## Goals / Non-Goals

Goals:
- Bracket 线不穿过任何节点圆或标签区域
- 分发横线位置稳定、间距均匀
- 夫妻合并 bracket 的竖线起点有清晰的视觉衔接
- 单亲场景退化自然

Non-Goals:
- 不改变力导向布局算法
- 不改变配偶红线渲染方式
- 不改变节点外观

## Decisions

**标签区域高度估算**：name 行高 11px + 间距 3px + title 行高 10px + 间距 6px ≈ 30px。加上 nodeRadius (30px)，节点底部约在 `node.y + 60` 处。为简化，使用 `nodeRadius + 30` 作为标签底部偏移。

**分发横线固定偏移**：选择 `BRACKET_GAP = 20px`，即从父母标签底部向下 20px 处画分发横线。这样横线始终与节点有固定间距，不受子代位置影响。

**bracket 竖线终点**：到子节点顶部边缘 `child.y - nodeRadius`。

**结构**：
1. `startY = group.originY + nodeRadius + LABEL_AREA_HEIGHT` — 父母底部
2. `midY = startY + BRACKET_GAP` — 分发横线 Y
3. 竖线: `(group.originX, startY)` → `(group.originX, midY)`
4. 横线: `(leftChildX, midY)` → `(rightChildX, midY)`
5. 子代竖线: `(child.x, midY)` → `(child.x, child.y - nodeRadius)`

## Risks / Trade-offs

- 固定偏移在极端情况下（父子代 Y 非常接近）可能导致横线与子节点重叠。但力导向布局的 `GENERATION_Y_SPACING = 140` 确保父子间有足够间距（140px），减去节点高度(~60px×2=120px)仍有 ~20px 余量。
- 标签区域高度用固定值估算而非动态计算，若节点无 title 行则底部偏移略多（多 ~13px），但视觉上可接受。
