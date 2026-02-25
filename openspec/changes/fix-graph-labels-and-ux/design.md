## Context
图谱是亲谱 App 的核心界面，用户在此查看家庭关系。当前节点标签逻辑将人物姓名替换为关系称谓，导致用户无法同时看到"这个人是谁"和"和我什么关系"两个关键信息。此外配偶布局对齐从未生效，自己在图谱中也无法快速定位。

## Goals / Non-Goals
- Goals:
  - 每个节点同时展示姓名和称谓，信息清晰
  - 自己的节点有明确的视觉标识
  - 配偶对正确相邻排列
  - 节点尺寸适中，标签易读
- Non-Goals:
  - 不改变力导向算法本身（只修复数据传入）
  - 不改变后端 getGraph 返回的数据格式
  - 不添加图例（可后续做）

## Decisions

### 1. 双行标签设计
- Decision: 节点下方渲染两行文本——第一行为姓名（粗体 12px），第二行为关系称谓（常规 10px，灰色）
- 自我节点: 第一行显示姓名，第二行显示"本人"
- 他人节点: 第一行显示姓名，第二行显示称谓（优先级：用户自己编辑的称谓 person_notes.custom_title > BFS 计算的 formal_title）。即用户在人物备注中设置了自定义称谓的优先展示，没有自定义的才用系统称谓表计算结果。无称谓则不渲染第二行
- 未绑定用户时：所有节点只显示姓名

### 2. 自我节点高亮
- Decision: 当前用户绑定的节点增加 3px 金色描边环（#D4A017），替代默认白色描边
- Rationale: 金色在蓝/粉节点上都有良好对比度，不影响性别色彩识别

### 3. 配偶布局修复
- Decision: 在 `buildGraph()` 中扫描 edges，找到 HUSBAND/WIFE 类型边，为两端节点设置 `isSpouse: true` 和 `spouseId`
- Rationale: ForceGraph 已有配偶对齐逻辑（spouse X/Y strength），但 buildGraph 从未传入 isSpouse/spouseId 字段

### 4. 尺寸调整
- Decision:
  - NODE_RADIUS: 25 → 30
  - FONT_SIZE: 12 → 13（节点内首字母）
  - LABEL_FONT_SIZE: 10 → 11（第一行名字）
  - 新增 SUB_LABEL_FONT_SIZE: 10（第二行称谓）
  - GENERATION_Y_SPACING: 120 → 140（为双行标签留空间）
  - forceGraph.js 中的同名常量同步调整

### 5. 标签截断
- Decision: 姓名超过 4 个字符截断加"…"，称谓超过 5 个字符截断加"…"
- Rationale: 防止长名字遮挡相邻节点

### 6. 点击热区扩大
- Decision: `forceGraph.js` 中 `getNodeAt()` 的 `LABEL_HIT_EXTRA` 从 20 增大到 40，确保双行标签区域也在可点击范围内
- Rationale: 双行标签使节点可视区域向下延伸约 30px（原先单行约 16px），热区需相应扩大，让用户点击头像或任一行标签都能触发导航到人物详情页
- 当前行为: 点击节点已能跳转到 `/pages/person/detail/index`（`home/index.js:83`），无需改导航逻辑，只需确保热区覆盖

## Risks / Trade-offs
- 节点增大会导致少数节点数特别多（50+）的图谱更拥挤 → 用户可通过缩放(pinch-zoom)调整
- 双行标签增加渲染量 → 影响极小（纯 Canvas 文本绘制）
- 配偶对齐修复后布局会与之前不同 → 这是预期行为改善

## Open Questions
- 无
