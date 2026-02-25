# Change: 修复图谱节点标签与整体体验

## Why
图谱界面存在多个体验问题：(1) 节点只显示关系称谓或名字（二选一），用户期望同时看到名字和称谓；(2) 自己的节点硬编码显示"我"，用户期望显示"本人"标签；(3) 配偶对齐布局失效——`buildGraph()` 未将配偶信息传给力导向引擎；(4) 自己的节点没有视觉区分，难以在图谱中定位自己；(5) 节点尺寸和字体偏小，信息密度不足。

## What Changes
- **双行标签**: 节点下方改为两行文本——第一行显示人物姓名，第二行显示关系称谓（自己显示"本人"，他人显示"爸爸"等称谓，无称谓则不显示第二行）
- **自我节点高亮**: 当前用户绑定的节点增加醒目的高亮环（金色描边），便于快速定位
- **修复配偶布局**: `buildGraph()` 从 edges 中检测 HUSBAND/WIFE 类型边，正确设置 `isSpouse` 和 `spouseId`，使力导向引擎的配偶对齐力生效
- **调大节点尺寸**: NODE_RADIUS 从 25 增大到 30，LABEL_FONT_SIZE 从 10 增大到 11，适当增大间距
- **标签截断处理**: 名字超过 4 个字符时截断显示并加省略号
- **称谓优先级明确**: 第二行称谓优先显示用户自己在备注中编辑的称谓（person_notes.custom_title），没有编辑过的才使用称谓表（BFS formal_title）
- **扩大点击热区**: 双行标签使节点可视区域变大，需同步扩大 ForceGraph 的 hit-test 热区，确保点击头像或标签均可触发跳转到人物详情页

## Impact
- Affected specs: `family-graph-visualization`（新增）
- Affected code:
  - `miniprogram/components/family-graph/index.js` — 双行标签渲染、自我节点高亮、配偶检测、尺寸调整
  - `miniprogram/utils/constants.js` — GRAPH 常量调整
  - `miniprogram/utils/forceGraph.js` — NODE_RADIUS 同步调整、hit-test 热区扩大
