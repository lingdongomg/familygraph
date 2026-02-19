## Context

### 图谱标签视角问题根因

数据库中关系边的语义：`from_id` 是 `to_id` 的 `relation_type`。例如：
- 我给自己创建儿子时，系统创建：
  - 正向边：`son → me`, type=`SON`（儿子是我的 SON）
  - 反向边：`me → son`, type=`FATHER`（我是儿子的 FATHER）

BFS 从"我"出发，沿 `me → son` 边走，拿到 `relation_type = FATHER`。路径键 = `FATHER|male`，查表得到 "父亲"。

但 `FORMAL_TITLE_MAP` 的语义是"目标人物对我来说是什么"：`SON|male` → "儿子"。即路径中每一步的关系类型应该表示"目标是我的什么"而非"我是目标的什么"。

**修复方案**：BFS 在遍历 `from → to` 边时，将 `relation_type` 映射为反向关系类型。具体做法：

```
edge: from=me, to=son, relation_type=FATHER
原始含义: 我是他的 FATHER
需要转为: 他是我的 SON（根据 son 的性别 male，REVERSE_RELATION['FATHER']['male'] = 'SON'）
```

这样路径变为 `['SON']`，路径键 = `SON|male`，查表 → "儿子"。

需要在 BFS 遍历时获取每个中间节点的性别来正确应用 REVERSE_RELATION。`getGraph` 已经拿到了所有 persons（含 gender），`computeTitle` 需要额外加载所有 persons 或在邻接表中嵌入 to 节点的性别。

**推荐实现**：在构建邻接表时，同时存储 `to_id` 的性别信息。在 BFS 中取到边后，查 `REVERSE_RELATION[relation_type][toGender]` 来获取反转类型，压入路径。

### 母亲未与父亲连线

这是预期行为——创建母亲时只建立母亲与我的关系边，不自动推导配偶关系。要连线需要用户手动创建父亲与母亲的配偶关系。这不是 bug，但标签修复后"亲属"问题会大幅改善（母亲的标签会正确显示"母亲"而非其他）。

### 头像隐私方案

当前 `avatar` 在 `SHARED_FIELDS` 和 `GUEST_VISIBLE_FIELDS` 中。修改方案：

1. 从 `GUEST_VISIBLE_FIELDS` 中移除 `avatar`
2. 在 `persons` 集合新增 `avatar_public` 布尔字段（默认 `false`）
3. 读取逻辑：
   - 绑定用户自己 → 总是可见
   - Owner → 总是可见
   - 其他 member/restricted → 仅 `avatar_public=true` 时可见
   - 访客 → 不可见
4. 任何家庭成员（member 及以上）都可以为 Person 设置头像（上传），但 `avatar_public` 仅绑定用户自己或 Owner 可修改

## Goals / Non-Goals
- **Goals**: 修复图谱标签视角、优化节点点击体验、实现头像隐私控制
- **Non-Goals**: 不自动创建配偶关系、不更改力导向布局算法、不实现头像编辑限制（当前任何 member 可上传，保持不变）
