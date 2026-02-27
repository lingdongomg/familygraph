# Change: 优化图谱连线 — 同辈新成员自动继承亲代边

## Why
当前创建同辈成员（如姐姐）时，系统只在新成员与参照人之间创建兄弟/姐妹边，不会自动为新成员和参照人的父母建立亲子边。这导致图谱中姐姐与父母之间没有连线，视觉上不符合家族树"亲代与子代相连"的直觉预期。

**复现步骤：**
1. 创建"我"
2. 以"我"为参照创建父亲和母亲（产生亲子边：父→我、母→我）
3. 以"我"为参照创建姐姐（产生兄妹边：姐↔我）
4. 结果：姐姐与父母之间无连线

**期望：** 姐姐作为同辈成员，应自动与已存在的父母产生亲子连线。

## What Changes
- 在 `cloudfunctions/person/index.js` 的 `create` 函数中，当新成员的关系类型为同辈（兄弟姐妹）时，自动查找参照人的父母，并为新成员与这些父母创建双向亲子边
- 同理，当新成员是子代（儿子/女儿），且参照人有配偶时，也自动为新成员与参照人的配偶创建双向亲子边
- 图谱渲染不需要改动，因为渲染层已正确处理所有 `relationships` 边

## Impact
- Affected specs: graph-edge-inference (新增)
- Affected code:
  - `cloudfunctions/person/index.js:100-127` — create 函数的关系创建逻辑
  - `cloudfunctions/relationship/utils/constants.js` — 可能新增常量分组
