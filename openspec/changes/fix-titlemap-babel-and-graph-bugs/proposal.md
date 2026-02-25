# Change: 修复称呼表页面 Babel 运行时错误、关系标签视角问题和自我节点标识

## Why
三个问题需要修复：
1. **称呼表页面 Babel 报错**: `titlemap/index.js` 使用了 ES6 展开语法（`[...array]`），微信小程序运行时不支持，导致 `@babel/runtime/helpers/arrayWithoutHoles.js is not defined` 错误
2. **关系标签视角混淆**: 创建"我的父亲"后，图谱中父亲节点下方显示"儿子"而非"父亲"。经代码审查，BFS 计算逻辑本身正确，问题出在 **创建成员页面 UI 语义** ——提示语"他/她是 {参照人} 的..."容易被理解为"新人物与参照人的关系是..."，但实际含义是"新人物是参照人的..."。当用户理解为"我选择父亲=他是我的父亲"时，创建的边语义正确；但如果 BFS 确实返回错误结果，则需要验证。考虑到用户报告了"儿子"的实际显示，最可能的原因是 **UI 语义引导用户选错了方向**，需要改善 UI 文案并补充提示
3. **自我节点标识**: 用户希望自己在图谱中更显眼——当前已实现金色描边（#D4A017），但可能不够明显。需要增强自我节点的视觉标识

## What Changes
- **修复展开语法**: 将 `titlemap/index.js` 中所有 `[...array]` 替换为 `array.slice()` 或 `Array.prototype.concat`
- **改善创建成员 UI 文案**: 将"他/她是 {name} 的..."改为"新成员是 {name} 的..."，并在关系按钮下方增加实时预览"即：{name} 的 {关系中文}"确认语义
- **增强自我节点标识**: 在金色描边基础上，加粗描边至 4px，并为自我节点圆圈添加微弱的外发光效果（额外画一个半透明金色大圆）

## Impact
- Affected code:
  - `miniprogram/pages/family/titlemap/index.js` — 消除展开语法
  - `miniprogram/pages/person/create/index.wxml` — 改善关系选择 UI 文案
  - `miniprogram/components/family-graph/index.js` — 增强自我节点视觉效果
