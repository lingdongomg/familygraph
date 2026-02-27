## Context
创建成员时只在新成员与参照人之间创建关系边。对于同辈关系（兄弟姐妹），这意味着新成员不会自动与参照人的父母产生连接，导致图谱不连通。

## Goals / Non-Goals
- Goals:
  - 创建同辈成员时，自动推断并创建与参照人父母的亲子边
  - 创建子代成员时，自动推断并创建与参照人配偶的亲子边
  - 保持 generation 字段正确
- Non-Goals:
  - 不修改图谱渲染逻辑（渲染层已正确处理所有边类型）
  - 不追溯修复已有数据（用户可通过手动添加关系修复）
  - 不推断祖孙等跨代关系

## Decisions

### 推断规则

**规则一：同辈推断亲代边**
当 `relation_type` ∈ {OLDER_BROTHER, YOUNGER_BROTHER, OLDER_SISTER, YOUNGER_SISTER} 时：
1. 查询参照人的所有入边（即 `to_id = reference_person_id`）
2. 筛选 `relation_type` ∈ {FATHER, MOTHER} 的边，获取参照人的父母 ID 列表
3. 对每个父母，创建双向亲子边：
   - 父/母 → 新成员（FATHER/MOTHER）
   - 新成员 → 父/母（SON/DAUGHTER，根据新成员 gender 决定）

**规则二：子代推断配偶亲代边**
当 `relation_type` ∈ {SON, DAUGHTER} 时：
1. 查询参照人的配偶（边类型 HUSBAND/WIFE）
2. 对每个配偶，创建双向亲子边：
   - 配偶 → 新成员（根据配偶 gender 决定 FATHER/MOTHER）
   - 新成员 → 配偶（SON/DAUGHTER）

### 实现位置
在 `cloudfunctions/person/index.js` create 函数中，现有关系创建代码块（lines 100-127）之后追加推断逻辑。

### 避免重复边
在创建推断边之前，先检查是否已存在相同方向和类型的边，避免重复创建。

- Alternatives considered:
  - 在前端 getGraph 时动态计算虚拟边：增加前端复杂度，且不会真正写入数据库，BFS 称谓计算也无法使用
  - 用后台定时任务修补缺失边：延迟性差，用户体验不好
  - 在 relationship 云函数中做推断：职责不对，person 创建时就应该一次性完成

## Risks / Trade-offs
- 增加 person create 时的数据库写入次数（最多额外 4 条边：2 父母 × 2 方向），但这是一次性操作，影响可忽略
- 推断逻辑仅在创建时执行，不会影响已有成员的关系

## Open Questions
- 无
