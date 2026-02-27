## 1. 修复查询方向错误
- [x] 1.1 修复 **Rule 1**（同辈→继承父母）：将 `from_id: reference_person_id` 改为 `to_id: reference_person_id`，取 `from_id` 作为 parentId
- [x] 1.2 修复 **Rule 4**（亲代→继承另一亲代为配偶）：将 `from_id: reference_person_id` 改为 `to_id: reference_person_id`，取 `from_id` 作为 otherParentId
- [x] 1.3 修复 **Rule 6**（子代→继承其他子女为同辈）：将 `from_id: reference_person_id` 改为 `to_id: reference_person_id`，取 `from_id` 作为 otherChildId
- [x] 1.4 修复 **Rule 7**（配偶→继承子女）：将 `from_id: reference_person_id` 改为 `to_id: reference_person_id`，取 `from_id` 作为 childId

## 2. 验证
- [ ] 2.1 手动验证场景 A：创建"我"(男) → 创建"母亲"(MOTHER of 我) → 创建"外婆"(MOTHER of 母亲) → 确认外婆与我之间**无直接连线**，外婆仅与母亲有亲子连线
- [ ] 2.2 手动验证场景 B：创建"外公"(FATHER of 母亲) → 确认外公与我之间**无直接连线**，外公与外婆自动产生配偶边(Rule 4)
- [ ] 2.3 手动验证场景 C：创建"姨妈"(OLDER_SISTER of 母亲) → 确认姨妈与外婆/外公自动产生亲子边(Rule 1)，姨妈与我之间**无直接连线**
