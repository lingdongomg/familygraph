## Context

本变更涉及 4 个独立但相互关联的优化点。其中"自定义称呼表"是全新功能，跨越前端、云函数、数据库三层，需要设计文档。

### 当前称谓系统架构
```
用户请求 → relationship/getGraph 云函数
  ├─ 查 relationships 集合 → 构建邻接表
  ├─ BFS 从"我"到每个节点 → 构建路径键 (如 FATHER|male)
  ├─ 查 FORMAL_TITLE_MAP (硬编码 JS 对象) → 获取正式称谓
  ├─ 查 person_notes.custom_title → 获取用户自定义昵称
  └─ 返回 titles: { personId: { formal_title, custom_title } }

前端 family-graph 组件:
  展示优先级: "我" > custom_title > formal_title > name
```

### 当前备注架构
```
person_notes 集合:
  { user_id, person_id, family_id, phone, wechat_id, birth_date,
    city, occupation, custom_title, remark(string) }
```

## Goals / Non-Goals

### Goals
- 修复图谱称呼显示异常
- 改善图谱节点点击体验
- 移除 is_deceased 字段的 UI 展示
- 将备注从单一文本改为条目式列表
- 支持用户自定义地区称呼表，并可分享给家庭成员

### Non-Goals
- 不修改 `FORMAL_TITLE_MAP` 的默认内容
- 不改变 BFS 最大深度（仍为 5）
- 不删除数据库中已有的 `is_deceased` 字段数据
- 不强制家庭成员使用某人的自定义称呼表

## Decisions

### D1: 自定义称呼表数据模型

**Decision**: 新增 `custom_title_maps` 集合，每条记录代表一个用户创建的称呼表。

```json
{
  "_id": "auto",
  "creator_id": "openid_hash",
  "family_id": "xxx",
  "name": "我们家的称呼习惯",
  "overrides": {
    "MOTHER>FATHER|male": "阿公",
    "MOTHER>MOTHER|female": "阿嬤",
    "FATHER>OLDER_BROTHER|male": "大伯"
  },
  "is_shared": true,
  "created_at": "serverDate",
  "updated_at": "serverDate"
}
```

**Alternatives considered**:
- 方案 A: 在 `person_notes` 中存储每个人的称呼覆盖 → 过于分散，无法复用
- 方案 B: 在 `families` 集合中添加 `title_overrides` 字段 → 只有 Owner 能修改，不够灵活
- **方案 C (选用)**: 独立集合，每人可创建自己的称呼表，可选分享 → 灵活、非强制

### D2: 称呼表使用优先级

**Decision**: 称呼展示优先级调整为:
```
"我" > custom_title (person_notes中的自定义昵称)
     > user_title_map 覆盖 (用户选用的称呼表)
     > formal_title (系统 FORMAL_TITLE_MAP)
     > name
```

用户在设置中可选择"使用某人的称呼表"，选择后 `family_members` 记录中增加 `adopted_title_map_id` 字段引用。

### D3: 备注数据迁移策略

**Decision**: 采用惰性迁移（lazy migration）。
- 云函数 `note/get` 返回数据时检测：如果 `remark` 是字符串，自动转换为 `[remark]` 数组返回
- 云函数 `note/upsert` 保存时始终写入 `remarks` 数组字段
- 旧 `remark` 字段不主动删除，仅在下次保存时自然替换

### D4: 图谱节点点击判定

**Decision**: 当前 `family-graph` 组件的 `onTouchEnd` 已经通过 `graph.getNodeAt(x, y)` 检测节点点击（基于节点中心点距离 ≤ NODE_RADIUS）。实际上点击头像区域已经能触发 `nodetap` 事件。需要排查前端事件是否被正确绑定和处理，以及 `forceGraph.getNodeAt` 的判定半径是否合理（可能需要扩大到包含标签区域）。

### D5: is_deceased 移除范围

**Decision**: 仅移除前端 UI 展示和输入。后端数据模型保留字段（不做数据迁移），云函数不再主动读写该字段。
- 优点：零数据迁移风险，如果未来需要恢复可以轻松添加回来
- 缺点：数据库中存在冗余字段

## Risks / Trade-offs

- **自定义称呼表性能**: getGraph 需额外查询一次 `custom_title_maps`，增加约 1 次数据库请求。由于称呼表通常很小（几十条 overrides），性能影响可忽略。
- **备注迁移兼容性**: 惰性迁移期间，未重新保存的旧数据仍为字符串格式。云函数需同时处理两种格式。
- **称呼表分享安全**: 分享的称呼表仅包含称谓文本映射，不含任何个人隐私数据，安全风险低。

## Open Questions

- 图谱称呼标签显示"儿子"而非"父亲"的具体复现路径需要进一步调试确认（可能是 edge 存储方向与 BFS 假设不一致）
