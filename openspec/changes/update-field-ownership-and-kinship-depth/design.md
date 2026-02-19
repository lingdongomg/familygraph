## 背景

当前 add-familygraph-v1 的数据模型将 Person 的所有字段（姓名、手机号、城市、职业等）存储在 `persons` 集合中作为共享数据，配合 `privacy_settings` 集合控制可见性。但这不符合实际使用场景——不同家庭成员对同一个人的联系方式、地址等信息的了解不同，这些信息本质上是"我的通讯录备注"，不是"大家公认的信息"。

同时，亲属称谓需要从四代扩展到五代，以覆盖高祖辈和玄孙辈。

## 目标 / 非目标

- **目标**:
  - 将 Person 字段拆分为"共享层"（客观属性）和"私人覆盖层"（主观备注）
  - 移除 `privacy_settings` 集合，简化数据模型
  - 扩展 `person_notes` 承担所有私人覆盖字段
  - BFS 深度从 4 扩展到 5，称谓表覆盖五代
- **非目标**:
  - 不实现"共享联系方式"（完全私人模式）
  - 不做私人备注的同步/合并机制
  - 不做六代及以上的称谓

## 数据模型变更

### `persons` 集合（精简后）

```
{
  _id, family_id, name, gender, birth_year,
  is_deceased, avatar, bound_user_id, generation,
  member_count (on family), created_at, updated_at
}
```

**移除的字段**: phone, birth_date, city, occupation
— 这些全部移至 `person_notes` 作为私人覆盖字段。

### `person_notes` 集合（扩展后）

```
{
  _id, user_id, person_id, family_id,
  // 原有字段
  custom_title,       // 自定义称呼
  remark,             // 自由文本备注
  // 新增私人覆盖字段
  phone,              // 手机号（AES 加密）
  wechat_id,          // 微信号（AES 加密）
  birth_date,         // 完整出生日期
  city,               // 城市/地址
  occupation,         // 职业
  updated_at
}
```

**索引**: `(user_id, person_id)` 唯一索引，`(user_id, family_id)` 用于批量查询。

### `privacy_settings` 集合 — **移除**

不再需要。私人覆盖字段天然只有记录者自己可见，共享字段（姓名、性别等）始终对全体家庭成员可见。

**访客（Guest）看到的字段**不变: 姓名、性别、出生年份、是否已故、头像、关系。

## 架构影响

### 数据流变更

**旧流程（查看 Person 详情）**:
```
getDetail → 读 persons → 读 privacy_settings → 按隐私级别过滤 → 返回
```

**新流程（查看 Person 详情）**:
```
getDetail → 读 persons（共享层）→ 读 person_notes（当前用户的私人层）→ 合并 → 返回
```

合并规则：共享层字段始终返回；私人覆盖层字段仅返回当前用户自己记录的值。

### 云函数变更

| 函数 | 变更 |
|------|------|
| `person/create` | 不再写入 phone/city/occupation 到 persons |
| `person/update` | 仅允许更新共享字段（name, gender, birth_year, is_deceased, avatar）|
| `person/getDetail` | 读取共享层 + 当前用户的 person_notes，合并后返回 |
| `person/updatePrivacy` | **移除** |
| `note/upsert` | 扩展支持 phone, wechat_id, birth_date, city, occupation 字段 |
| `note/get` | 扩展返回所有私人覆盖字段 |
| `relationship/computeTitle` | BFS 最大深度从 4 改为 5 |

### 页面变更

| 页面 | 变更 |
|------|------|
| `person/detail` | 分两区域展示: "基本信息"（共享）+ "我的备注"（私人）|
| `person/edit` | 拆分为两个入口: "编辑基本信息"（改共享字段）+ "编辑我的备注"（改 person_notes）|
| `person/privacy` | **移除或重新定位** 为 "我的备注" 编辑页面 |

### 编辑历史影响

- `edit_history` 仅记录共享字段（name, gender, birth_year, is_deceased, avatar）的变更
- 私人覆盖字段（phone, city 等）的修改不记入编辑历史（它们属于用户个人数据，不影响其他人）

## 五代称谓扩展

### BFS 变更
- 最大搜索深度: 4 → 5
- 对于 <200 节点的图，BFS 深度 5 的性能开销可忽略

### FORMAL_TITLE_MAP 扩展
- 原有约 80 条目（四代）
- 新增约 70+ 条目（第五代），总计约 150+ 条目
- 新增覆盖:
  - **高祖辈**: 高祖父、高祖母
  - **玄孙辈**: 玄孙、玄孙女
  - **五代旁系**: 族兄、族弟、族姐、族妹等
  - **五代姻亲**: 相关姻亲称谓

### 回退规则
- 五代内无路径 → 返回通用称谓 "亲属"（与之前一致，只是阈值从 4 改为 5）

## 技术决策

- **移除 privacy_settings 而非改造**: 既然所有可变字段都改为私人模式，privacy_settings 的三级可见性（public/family_only/private）就没有用武之地了。移除它比改造它更简洁。
- **person_notes 承载所有私人字段**: 复用现有集合而非新建集合，减少系统复杂度。
- **phone/wechat_id 在 person_notes 中也做 AES 加密**: 保持与原设计一致的安全标准。
- **edit_history 不记录私人字段变更**: 私人字段属于用户个人数据，记录到全家可见的编辑历史中不合理。

## 风险 / 权衡

- **信息孤岛**: 每个用户的备注互相不可见，可能导致重复录入。但这正是"通讯录备注"模式的本质——你的手机通讯录和我的也互相不可见。
- **person_notes 数据量增大**: 从原来仅存 custom_title + remark 扩展为存所有私人字段，但每条记录仍然很小（<1KB），对云数据库无压力。
- **五代称谓表维护**: 条目数翻倍，但仍然是静态查找表，无运行时开销。

## 待解决问题
- 无
