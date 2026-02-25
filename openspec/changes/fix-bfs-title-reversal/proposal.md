# Change: 修复 BFS 称谓计算中标签视角反转 Bug

## Why
用户报告：创建"新成员是张三的父亲"后，图谱中父亲节点下方标签显示"儿子"而非"父亲"。此问题在之前的 `fix-titlemap-babel-and-graph-bugs` 和 `cb552fe` 提交中已尝试修复，但用户反馈问题依然存在。

经详细代码审查，BFS 反转逻辑（`cloudfunctions/relationship/index.js:246-250`）**在代码层面是正确的**：
- 邻接表中的边 `张三 -> father, type=SON`（含义：张三是father的SON）
- BFS 反转为 `REVERSE_RELATION['SON'][father.gender=male] = 'FATHER'`
- 路径 `['FATHER']`，键 `'FATHER|male'` → `FORMAL_TITLE_MAP` 返回"父亲"

因此最可能的原因是：**云函数未重新部署**，服务端仍运行 `cb552fe` 之前的旧代码（旧代码不做反转，直接用 `neighbor.relation_type` 拼路径），导致路径变成 `['SON']` → "儿子"。

为彻底排查和解决此问题，本变更将：
1. 在 BFS 函数中添加调试日志，以便在云端验证实际计算路径
2. 确认云函数已正确部署
3. 提供验证用的测试场景

## What Changes
- 在 `bfsComputeTitle()` 中增加可选调试日志（`console.log`），记录每步的 edge type、reversed type 和最终 pathKey，用于部署后验证
- 确保 `relationship` 云函数重新部署后 BFS 反转逻辑生效

## Impact
- Affected code:
  - `cloudfunctions/relationship/index.js` — BFS 函数添加临时调试日志
- 风险极低：仅增加 console.log 输出，不改变任何计算逻辑
- 调试日志可在确认问题解决后移除
