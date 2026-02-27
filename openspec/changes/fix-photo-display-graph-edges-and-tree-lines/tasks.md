## 1. 修复照片仍不显示问题
- [x] 1.1 修正 `cloudfunctions/photo/index.js` 中 `handleUpload` 函数注释，从"预上传检查与记录创建"改为"照片记录创建"以匹配实际客户端先上传后记录的流程
- [x] 1.2 确认本地代码（`file_id` 参数已加入签名、photoRecord 使用传入的 `file_id`）无误——需部署 photo 和 admin 云函数到微信云端
- [x] 1.3 在 `cloudfunctions/admin/index.js` 中新增 `fixEmptyPhotoFileIds` action：遍历 photos 集合中 `file_id` 为空的记录，尝试通过云存储路径反查回填 `file_id`，同时将 `status` 更新为 `active`

## 2. 完善推断规则（新增 Rule 3-7）
- [x] 2.1 在 `cloudfunctions/person/utils/constants.js` 中新增 `PARENT_TYPES = ['FATHER', 'MOTHER']` 常量并导出
- [x] 2.2 在 `cloudfunctions/person/index.js` create 函数中新增 **Rule 3**（亲代→参照人的同辈变为子女）
- [x] 2.3 新增 **Rule 4**（亲代→参照人已有的另一亲代变为配偶）
- [x] 2.4 新增 **Rule 5**（同辈→参照人的其他同辈变为同辈）
- [x] 2.5 新增 **Rule 6**（子代→参照人的其他子女变为同辈）
- [x] 2.6 新增 **Rule 7**（配偶→参照人的子女变为子女）
- [x] 2.7 所有规则统一使用重复边检测模式（查询 from_id+to_id 是否已存在再决定是否创建）
- [ ] 2.8 手动验证完整场景：创建"我" → 创建"妈妈"(MOTHER of 我) → 创建"姐姐"(OLDER_SISTER of 我) → 创建"爸爸"(FATHER of 我) → 验证：爸爸↔妈妈自动配偶边(Rule 4)、爸爸↔姐姐自动亲子边(Rule 3)、姐姐↔妈妈自动亲子边(Rule 1 已有)

## 3. 亲子连线改为 bracket/tree 形
- [x] 3.1 在 `miniprogram/components/family-graph/index.js` 绘制边之前，将亲子边按父母节点分组（key=父/母 ID，value=子女节点列表），正确处理 FATHER/MOTHER 和 SON/DAUGHTER 两种边方向
- [x] 3.2 对每组亲子关系，绘制 bracket 形连线：父母节点向下短竖线 → 横线覆盖所有子女的 X 范围 → 每个子女向上短竖线连接横线
- [x] 3.3 配偶边和兄弟姐妹边保持原有直线/虚线样式不变
- [ ] 3.4 手动验证：多子女场景下连线清晰、不交叉，单子女场景退化为简单竖线

## 4. 改善删除成员入口可发现性
- [x] 4.1 在 `miniprogram/pages/person/detail/index.wxml` 中新增 action-bar 操作区，包含"编辑资料"和"删除成员"两个并排按钮，删除按钮红色显示
- [x] 4.2 对于无权限删除的情况，不显示删除按钮（`wx:if="{{canDelete}}"` 维持现有逻辑）
- [ ] 4.3 手动验证：以 Owner 身份查看非本人成员详情，确认删除按钮可见
