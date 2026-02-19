## T1. 数据模型变更

- [ ] 1.1 修改 `persons` 集合设计: 移除 phone, birth_date, city, occupation 字段，仅保留共享字段（name, gender, birth_year, is_deceased, avatar, bound_user_id, generation, family_id）
- [ ] 1.2 扩展 `person_notes` 集合设计: 新增 phone, wechat_id, birth_date, city, occupation 字段，添加 (user_id, person_id) 唯一索引和 (user_id, family_id) 索引
- [ ] 1.3 移除 `privacy_settings` 集合（含相关索引和安全规则）
- [ ] 1.4 更新 `utils/constants.js`: 定义 SHARED_FIELDS 和 PRIVATE_OVERLAY_FIELDS 常量

## T2. 云函数改造

- [ ] 2.1 修改 `cloudfunctions/person/create`: 不再接受和写入私人覆盖字段（phone, city 等）到 persons 集合
- [ ] 2.2 修改 `cloudfunctions/person/update`: 仅允许更新共享字段；edit_history 仅记录共享字段变更
- [ ] 2.3 修改 `cloudfunctions/person/getDetail`: 读取共享层 + 当前用户的 person_notes，合并返回
- [ ] 2.4 修改 `cloudfunctions/person/list`: 批量查询当前用户的 person_notes 附带 custom_title
- [ ] 2.5 修改 `cloudfunctions/person/delete`: 级联删除中去掉 privacy_settings，增加删除所有用户的 person_notes
- [ ] 2.6 移除 `cloudfunctions/person/updatePrivacy` 云函数
- [ ] 2.7 扩展 `cloudfunctions/note/upsert`: 支持 phone, wechat_id, birth_date, city, occupation 字段的写入；phone 和 wechat_id 做 AES 加密
- [ ] 2.8 扩展 `cloudfunctions/note/get`: 返回所有私人覆盖字段，phone 和 wechat_id 解密返回

## T3. 前端页面改造

- [ ] 3.1 修改 `pages/person/detail`: 分 "基本信息"（共享层）和 "我的备注"（私人覆盖层）两个区域展示
- [ ] 3.2 修改 `pages/person/edit`: 拆为 "编辑基本信息"（共享字段）入口
- [ ] 3.3 新建或重新定位 `pages/person/privacy` 为 "我的备注" 编辑页: 编辑 phone, wechat_id, birth_date, city, occupation, custom_title, remark
- [ ] 3.4 修改 `pages/person/create`: 创建表单中移除 phone, city, occupation 输入项
- [ ] 3.5 修改 `components/person-card`: 显示时优先使用 person_notes 中的 custom_title

## T4. 五代亲属称谓

- [ ] 4.1 扩展 `utils/titleMap.js`: FORMAL_TITLE_MAP 从约 80 条扩展到约 150+ 条，新增第五代直系（高祖父/母、玄孙/女）、第五代旁系（族兄弟等）、第五代姻亲称谓
- [ ] 4.2 修改 `cloudfunctions/relationship/computeTitle`: BFS 最大深度从 4 改为 5
- [ ] 4.3 更新 `cloudfunctions/relationship/getGraph`: 确保返回的称谓数据支持五代深度

## T5. 关联文档更新

- [ ] 5.1 更新 `openspec/project.md`: 集合数从 12 改为 11；person_notes 字段描述更新；称谓改为五代；移除 privacy_settings 相关描述
- [ ] 5.2 同步更新 `add-familygraph-v1` 提案中相关的 design.md、tasks.md 和 spec 文件，确保与本变更一致

## T6. 验证

- [ ] 6.1 验证 person/getDetail 返回的数据结构符合共享层 + 私人覆盖层合并规则
- [ ] 6.2 验证不同用户对同一 Person 看到不同的私人覆盖字段
- [ ] 6.3 验证访客视图不包含任何私人覆盖字段
- [ ] 6.4 验证五代称谓在图谱中正确显示
- [ ] 6.5 验证 BFS 深度 5 在 50+ 节点图上的性能
