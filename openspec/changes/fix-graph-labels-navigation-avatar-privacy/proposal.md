# Change: 修复图谱标签视角 + 图谱节点点击导航 + 头像隐私控制

## Why
1. 图谱节点标签显示错误视角：给自己创建"儿子"后，儿子节点下方显示"父亲"（即我对他来说是什么），而用户期望看到"儿子"（即他对我来说是什么）。根源是 BFS 称谓计算沿有向边 `from_id → to_id` 遍历，边上的 `relation_type` 表示"from_id 是 to_id 的什么"，但 `FORMAL_TITLE_MAP` 的设计语义是"目标人物是我的什么"。两者语义相反，导致直系亲属标签反转，多跳关系可能落入"亲属"兜底。
2. 图谱节点点击后不能及时跳转到详情页：当前 `onNodeTap` 在显示关系 toast 后通过 `setTimeout` 延迟 1500ms 才导航，体验上用户感觉"没反应"。需要改为立即导航，关系 toast 可以在详情页显示或作为短暂提示不阻塞导航。
3. 头像当前是共享字段（`SHARED_FIELDS`）且在 `GUEST_VISIBLE_FIELDS` 中，访客可以看到头像。用户要求头像作为隐私信息：访客不可见，且用户可以选择是否公开自己绑定的 Person 的头像。

## What Changes

### 图谱标签修复
- **`cloudfunctions/relationship/index.js`**: `bfsComputeTitle` 在遍历 `from → to` 边时，将边的 `relation_type` 转为反向关系类型（使用 `REVERSE_RELATION` + to 节点的性别），使路径键匹配 `FORMAL_TITLE_MAP` 的"目标对我来说是什么"语义
- **`cloudfunctions/relationship/utils/constants.js`**: 新增 `REVERSE_RELATION` 映射（如果该文件中尚未包含）
- **关联影响**: `getGraph` 中所有节点的 `formal_title` 都会修正为正确视角；`computeTitle` 单独调用也会修正

### 图谱导航修复
- **`miniprogram/pages/family/home/index.js`**: `onNodeTap` 改为立即导航到详情页，关系称谓 toast 在 `navigateTo` 之前同步展示（不使用 setTimeout 延迟）

### 头像隐私控制
- **`GUEST_VISIBLE_FIELDS`**: 从中移除 `avatar`，访客不再看到头像
- **`persons` 集合新增字段 `avatar_public`**（布尔，默认 `false`）：用户可选择是否公开自己头像给其他家庭成员。非公开时，仅绑定用户和 owner 可看到头像
- **`cloudfunctions/person/index.js`**:
  - `getDetail` 和 `list` 接口根据 `avatar_public` 和调用者身份决定是否返回 `avatar`
  - `update` 接口支持 `avatar_public` 字段
- **`cloudfunctions/family/index.js`**: `getByShareCode` 不再返回 avatar 字段给访客
- **`miniprogram/pages/person/edit/`**: 新增头像公开开关 UI
- 头像仍在 `persons` 表的 `avatar` 字段（共享存储），但读取时做权限过滤

## Impact
- Affected specs: graph-labels (new), graph-navigation (modified), avatar-privacy (new), privacy-control (modified), family-graph-visualization (modified)
- Affected code:
  - `cloudfunctions/relationship/index.js` — BFS 反转逻辑
  - `cloudfunctions/relationship/utils/constants.js` — REVERSE_RELATION
  - `cloudfunctions/person/index.js` — avatar 权限过滤
  - `cloudfunctions/person/utils/constants.js` — GUEST_VISIBLE_FIELDS
  - `cloudfunctions/family/index.js` — getByShareCode avatar 过滤
  - `miniprogram/pages/family/home/index.js` — onNodeTap 立即导航
  - `miniprogram/pages/person/edit/index.js` — avatar_public 开关
  - `miniprogram/pages/person/edit/index.wxml` — avatar_public UI
  - `miniprogram/utils/constants.js` — GUEST_VISIBLE_FIELDS 同步
