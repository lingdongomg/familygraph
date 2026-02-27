# Change: 修复推断规则查询方向错误导致的严重关系错误

## Why
推断规则中存在严重的边方向理解错误，导致创建的关系完全错误：
- 创建母亲的母亲（外婆）→ 外婆与我变成了**配偶**关系（应无直接连线）
- 创建母亲的父亲（外公）→ 外公与我变成了**配偶**关系
- 创建母亲的姐姐（姨妈）→ 姨妈与我变成了**女儿**关系

**根因**：边的语义是 `from_id is [relation_type] of to_id`（如 `A→B:FATHER` 表示"A 是 B 的 FATHER"）。但 Rule 1、Rule 4、Rule 6、Rule 7 中的查询方向弄反了，把"ref 是某人的父母"误解为"某人是 ref 的父母"。

## 受影响的规则逐一分析

| 规则 | 查询意图 | 当前查询（错误） | 实际找到的 | 正确查询 |
|---|---|---|---|---|
| **Rule 1** | 找 ref 的父母 | `from_id=ref, type∈[FATHER,MOTHER]` | ref 的子女 | `to_id=ref, type∈[FATHER,MOTHER]` |
| Rule 2 | 找 ref 的配偶 | `from_id=ref, type∈SPOUSE_TYPES` | ✅ 正确 | 无需修改 |
| Rule 3 | 找 ref 的同辈 | `from_id=ref, type∈SIBLING_TYPES` | ✅ 正确 | 无需修改 |
| **Rule 4** | 找 ref 的父母 | `from_id=ref, type∈PARENT_TYPES` | ref 的子女 | `to_id=ref, type∈PARENT_TYPES` |
| Rule 5 | 找 ref 的同辈 | `from_id=ref, type∈SIBLING_TYPES` | ✅ 正确 | 无需修改 |
| **Rule 6** | 找 ref 的子女 | `from_id=ref, type∈CHILD_TYPES` | ref 的父母 | `to_id=ref, type∈CHILD_TYPES` |
| **Rule 7** | 找 ref 的子女 | `from_id=ref, type∈CHILD_TYPES` | ref 的父母 | `to_id=ref, type∈CHILD_TYPES` |

Rule 2、3、5 之所以正确，是因为配偶和同辈关系是对称的（`from_id=ref, type=HUSBAND` 确实能找到 ref 的配偶）。而父子关系是非对称的：`from_id=ref, type=FATHER` 找到的是 ref 作为 FATHER 的对象（即 ref 的子女），而不是 ref 的父亲。

## What Changes
- 修复 Rule 1 查询：`from_id=ref, type∈[FATHER,MOTHER]` → `to_id=ref, type∈[FATHER,MOTHER]`，并相应调整 `to_id` → `from_id` 的取值
- 修复 Rule 4 查询：同上
- 修复 Rule 6 查询：`from_id=ref, type∈CHILD_TYPES` → `to_id=ref, type∈CHILD_TYPES`，并调整取值
- 修复 Rule 7 查询：同上

## Impact
- Affected specs: graph-edge-inference
- Affected code: `cloudfunctions/person/index.js` — Rule 1 (lines 135-141), Rule 4 (lines 276-282), Rule 6 (lines 205-211), Rule 7 (lines 348-354)
