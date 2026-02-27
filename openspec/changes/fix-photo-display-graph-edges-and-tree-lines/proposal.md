# Change: 修复照片显示、完善图谱推断规则、改进连线样式、明确删除成员入口

## Why
1. **照片上传后仍不显示**：上次修复了云函数参数签名，但照片依然不显示。经排查，云函数代码在本地已修正，但需要重新部署到云端才能生效。此外，之前上传的旧照片 `file_id` 为空字符串，需要提供修复脚本。
2. **创建成员时推断规则严重不全**：对所有 10 种关系类型进行系统分析后，发现现有 2 条规则（同辈→继承父母、子代→继承配偶）远远不够，总共遗漏了 5 条推断规则。详见下方完整矩阵。
3. **图谱亲子连线样式**：当前所有边都是直线，多子女时连线交叉混乱。用户希望亲子连线采用"生物亲代图谱"样式（bracket/tree 形）。
4. **删除成员入口不明显**：删除功能已实现，但用户找不到入口——需要改善可发现性。

## 推断规则完整分析矩阵

**现有规则（已实现）：**
- **Rule 1** — 创建**同辈**：继承参照人的**父母**边（新同辈 ↔ 参照人的每个父母）
- **Rule 2** — 创建**子代**：继承参照人的**配偶**边（新子代 ↔ 参照人的配偶，作为第二个父母）

**缺失规则（本次新增）：**
- **Rule 3** — 创建**亲代**：继承参照人的**同辈**为子女（新父母 ↔ 参照人的每个兄弟姐妹）
  - 例：创建"外公"为"妈妈"的 FATHER → 外公自动连接妈妈的姐姐
- **Rule 4** — 创建**亲代**：继承参照人的**另一个亲代**为配偶（新父母 ↔ 参照人已有的另一位父/母）
  - 例：已有"妈妈"→创建"爸爸"为"我"的 FATHER → 爸爸自动成为妈妈的 HUSBAND
- **Rule 5** — 创建**同辈**：继承参照人的**其他同辈**为同辈（新同辈 ↔ 参照人的每个已有兄弟姐妹）
  - 例：已有"姐姐"→创建"弟弟"为"我"的 YOUNGER_BROTHER → 弟弟自动成为姐姐的兄弟
- **Rule 6** — 创建**子代**：继承参照人的**其他子女**为同辈（新子代 ↔ 参照人的每个已有子女）
  - 例：已有"我"→创建"弟弟"为"爸爸"的 SON → 弟弟自动成为我的兄弟
- **Rule 7** — 创建**配偶**：继承参照人的**子女**为子女（新配偶 ↔ 参照人的每个子女）
  - 例：已有"我"为"爸爸"的 SON → 创建"妈妈"为"爸爸"的 WIFE → 妈妈自动成为我的 MOTHER

## What Changes
- **照片**：修正云函数注释；增加管理员修复脚本修复旧照片记录的空 `file_id`；确认部署指引
- **图谱推断**：在 `cloudfunctions/person/index.js` create 函数中新增 Rule 3-7 五条推断规则，并在 constants.js 中新增 `PARENT_TYPES` 常量
- **连线样式**：在 `miniprogram/components/family-graph/index.js` 绘制边时，对亲子类型边按父母分组，绘制 bracket/tree 形连线替代直线
- **删除入口**：在成员详情页操作区域增加更明显的删除按钮位置和提示文字

## Impact
- Affected specs: photo-upload-flow, graph-edge-inference, graph-tree-lines, person-delete-ux
- Affected code:
  - `cloudfunctions/photo/index.js:21` — 注释修正
  - `cloudfunctions/person/index.js:130-204` — 新增 Rule 3-7 推断逻辑
  - `cloudfunctions/person/utils/constants.js` — 新增 PARENT_TYPES 常量
  - `miniprogram/components/family-graph/index.js:208-236` — 亲子连线绘制逻辑重写
  - `miniprogram/pages/person/detail/index.wxml` — 删除按钮可发现性改善
